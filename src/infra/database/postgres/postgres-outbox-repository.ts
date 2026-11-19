import type { PoolClient } from 'pg';
import type {
  OutboxEvent,
  OutboxRepository,
} from '../../../core/use-cases/ports/outbox.js';

export class PostgresOutboxRepository implements OutboxRepository {
  public constructor(private readonly client: PoolClient) {}

  public async append(event: OutboxEvent): Promise<void> {
    await this.client.query(
      `
        INSERT INTO outbox_events
          (event_id, event_type, aggregate_id, aggregate_version, payload)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        event.eventId,
        event.eventType,
        event.aggregateId,
        event.aggregateVersion,
        JSON.stringify({
          ...event.payload,
          correlationId: event.correlationId,
          producer: event.producer,
        }),
      ],
    );
  }
}
