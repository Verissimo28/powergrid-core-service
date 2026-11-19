export type OutboxEventType = 'order.started.v1' | 'order.closed.v1';

export type OutboxEvent = {
  eventId: string;
  eventType: OutboxEventType;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  producer: 'core-service';
  payload: Record<string, unknown>;
};

export interface OutboxRepository {
  append(event: OutboxEvent): Promise<void>;
}
