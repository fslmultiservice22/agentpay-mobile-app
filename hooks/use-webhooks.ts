import { useState, useCallback } from 'react';

export type WebhookEvent =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'transaction.confirmed'
  | 'transaction.failed'
  | 'kyc.verified'
  | 'kyc.rejected'
  | 'security.alert'
  | 'balance.updated'
  | 'order.placed'
  | 'order.shipped'
  | 'order.delivered';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  data: Record<string, any>;
  signature?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
  failureCount: number;
  maxRetries: number;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed';
  statusCode?: number;
  responseTime?: number;
  retryCount: number;
  createdAt: number;
  deliveredAt?: number;
  errorMessage?: string;
}

export function useWebhooks() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);

  // Register webhook endpoint
  const registerEndpoint = useCallback(
    async (url: string, events: WebhookEvent[]): Promise<WebhookEndpoint | null> => {
      try {
        const endpoint: WebhookEndpoint = {
          id: `wh_${Date.now()}`,
          url,
          events,
          active: true,
          createdAt: Date.now(),
          failureCount: 0,
          maxRetries: 3,
        };

        setEndpoints((prev) => [...prev, endpoint]);
        return endpoint;
      } catch (error) {
        console.error('Failed to register webhook endpoint:', error);
        return null;
      }
    },
    []
  );

  // Trigger webhook
  const triggerWebhook = useCallback(
    async (event: WebhookEvent, data: Record<string, any>): Promise<WebhookDelivery[]> => {
      try {
        const payload: WebhookPayload = {
          event,
          timestamp: Date.now(),
          data,
          signature: generateSignature(JSON.stringify(data)),
        };

        const deliveries: WebhookDelivery[] = [];

        // Send to all active endpoints listening to this event
        for (const endpoint of endpoints.filter((e) => e.active && e.events.includes(event))) {
          const delivery: WebhookDelivery = {
            id: `del_${Date.now()}`,
            endpointId: endpoint.id,
            event,
            payload,
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
          };

          deliveries.push(delivery);
          setDeliveries((prev) => [...prev, delivery]);

          // Simulate webhook delivery
          await deliverWebhook(delivery, endpoint);
        }

        return deliveries;
      } catch (error) {
        console.error('Failed to trigger webhook:', error);
        return [];
      }
    },
    [endpoints]
  );

  // Deliver webhook
  const deliverWebhook = useCallback(
    async (delivery: WebhookDelivery, endpoint: WebhookEndpoint) => {
      try {
        const startTime = Date.now();

        // Simulate HTTP request
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': delivery.payload.signature || '',
          },
          body: JSON.stringify(delivery.payload),
        }).catch(() => ({ status: 500 }));

        const responseTime = Date.now() - startTime;

        if (response.status >= 200 && response.status < 300) {
          // Success
          setDeliveries((prev) =>
            prev.map((d) =>
              d.id === delivery.id
                ? {
                    ...d,
                    status: 'delivered',
                    statusCode: response.status,
                    responseTime,
                    deliveredAt: Date.now(),
                  }
                : d
            )
          );

          // Update endpoint
          setEndpoints((prev) =>
            prev.map((e) =>
              e.id === endpoint.id
                ? { ...e, lastTriggeredAt: Date.now(), failureCount: 0 }
                : e
            )
          );
        } else {
          // Failure - retry
          if (delivery.retryCount < endpoint.maxRetries) {
            setTimeout(() => {
              setDeliveries((prev) =>
                prev.map((d) =>
                  d.id === delivery.id
                    ? {
                        ...d,
                        retryCount: d.retryCount + 1,
                        status: 'pending',
                      }
                    : d
                )
              );
              deliverWebhook(
                { ...delivery, retryCount: delivery.retryCount + 1 },
                endpoint
              );
            }, 5000); // Retry after 5 seconds
          } else {
            // Max retries exceeded
            setDeliveries((prev) =>
              prev.map((d) =>
                d.id === delivery.id
                  ? {
                      ...d,
                      status: 'failed',
                      statusCode: response.status,
                      responseTime,
                      errorMessage: 'Max retries exceeded',
                    }
                  : d
              )
            );

            // Update endpoint failure count
            setEndpoints((prev) =>
              prev.map((e) =>
                e.id === endpoint.id
                  ? { ...e, failureCount: e.failureCount + 1 }
                  : e
              )
            );
          }
        }
      } catch (error) {
        console.error('Failed to deliver webhook:', error);
      }
    },
    []
  );

  // Update endpoint
  const updateEndpoint = useCallback(
    async (endpointId: string, updates: Partial<WebhookEndpoint>) => {
      try {
        setEndpoints((prev) =>
          prev.map((e) => (e.id === endpointId ? { ...e, ...updates } : e))
        );
        return true;
      } catch (error) {
        console.error('Failed to update endpoint:', error);
        return false;
      }
    },
    []
  );

  // Delete endpoint
  const deleteEndpoint = useCallback(
    async (endpointId: string) => {
      try {
        setEndpoints((prev) => prev.filter((e) => e.id !== endpointId));
        return true;
      } catch (error) {
        console.error('Failed to delete endpoint:', error);
        return false;
      }
    },
    []
  );

  // Get delivery history
  const getDeliveryHistory = useCallback(
    (endpointId: string, limit: number = 50): WebhookDelivery[] => {
      return deliveries
        .filter((d) => d.endpointId === endpointId)
        .slice(-limit)
        .reverse();
    },
    [deliveries]
  );

  // Get webhook statistics
  const getStatistics = useCallback(() => {
    const stats = {
      totalEndpoints: endpoints.length,
      activeEndpoints: endpoints.filter((e) => e.active).length,
      totalDeliveries: deliveries.length,
      successfulDeliveries: deliveries.filter((d) => d.status === 'delivered').length,
      failedDeliveries: deliveries.filter((d) => d.status === 'failed').length,
      pendingDeliveries: deliveries.filter((d) => d.status === 'pending').length,
      averageResponseTime:
        deliveries.filter((d) => d.responseTime).length > 0
          ? deliveries.filter((d) => d.responseTime).reduce((sum, d) => sum + (d.responseTime || 0), 0) /
            deliveries.filter((d) => d.responseTime).length
          : 0,
      successRate:
        deliveries.length > 0
          ? (deliveries.filter((d) => d.status === 'delivered').length / deliveries.length) * 100
          : 0,
    };

    return stats;
  }, [endpoints, deliveries]);

  return {
    endpoints,
    deliveries,
    registerEndpoint,
    triggerWebhook,
    updateEndpoint,
    deleteEndpoint,
    getDeliveryHistory,
    getStatistics,
  };
}

// Helper function to generate webhook signature
function generateSignature(data: string): string {
  // Simple signature generation (in production, use HMAC-SHA256)
  return `sha256_${Math.random().toString(36).substr(2, 9)}`;
}
