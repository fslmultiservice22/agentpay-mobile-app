'use strict';
/* global __dirname: readonly -- Node CommonJS fixture, not app runtime. */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const realTrpcClient = require('@trpc/client');
const realTrpcReact = require('@trpc/react-query');
const realSuperjson = require('superjson');

const root = path.resolve(__dirname, '..');
const sourcePaths = {
  oauth: path.join(root, 'constants/oauth.ts'),
  api: path.join(root, 'lib/_core/api.ts'),
  trpc: path.join(root, 'lib/trpc.ts'),
  policy: path.join(root, 'constants/native-api-origin-policy.ts'),
};
const source = Object.fromEntries(
  Object.entries(sourcePaths).map(([name, filename]) => [
    name,
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
  ]),
);

function runModule(compiled, globals) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, URL, URLSearchParams, ...globals }, { timeout: 1000 });
  return exports;
}

function loadOauth(raw, platform = 'android', location = null, approvedOrigins = ['https://api.example.test']) {
  const env = raw === undefined ? {} : { EXPO_PUBLIC_API_BASE_URL: raw };
  const globals = {
    process: { env },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === './native-api-origin-policy') {
        return { APPROVED_NATIVE_API_ORIGINS: Object.freeze([...approvedOrigins]) };
      }
      if (name === 'expo-linking') {
        return {
          createURL: () => { throw new Error('LINKING_NOT_ALLOWED'); },
          canOpenURL: async () => { throw new Error('LINKING_NOT_ALLOWED'); },
          openURL: async () => { throw new Error('LINKING_NOT_ALLOWED'); },
        };
      }
      throw new Error(`UNAPPROVED_IMPORT:${name}`);
    },
  };
  if (location !== null) globals.window = { location };
  return runModule(source.oauth, globals);
}

function makeResponse(body = { ok: true }) {
  return {
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function loadApi(raw, counters, platform = 'android') {
  const oauth = loadOauth(raw, platform);
  return runModule(source.api, {
    console: { error() { throw new Error('UNEXPECTED_LOG'); } },
    fetch: async (url, options) => {
      counters.fetch += 1;
      counters.requests.push({ url, options });
      return makeResponse();
    },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === '@/constants/oauth') return oauth;
      if (name === './auth') {
        return {
          getSessionToken: async () => {
            counters.token += 1;
            return 'synthetic-token';
          },
        };
      }
      throw new Error(`UNAPPROVED_IMPORT:${name}`);
    },
  });
}

function loadTrpc(raw, counters, platform = 'android') {
  const oauth = loadOauth(raw, platform);
  const captured = {};
  const module = runModule(source.trpc, {
    fetch: async (url, options) => {
      counters.fetch += 1;
      counters.requests.push({ url, options });
      return makeResponse();
    },
    require(name) {
      if (name === '@trpc/react-query') {
        return { createTRPCReact: () => ({ createClient: (config) => ({ config }) }) };
      }
      if (name === '@trpc/client') {
        return {
          httpBatchLink: (options) => {
            captured.options = options;
            return { options };
          },
        };
      }
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === '@/constants/oauth') return oauth;
      if (name === '@/lib/_core/auth') {
        return {
          getSessionToken: async () => {
            counters.token += 1;
            return 'synthetic-token';
          },
        };
      }
      if (name === 'superjson') return {};
      throw new Error(`UNAPPROVED_IMPORT:${name}`);
    },
  });
  return { module, captured };
}

function loadRealTrpc(raw, counters, platform = 'android') {
  const oauth = loadOauth(raw, platform);
  return runModule(source.trpc, {
    AbortController,
    Blob,
    FormData,
    Headers,
    Request,
    Response,
    TextDecoder,
    TextEncoder,
    clearTimeout,
    fetch: async (url, options) => {
      counters.fetch += 1;
      counters.requests.push({ url, options });
      return makeResponse();
    },
    setTimeout,
    require(name) {
      if (name === '@trpc/react-query') return realTrpcReact;
      if (name === '@trpc/client') return realTrpcClient;
      if (name === 'superjson') return realSuperjson;
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === '@/constants/oauth') return oauth;
      if (name === '@/lib/_core/auth') {
        return {
          getSessionToken: async () => {
            counters.token += 1;
            return 'synthetic-token';
          },
        };
      }
      throw new Error(`UNAPPROVED_IMPORT:${name}`);
    },
  });
}

const invalidCandidates = [
  ['missing', undefined],
  ['empty', ''],
  ['http', 'http://api.example.test'],
  ['userinfo', 'https://user:pass@api.example.test'],
  ['query', 'https://api.example.test?x=1'],
  ['fragment', 'https://api.example.test#part'],
  ['path', 'https://api.example.test/api'],
  ['port', 'https://api.example.test:8443'],
  ['default-port', 'https://api.example.test:443'],
  ['trailing-slash', 'https://api.example.test/'],
  ['whitespace', ' https://api.example.test'],
  ['control', 'https://api.example.test\n'],
  ['malformed', 'https://[bad-host'],
];
const validOrigin = 'https://api.example.test';
const results = [];
let activeTest = 'setup';
let activeStep = 'setup';
let failureKind = 'unknown';

async function check(name, callback) {
  activeTest = name;
  activeStep = 'running';
  await callback();
  results.push(name);
}

(async () => {
  await check('Android configured canonical HTTPS origin is accepted', () => {
    const oauth = loadOauth(validOrigin, 'android');
    assert.equal(oauth.getConfiguredApiOrigin(validOrigin), validOrigin);
    assert.equal(oauth.getApiBaseUrl(), validOrigin);
  });

  for (const [name, candidate] of invalidCandidates) {
    await check(`Android configured ${name} origin is rejected`, () => {
      const oauth = loadOauth(candidate, 'android');
      assert.equal(oauth.getConfiguredApiOrigin(candidate), '');
      assert.equal(oauth.getApiBaseUrl(), '');
    });
  }

  await check('Actual native policy is frozen and empty: candidate URL is not approved', () => {
    const policy = runModule(source.policy, {});
    assert.equal(policy.APPROVED_NATIVE_API_ORIGINS.length, 0);
    assert.ok(Object.isFrozen(policy.APPROVED_NATIVE_API_ORIGINS));
    const oauth = loadOauth(validOrigin, 'android', null, policy.APPROVED_NATIVE_API_ORIGINS);
    assert.equal(oauth.getConfiguredApiOrigin(validOrigin), validOrigin);
    assert.equal(oauth.getApprovedNativeApiOrigin(validOrigin), '');
    assert.equal(oauth.getApiBaseUrl(), '');
  });

  for (const candidate of [
    'https://foreign.example.test',
    'https://api.example.test.attacker.test',
    'https://api-example.test',
    'https://127.0.0.1',
    'https://[::1]',
    'https://localhost',
    'https://sub.localhost',
    'https://service.local',
    'https://intranet',
  ]) {
    await check(`Native unapproved HTTPS destination ${candidate} is rejected`, () => {
      const oauth = loadOauth(candidate);
      assert.equal(oauth.getConfiguredApiOrigin(candidate), candidate);
      assert.equal(oauth.getApprovedNativeApiOrigin(candidate), '');
      assert.equal(oauth.getApiBaseUrl(), '');
    });
  }

  for (const candidate of ['https://127.0.0.1', 'https://[::1]', 'https://localhost', 'https://service.local']) {
    await check(`Native local or literal IP remains rejected even in synthetic allowlist: ${candidate}`, () => {
      const oauth = loadOauth(candidate, 'android', null, [candidate]);
      assert.equal(oauth.getApiBaseUrl(), '');
    });
  }

  await check('Web canonical HTTPS remains independent of empty native policy', () => {
    const oauth = loadOauth(validOrigin, 'web', null, []);
    assert.equal(oauth.getApiBaseUrl(), validOrigin);
  });

  await check('iOS resolver regression rejects an invalid configured origin', () => {
    const oauth = loadOauth('https://api.example.test/path', 'ios');
    assert.equal(oauth.getApiBaseUrl(), '');
  });

  await check('web preserves relative fallback without a derivable host', () => {
    const oauth = loadOauth(undefined, 'web', {
      protocol: 'https:',
      hostname: 'app.example.test',
    });
    assert.equal(oauth.getApiBaseUrl(), '');
  });

  await check('web preserves 8081 to 3000 derivation after invalid configuration', () => {
    const oauth = loadOauth('http://api.example.test', 'web', {
      protocol: 'https:',
      hostname: '8081-sandbox.example.test',
    });
    assert.equal(oauth.getApiBaseUrl(), 'https://3000-sandbox.example.test');
  });

  await check('Android REST valid origin reads synthetic token then uses in-memory fetch', async () => {
    const counters = { token: 0, fetch: 0, requests: [] };
    const api = loadApi(validOrigin, counters);
    await assert.doesNotReject(api.apiCall('/api/health'));
    assert.equal(counters.token, 1);
    assert.equal(counters.fetch, 1);
    assert.equal(counters.requests[0].url, `${validOrigin}/api/health`);
    assert.equal(counters.requests[0].options.headers.Authorization, 'Bearer synthetic-token');
  });

  for (const [name, candidate] of [
    ['missing', undefined],
    ['invalid', 'http://api.example.test'],
    ['unapproved HTTPS', 'https://foreign.example.test'],
  ]) {
      await check(`Android REST ${name} origin blocks before token and fetch`, async () => {
      const counters = { token: 0, fetch: 0, requests: [] };
      const api = loadApi(candidate, counters);
      await assert.rejects(api.apiCall('/api/health'), /API base URL is not configured/);
      assert.equal(counters.token, 0);
      assert.equal(counters.fetch, 0);
    });
  }

  for (const [name, candidate] of [
    ['missing', undefined],
    ['invalid', 'https://api.example.test/path'],
    ['unapproved HTTPS', 'https://foreign.example.test'],
  ]) {
      await check(`Android establishSession ${name} origin returns false without fetch`, async () => {
      const counters = { token: 0, fetch: 0, requests: [] };
      const api = loadApi(candidate, counters);
      assert.equal(await api.establishSession('synthetic-token'), false);
      assert.equal(counters.token, 0);
      assert.equal(counters.fetch, 0);
    });
  }

  await check('Android tRPC client is constructible but invalid origin blocks headers and fetch lazily', async () => {
    const counters = { token: 0, fetch: 0, requests: [] };
    const { module, captured } = loadTrpc('https://api.example.test/path', counters);
    const client = module.createTRPCClient();
    assert.ok(client);
    assert.equal(captured.options.url, '/api/trpc');
    assert.equal(counters.token, 0);
    assert.equal(counters.fetch, 0);
    await assert.rejects(captured.options.headers(), /API base URL is not configured/);
    await assert.rejects(captured.options.fetch('/api/trpc', {}), /API base URL is not configured/);
    assert.equal(counters.token, 0);
    assert.equal(counters.fetch, 0);
  });

  for (const [name, candidate] of [
    ['missing', undefined],
    ['invalid', 'https://api.example.test/path'],
    ['unapproved HTTPS', 'https://foreign.example.test'],
  ]) {
    await check(`Android real tRPC ${name} origin constructs then rejects a query before token and fetch`, async () => {
      const counters = { token: 0, fetch: 0, requests: [] };
      activeStep = 'load';
      const module = loadRealTrpc(candidate, counters, 'android');
      activeStep = 'construct';
      let client;
      try {
        client = module.createTRPCClient();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failureKind = `${error instanceof Error ? error.name : typeof error}:${message.length}:${crypto.createHash('sha256').update(message).digest('hex').slice(0, 12)}`;
        throw error;
      }
      assert.ok(client);
      assert.equal(counters.token, 0);
      assert.equal(counters.fetch, 0);
      activeStep = 'query';
      try {
        await client.health.query();
        throw new Error('TRPC_QUERY_UNEXPECTED_SUCCESS');
      } catch (error) {
        failureKind = error instanceof Error ? error.name : typeof error;
        assert.match(String(error instanceof Error ? error.message : error), /API base URL is not configured/);
      }
      activeStep = 'counters';
      assert.equal(counters.token, 0);
      assert.equal(counters.fetch, 0);
    });
  }

  await check('Android tRPC valid origin reads synthetic token and uses in-memory fetch on request', async () => {
    const counters = { token: 0, fetch: 0, requests: [] };
    const { module, captured } = loadTrpc(validOrigin, counters);
    const client = module.createTRPCClient();
    assert.ok(client);
    assert.equal(captured.options.url, `${validOrigin}/api/trpc`);
    assert.equal(counters.token, 0);
    assert.equal(counters.fetch, 0);
    const headers = await captured.options.headers();
    assert.equal(headers.Authorization, 'Bearer synthetic-token');
    assert.equal(counters.token, 1);
    await captured.options.fetch(`${validOrigin}/api/trpc`, { method: 'POST' });
    assert.equal(counters.fetch, 1);
    assert.equal(counters.requests[0].url, `${validOrigin}/api/trpc`);
    assert.equal(counters.requests[0].options.credentials, 'include');
  });

  const outputPath = process.argv[2];
  if (!outputPath) throw new Error('RESULT_PATH_REQUIRED');
  fs.writeFileSync(outputPath, JSON.stringify({ test_count: results.length, passed_count: results.length, tests: results }) + '\n');
  process.stdout.write(JSON.stringify({ test_count: results.length, passed_count: results.length, actual_network_attempts: 0 }) + '\n');
})().catch(() => {
  process.stderr.write(`OFFLINE_API_ORIGIN_GATE_FAILED:${activeTest}:${activeStep}:${failureKind}\n`);
  process.exitCode = 1;
});
