import 'dotenv/config';
import { corePool } from '../database/pool.js';
import { RabbitPublisher } from '../messaging/rabbit-publisher.js';

type OutboxRow = {
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_version: number;
  payload: Record<string, unknown>;
  attempts: number;
};

const rabbitUrl = process.env.RABBITMQ_URL ?? '';
if (rabbitUrl === '') {
  throw new Error('RABBITMQ_URL é obrigatório.');
}

const exchange = process.env.RABBITMQ_EXCHANGE ?? 'powergrid.events';
const batchSize = Number(process.env.OUTBOX_BATCH_SIZE ?? 20);

function retryDelaySeconds(attempts: number): number {
  return Math.min(300, 2 ** Math.min(attempts, 8));
}

export async function runOutboxOnce(): Promise<number> {
  const lock = await corePool.query<{ locked: boolean }>(
    `SELECT pg_try_advisory_lock(hashtext('powergrid:outbox-worker')) AS locked`,
  );

  if (lock.rows[0]?.locked !== true) return 0;

  const publisher = new RabbitPublisher(rabbitUrl, exchange);

  try {
    const result = await corePool.query<OutboxRow>(
      `
        SELECT event_id, event_type, aggregate_id, aggregate_version,
               payload, attempts
          FROM outbox_events
         WHERE status = 'PENDING'
           AND available_at <= NOW()
         ORDER BY created_at
         LIMIT $1
      `,
      [batchSize],
    );

    if (result.rows.length === 0) return 0;

    await publisher.connect();
    let published = 0;

    for (const event of result.rows) {
      try {
        await publisher.publish({
          eventId: event.event_id,
          eventType: event.event_type,
          payload: {
            ...event.payload,
            eventId: event.event_id,
            eventType: event.event_type,
            aggregateId: event.aggregate_id,
            aggregateVersion: event.aggregate_version,
          },
        });

        await corePool.query(
          `
            UPDATE outbox_events
               SET status = 'PUBLISHED',
                   published_at = NOW(),
                   last_error = NULL
             WHERE event_id = $1
               AND status = 'PENDING'
          `,
          [event.event_id],
        );

        published += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const delay = retryDelaySeconds(event.attempts + 1);

        await corePool.query(
          `
            UPDATE outbox_events
               SET attempts = attempts + 1,
                   last_error = $2,
                   available_at = NOW() + ($3 * INTERVAL '1 second')
             WHERE event_id = $1
               AND status = 'PENDING'
          `,
          [event.event_id, message, delay],
        );

        console.error('Falha ao publicar evento do Outbox', {
          eventId: event.event_id,
          eventType: event.event_type,
          attempts: event.attempts + 1,
          error: message,
        });
      }
    }

    return published;
  } finally {
    await publisher.close();
    await corePool.query(
      `SELECT pg_advisory_unlock(hashtext('powergrid:outbox-worker'))`,
    );
  }
}

async function main(): Promise<void> {
  const once = process.argv.includes('--once');
  const pollMs = Number(process.env.OUTBOX_POLL_MS ?? 5000);

  const shutdown = async (): Promise<void> => {
    await corePool.end();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  do {
    const published = await runOutboxOnce();
    console.log(JSON.stringify({ published }));

    if (!once) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  } while (!once);

  await corePool.end();
}

if (process.argv[1]?.endsWith('outbox-worker.ts')) {
  void main();
}
