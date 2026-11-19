import type {
  OutboxEvent,
  OutboxRepository,
} from '../../../core/use-cases/ports/outbox.js';

export class InMemoryOutboxRepository implements OutboxRepository {
  private readonly events: OutboxEvent[] = [];

  public async append(event: OutboxEvent): Promise<void> {
    this.events.push(event);
  }

  public all(): OutboxEvent[] {
    return [...this.events];
  }
}
