import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { buildApp } from '../../src/infra/http/app.js';
import { corePool } from '../../src/infra/database/pool.js';

const app = buildApp();
let orderId = '';
const startOperationId = 'operation-outbox-start-001';
const closeOperationId = 'operation-outbox-close-001';

async function cleanup(): Promise<void> {
  if (orderId !== '') {
    await corePool.query('DELETE FROM outbox_events WHERE aggregate_id = $1', [
      orderId,
    ]);
    await corePool.query('DELETE FROM switch_orders WHERE id = $1', [orderId]);
  }

  await corePool.query(
    'DELETE FROM idempotency_keys WHERE operation_id IN ($1, $2)',
    [startOperationId, closeOperationId],
  );
}

test('grava eventos de início e fechamento no Outbox', async () => {
  await cleanup();

  const created = await app.inject({
    method: 'POST',
    url: '/orders',
    payload: {
      description: 'Ordem do Outbox',
      assignedOperatorId: 'operator-01',
    },
  });
  assert.equal(created.statusCode, 201);
  orderId = created.json().id;

  const started = await app.inject({
    method: 'POST',
    url: `/orders/${orderId}/start`,
    headers: {
      'idempotency-key': startOperationId,
      'x-correlation-id': 'correlation-outbox-001',
    },
    payload: { operatorId: 'operator-01' },
  });
  assert.equal(started.statusCode, 200);

  const closed = await app.inject({
    method: 'POST',
    url: `/orders/${orderId}/close`,
    headers: {
      'idempotency-key': closeOperationId,
      'x-correlation-id': 'correlation-outbox-001',
    },
    payload: {
      operatorId: 'operator-01',
      safetyChecksPassed: true,
    },
  });
  assert.equal(closed.statusCode, 200);

  const events = await corePool.query<{
    event_type: string;
    aggregate_version: number;
    payload: { correlationId?: string };
    status: string;
  }>(
    `
      SELECT event_type, aggregate_version, payload, status
        FROM outbox_events
       WHERE aggregate_id = $1
       ORDER BY aggregate_version
    `,
    [orderId],
  );

  assert.equal(events.rows.length, 2);
  assert.equal(events.rows[0]?.event_type, 'order.started.v1');
  assert.equal(events.rows[0]?.aggregate_version, 2);
  assert.equal(events.rows[1]?.event_type, 'order.closed.v1');
  assert.equal(events.rows[1]?.aggregate_version, 3);
  assert.equal(events.rows[0]?.status, 'PENDING');
  assert.equal(events.rows[1]?.status, 'PENDING');
  assert.equal(events.rows[0]?.payload.correlationId, 'correlation-outbox-001');
  assert.equal(events.rows[1]?.payload.correlationId, 'correlation-outbox-001');

  await cleanup();
});

after(async () => {
  await cleanup();
  await app.close();
  await corePool.end();
});
