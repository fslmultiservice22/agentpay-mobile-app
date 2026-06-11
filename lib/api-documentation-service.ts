/**
 * API Documentation Portal Service
 * Developer-friendly API docs with Swagger UI, code examples, and webhook management
 */

export interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  name: string;
  description: string;
  category: string;
  authentication: 'none' | 'api_key' | 'oauth2' | 'jwt';
  parameters: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
  rateLimit: number; // requests per minute
  examples: APIExample[];
  deprecated: boolean;
  createdAt: number;
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  example?: any;
  enum?: any[];
  default?: any;
}

export interface APIRequestBody {
  contentType: string;
  schema: Record<string, any>;
  example: Record<string, any>;
}

export interface APIResponse {
  statusCode: number;
  description: string;
  schema: Record<string, any>;
  example: Record<string, any>;
}

export interface APIExample {
  language: 'curl' | 'python' | 'javascript' | 'typescript' | 'java';
  code: string;
  description: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  createdAt: number;
  lastTriggeredAt?: number;
  failureCount: number;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  createdAt: number;
  deliveredAt?: number;
  failureReason?: string;
  retryCount: number;
}

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  secret: string;
  permissions: string[];
  rateLimit: number;
  active: boolean;
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
}

class APIDocumentationService {
  private endpoints: Map<string, APIEndpoint> = new Map();
  private webhooks: Map<string, Webhook> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();

  constructor() {
    this.initializeEndpoints();
  }

  /**
   * Initialize API endpoints
   */
  private initializeEndpoints(): void {
    const endpoints: APIEndpoint[] = [
      {
        id: 'ep_1',
        path: '/api/v1/portfolio',
        method: 'GET',
        name: 'Get Portfolio',
        description: 'Retrieve user portfolio information',
        category: 'Portfolio',
        authentication: 'jwt',
        parameters: [
          {
            name: 'userId',
            type: 'string',
            required: true,
            description: 'User ID',
            example: 'user_123',
          },
        ],
        responses: [
          {
            statusCode: 200,
            description: 'Portfolio retrieved successfully',
            schema: { type: 'object' },
            example: { portfolioValue: 50000, assets: [] },
          },
        ],
        rateLimit: 100,
        examples: [
          {
            language: 'curl',
            code: 'curl -X GET https://api.agentpay.io/api/v1/portfolio -H "Authorization: Bearer TOKEN"',
            description: 'Get portfolio using cURL',
          },
          {
            language: 'python',
            code: 'import requests\nresponse = requests.get("https://api.agentpay.io/api/v1/portfolio", headers={"Authorization": "Bearer TOKEN"})',
            description: 'Get portfolio using Python',
          },
        ],
        deprecated: false,
        createdAt: Date.now(),
      },
      {
        id: 'ep_2',
        path: '/api/v1/transactions',
        method: 'POST',
        name: 'Create Transaction',
        description: 'Create a new transaction',
        category: 'Transactions',
        authentication: 'jwt',
        parameters: [],
        requestBody: {
          contentType: 'application/json',
          schema: { type: 'object' },
          example: { amount: 1000, currency: 'USD', recipient: 'user_456' },
        },
        responses: [
          {
            statusCode: 201,
            description: 'Transaction created successfully',
            schema: { type: 'object' },
            example: { transactionId: 'tx_123', status: 'pending' },
          },
        ],
        rateLimit: 50,
        examples: [
          {
            language: 'javascript',
            code: 'const response = await fetch("https://api.agentpay.io/api/v1/transactions", { method: "POST", headers: { "Authorization": "Bearer TOKEN" }, body: JSON.stringify({ amount: 1000 }) })',
            description: 'Create transaction using JavaScript',
          },
        ],
        deprecated: false,
        createdAt: Date.now(),
      },
    ];

    for (const endpoint of endpoints) {
      this.endpoints.set(endpoint.id, endpoint);
    }
  }

  /**
   * Get all endpoints
   */
  getAllEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Get endpoints by category
   */
  getEndpointsByCategory(category: string): APIEndpoint[] {
    return Array.from(this.endpoints.values()).filter(e => e.category === category);
  }

  /**
   * Get endpoint by ID
   */
  getEndpoint(endpointId: string): APIEndpoint | undefined {
    return this.endpoints.get(endpointId);
  }

  /**
   * Create API key
   */
  createAPIKey(userId: string, name: string, permissions: string[], rateLimit: number = 1000): APIKey {
    const apiKey: APIKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      key: this.generateRandomString(32),
      secret: this.generateRandomString(64),
      permissions,
      rateLimit,
      active: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
    };

    this.apiKeys.set(apiKey.id, apiKey);
    return apiKey;
  }

  /**
   * Get API keys for user
   */
  getAPIKeys(userId: string): APIKey[] {
    return Array.from(this.apiKeys.values())
      .filter(k => k.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId: string): boolean {
    const key = this.apiKeys.get(keyId);
    if (!key) return false;

    key.active = false;
    return true;
  }

  /**
   * Create webhook
   */
  createWebhook(userId: string, name: string, url: string, events: string[]): Webhook {
    const webhook: Webhook = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      url,
      events,
      active: true,
      secret: this.generateRandomString(32),
      createdAt: Date.now(),
      failureCount: 0,
    };

    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  /**
   * Get webhooks
   */
  getWebhooks(userId?: string): Webhook[] {
    let webhooks = Array.from(this.webhooks.values());

    if (userId) {
      webhooks = webhooks.filter(w => w.url.includes(userId));
    }

    return webhooks.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Update webhook
   */
  updateWebhook(webhookId: string, updates: Partial<Webhook>): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;

    Object.assign(webhook, updates);
    return true;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  /**
   * Trigger webhook event
   */
  triggerWebhookEvent(webhookId: string, event: string, payload: Record<string, any>): WebhookEvent | null {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.active || !webhook.events.includes(event)) {
      return null;
    }

    const webhookEvent: WebhookEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      webhookId,
      event,
      payload,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.webhookEvents.set(webhookEvent.id, webhookEvent);

    // Simulate delivery
    this.deliverWebhookEvent(webhookEvent);

    return webhookEvent;
  }

  /**
   * Deliver webhook event
   */
  private deliverWebhookEvent(event: WebhookEvent): void {
    setTimeout(() => {
      const webhook = this.webhooks.get(event.webhookId);
      if (!webhook) return;

      // Simulate successful delivery
      event.status = 'delivered';
      event.deliveredAt = Date.now();
      webhook.lastTriggeredAt = Date.now();
    }, 100);
  }

  /**
   * Get webhook events
   */
  getWebhookEvents(webhookId: string): WebhookEvent[] {
    return Array.from(this.webhookEvents.values())
      .filter(e => e.webhookId === webhookId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Generate Swagger/OpenAPI documentation
   */
  generateSwaggerDocs(): Record<string, any> {
    return {
      openapi: '3.0.0',
      info: {
        title: 'AgentPay Wallet API',
        version: '1.0.0',
        description: 'Professional trading and wallet management API',
      },
      servers: [
        { url: 'https://api.agentpay.io', description: 'Production' },
        { url: 'https://staging-api.agentpay.io', description: 'Staging' },
      ],
      paths: this.generateSwaggerPaths(),
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
  }

  /**
   * Generate Swagger paths
   */
  private generateSwaggerPaths(): Record<string, any> {
    const paths: Record<string, any> = {};

    for (const endpoint of this.endpoints.values()) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.name,
        description: endpoint.description,
        parameters: endpoint.parameters,
        requestBody: endpoint.requestBody,
        responses: endpoint.responses,
      };
    }

    return paths;
  }

  /**
   * Generate random string
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get API documentation as HTML
   */
  generateHTMLDocumentation(): string {
    let html = '<html><head><title>AgentPay API Documentation</title></head><body>';
    html += '<h1>AgentPay Wallet API Documentation</h1>';

    for (const endpoint of this.getAllEndpoints()) {
      html += `<h2>${endpoint.method} ${endpoint.path}</h2>`;
      html += `<p>${endpoint.description}</p>`;
      html += `<p><strong>Category:</strong> ${endpoint.category}</p>`;
      html += `<p><strong>Rate Limit:</strong> ${endpoint.rateLimit} requests/minute</p>`;
    }

    html += '</body></html>';
    return html;
  }
}

export const apiDocumentationService = new APIDocumentationService();
