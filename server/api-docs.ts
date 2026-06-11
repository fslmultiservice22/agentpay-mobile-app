/**
 * AgentPay Wallet API Documentation
 * OpenAPI 3.0.0 Specification
 */

export const apiDocumentation = {
  openapi: '3.0.0',
  info: {
    title: 'AgentPay Wallet API',
    version: '1.0.0',
    description: 'Complete Web3 wallet API with trading, staking, DAO governance, and more',
    contact: {
      name: 'AgentPay Support',
      email: 'support@agentpay.io',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server',
    },
    {
      url: 'https://api.agentpay.io',
      description: 'Production server',
    },
  ],
  paths: {
    '/wallet/connect': {
      post: {
        summary: 'Connect wallet',
        tags: ['Wallet'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  provider: { type: 'string', enum: ['metamask', 'walletconnect', 'test'] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Wallet connected successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    address: { type: 'string' },
                    balance: { type: 'number' },
                    chainId: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/transactions': {
      get: {
        summary: 'Get transaction history',
        tags: ['Transactions'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
          },
        ],
        responses: {
          200: {
            description: 'Transaction history retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      hash: { type: 'string' },
                      from: { type: 'string' },
                      to: { type: 'string' },
                      amount: { type: 'number' },
                      status: { type: 'string' },
                      timestamp: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create transaction',
        tags: ['Transactions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  to: { type: 'string' },
                  amount: { type: 'number' },
                  gasPrice: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Transaction created',
          },
        },
      },
    },
    '/swap': {
      post: {
        summary: 'Execute token swap',
        tags: ['Trading'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fromToken: { type: 'string' },
                  toToken: { type: 'string' },
                  amount: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Swap executed',
          },
        },
      },
    },
    '/staking/pools': {
      get: {
        summary: 'Get staking pools',
        tags: ['Staking'],
        responses: {
          200: {
            description: 'Staking pools retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      apy: { type: 'number' },
                      tvl: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/dao/proposals': {
      get: {
        summary: 'Get DAO proposals',
        tags: ['DAO'],
        responses: {
          200: {
            description: 'DAO proposals retrieved',
          },
        },
      },
      post: {
        summary: 'Create DAO proposal',
        tags: ['DAO'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  votingPeriod: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Proposal created',
          },
        },
      },
    },
    '/analytics/report': {
      get: {
        summary: 'Get analytics report',
        tags: ['Analytics'],
        parameters: [
          {
            name: 'period',
            in: 'query',
            schema: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          },
        ],
        responses: {
          200: {
            description: 'Analytics report retrieved',
          },
        },
      },
    },
    '/webhooks': {
      post: {
        summary: 'Register webhook',
        tags: ['Webhooks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  events: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Webhook registered',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

export function getSwaggerUI(): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>AgentPay Wallet API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      })
    </script>
  </body>
</html>
  `;
}
