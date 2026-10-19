'use strict';
// Run with Node 24+: node --experimental-vm-modules scripts/check-monitor-json-offline.cjs [--baseline SOURCE_ROOT]
// Only three allowlisted source files are read; app config, API implementation, env and node_modules are never loaded.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { createHash } = require('node:crypto');
const baseline = process.argv[2] === '--baseline';
assert(process.argv.length === 2 || (baseline && process.argv.length === 4), 'Invalid runner arguments');
const root = baseline ? path.resolve(process.argv[3]) : path.resolve(__dirname, '..');
const names = ['lib/operational-status.ts', 'lib/technical-monitor-validation.ts', 'lib/technical-log-csv.ts'];
const hashes = {};
let calls = [], queue = [];
let fixedNow = Date.parse('2026-10-09T12:30:00.000Z');
class SyntheticDate extends Date { static now() { return fixedNow; } }
const context = vm.createContext({ Date: SyntheticDate }, { codeGeneration: { strings: false, wasm: false } });
const api = new vm.SyntheticModule(['apiCall'], function () {
  this.setExport('apiCall', async (route, options) => {
    calls.push({ route, options });
    assert(queue.length > 0, 'Unexpected synthetic API call');
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return next;
  });
}, { context, identifier: 'synthetic-api-no-network' });
const modules = new Map();
for (const name of names) {
  const bytes = fs.readFileSync(path.join(root, name));
  hashes[name] = createHash('sha256').update(bytes).digest('hex');
  const source = stripTypeScriptTypes(bytes.toString('utf8'), { mode: 'strip' });
  modules.set(name, new vm.SourceTextModule(source, { context, identifier: name }));
}
function linker(specifier, referencing) {
  if (specifier === '@/lib/_core/api') return api;
  if (referencing.identifier === 'lib/operational-status.ts' && specifier === './technical-monitor-validation') {
    return modules.get('lib/technical-monitor-validation.ts');
  }
  if (referencing.identifier === 'lib/technical-log-csv.ts' && specifier === './technical-monitor-validation') {
    return modules.get('lib/technical-monitor-validation.ts');
  }
  throw new Error('Import outside source allowlist');
}
function snap(ms = 0) {
  return { checkedAt: new Date(fixedNow + ms).toISOString(), overallStatus: 'healthy', checks: [
    { id: 'api', status: 'healthy', label: 'API tecnica', detail: 'SYNTHETIC_DETAIL_NOT_FOR_CSV' },
    { id: 'runtime', status: 'healthy', label: 'Runtime', detail: 'Fixture sintetica' },
    { id: 'financial_policy', status: 'healthy', label: 'Policy', detail: 'Nessuna funzione finanziaria' },
  ] };
}
function reply(ms = 0) { return { success: true, monitoring: snap(ms), safeguards: ['Fixture sintetica'] }; }
function reset(values = []) { calls = []; queue = values; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
const mutations = [
  ['success-false', (x) => { x.success = false; }],
  ['success-missing', (x) => { delete x.success; }],
  ['safeguards-not-array', (x) => { x.safeguards = 'invalid'; }],
  ['safeguards-non-string', (x) => { x.safeguards = [123]; }],
  ['checks-empty', (x) => { x.monitoring.checks = []; }],
  ['check-id-foreign', (x) => { x.monitoring.checks[0].id = 'foreign'; }],
  ['check-id-duplicate', (x) => { x.monitoring.checks[1].id = 'api'; }],
  ['check-status-formula', (x) => { x.monitoring.checks[0].status = '=1+1'; }],
  ['check-detail-not-string', (x) => { x.monitoring.checks[0].detail = 123; }],
  ['check-label-oversize', (x) => { x.monitoring.checks[0].label = 'x'.repeat(257); }],
  ['monitoring-missing', (x) => { delete x.monitoring; }],
  ['timestamp-noncanonical', (x) => { x.monitoring.checkedAt = '2026-10-09T14:30:00+02:00'; }],
];
(async () => {
  for (const module of modules.values()) if (module.status === 'unlinked') await module.link(linker);
  for (const module of modules.values()) if (module.status !== 'evaluated') await module.evaluate();
  const op = modules.get('lib/operational-status.ts').namespace;
  const validator = modules.get('lib/technical-monitor-validation.ts').namespace;
  const csv = modules.get('lib/technical-log-csv.ts').namespace;
  const cases = [];
  const results = [];
  function test(name, action) { cases.push([name, action]); }
  test('sandbox-no-network-no-process', () => {
    assert.equal(vm.runInContext('typeof process', context), 'undefined');
    assert.equal(vm.runInContext('typeof require', context), 'undefined');
    assert.equal(vm.runInContext('typeof fetch', context), 'undefined');
    assert.equal(vm.runInContext('typeof XMLHttpRequest', context), 'undefined');
    assert.throws(() => vm.runInContext('eval("1")', context));
  });
  for (const [name, ms, expected] of [
    ['now', 0, true], ['age-boundary', -120000, true], ['too-old', -120001, false],
    ['future-boundary', 30000, true], ['too-future', 30001, false],
  ]) test('freshness-' + name, () => assert.equal(op.isFreshMonitoringSnapshot(snap(ms), fixedNow), expected));
  test('freshness-clock-nan', () => assert.equal(op.isFreshMonitoringSnapshot(snap(), NaN), false));
  test('freshness-clock-infinity', () => assert.equal(op.isFreshMonitoringSnapshot(snap(), Infinity), false));
  test('freshness-null', () => assert.equal(op.isFreshMonitoringSnapshot(null, fixedNow), false));
  test('status-fresh-single-get', async () => {
    const valid = reply(); reset([valid]); assert.deepEqual(await op.getOperationalStatus(), valid);
    assert.equal(calls.length, 1); assert.equal(calls[0].route, '/api/operational-monitor/status');
  });
  test('status-stale-single-refresh', async () => {
    const valid = reply(); reset([reply(-120001), valid]); assert.deepEqual(await op.getOperationalStatus(), valid);
    assert.equal(calls.length, 2); assert.equal(calls[1].route, '/api/operational-monitor/refresh');
    assert.equal(calls[1].options.method, 'POST');
  });
  test('status-get-rejection-no-post', async () => {
    reset([new Error('SYNTHETIC_OFFLINE')]); await assert.rejects(op.getOperationalStatus(), /SYNTHETIC_OFFLINE/);
    assert.equal(calls.length, 1);
  });
  test('refresh-valid-single-post', async () => {
    const valid = reply(); reset([valid]); assert.deepEqual(await op.refreshOperationalStatus(), valid);
    assert.equal(calls.length, 1); assert.equal(calls[0].options.method, 'POST');
  });
  test('refresh-stale-rejected', async () => {
    reset([reply(-120001)]); await assert.rejects(op.refreshOperationalStatus(), /stale or invalid/); assert.equal(calls.length, 1);
  });
  test('refresh-future-rejected', async () => {
    reset([reply(30001)]); await assert.rejects(op.refreshOperationalStatus(), /stale or invalid/); assert.equal(calls.length, 1);
  });
  test('refresh-offline-rejected', async () => {
    reset([new Error('SYNTHETIC_OFFLINE')]); await assert.rejects(op.refreshOperationalStatus(), /SYNTHETIC_OFFLINE/); assert.equal(calls.length, 1);
  });
  for (const [name, mutate] of mutations) {
    test('status-invalid-' + name, async () => {
      const bad = clone(reply()); mutate(bad); reset([bad, reply()]);
      await assert.rejects(op.getOperationalStatus(), /response is invalid/);
      assert.equal(calls.length, 1, 'Invalid GET must not trigger POST');
    });
    test('refresh-invalid-' + name, async () => {
      const bad = clone(reply()); mutate(bad); reset([bad]);
      await assert.rejects(op.refreshOperationalStatus(), /stale or invalid/); assert.equal(calls.length, 1);
    });
  }
  test('snapshot-validator-valid', () => assert.equal(validator.isValidMonitoringSnapshot(snap()), true));
  test('snapshot-validator-invalid', () => assert.equal(validator.isValidMonitoringSnapshot({ ...snap(), checks: [] }), false));
  test('history-old-valid-no-refresh', async () => {
    const valid = { success: true, entries: [snap(-86400000)], retention: 'Sintetica', safeguards: [] };
    reset([valid]); assert.deepEqual(await op.getMonitorHistory(), valid); assert.equal(calls.length, 1);
  });
  test('history-empty-valid', async () => {
    const valid = { success: true, entries: [], retention: 'Sintetica', safeguards: [] };
    reset([valid]); assert.deepEqual(await op.getMonitorHistory(), valid);
  });
  test('history-over-limit-rejected', async () => {
    reset([{ success: true, entries: Array.from({ length: 13 }, () => snap()), retention: 'Sintetica', safeguards: [] }]);
    await assert.rejects(op.getMonitorHistory(), /history is invalid/);
  });
  test('history-invalid-checks-rejected', async () => {
    reset([{ success: true, entries: [{ ...snap(), checks: [] }], retention: 'Sintetica', safeguards: [] }]);
    await assert.rejects(op.getMonitorHistory(), /history is invalid/);
  });
  test('csv-valid-only-technical-columns', () => {
    const text = csv.buildTechnicalLogCsv([snap()]); assert.equal(text.split('\n').length, 4);
    assert(!text.includes('SYNTHETIC_DETAIL_NOT_FOR_CSV')); assert(!text.includes('Fixture sintetica')); assert(text.includes('"api","healthy"'));
  });
  test('csv-invalid-state-rejected', () => {
    const bad = snap(); bad.checks[0].status = '=1+1'; assert.throws(() => csv.buildTechnicalLogCsv([bad]));
  });
  test('csv-over-limit-rejected', () => assert.throws(() => csv.buildTechnicalLogCsv(Array.from({ length: 13 }, () => snap()))));
  test('csv-empty-header-only', () => assert.equal(csv.buildTechnicalLogCsv([]).split('\n').length, 1));
  for (const [name, action] of cases) {
    try { await action(); results.push({ name, pass: true }); }
    catch { results.push({ name, pass: false }); }
  }
  const passed = results.filter((item) => item.pass).length;
  console.log(JSON.stringify({ mode: baseline ? 'BASELINE_SAME_TESTS' : 'LOCAL_CORRECTION', sourceRoot: root,
    total: results.length, passed, failed: results.length - passed, cases: results, sourceHashes: hashes,
    syntheticApiOnly: true, realRequests: 0, loadedSourceCount: 3, fullTypecheckExecuted: false,
    vitestExecuted: false, androidBuildExecuted: false }, null, 2));
  process.exitCode = baseline ? (passed < results.length ? 0 : 2) : (passed === results.length ? 0 : 1);
})().catch(() => { console.error('OFFLINE_RUNNER_BLOCKED'); process.exitCode = 3; });
