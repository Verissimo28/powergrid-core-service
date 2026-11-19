import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { buildApp } from '../../src/infra/http/app.js';
import { corePool } from '../../src/infra/database/pool.js';

const app = buildApp();
const orderId = 'order-concurrent-start-001';
const operationA = 'operation-concurrent-start-a';
const operationB = 'operation-concurrent-start-b';

async function cleanup(): Promise<void> {
  await corePool.query(
    'DELETE FROM idempotency_keys WHERE operation_id IN ($1, $2)',
    [operationA, operationB],
  );
  await corePool.query('DELETE FROM switch_orders WHERE id = $1', [orderId]);
}

test('serializa dois inícios concorrentes com FOR UPDATE', async () => {
  await cleanup();

  await corePool.query(
    `
      INSERT INTO switch_orders
        (id, description, status, assigned_operator_id, version, closed_at)
      VALUES
        ($1, 'Ordem concorrente', 'OPEN', 'operator-01', 1, NULL)
    `,
    [orderId],
  );

  const responses = await Promise.all([
    app.inject({
      method: 'POST',
      url: `/orders/${orderId}/start`,
      headers: {
        'idempotency-key': operationA,
        'x-correlation-id': 'correlation-concurrent-a',
      },
      payload: { operatorId: 'operator-01' },
    }),
    app.inject({
      method: 'POST',
      url: `/orders/${orderId}/start`,
      headers: {
        'idempotency-key': operationB,
        'x-correlation-id': 'correlation-concurrent-b',
      },
      payload: { operatorId: 'operator-01' },
    }),
  ]);

  const statusCodes = responses.map((response) => response.statusCode).sort();
  assert.deepEqual(statusCodes, [200, 409]);

  const saved = await corePool.query<{
    status: string;
    version: number;
  }>(
    'SELECT status, version FROM switch_orders WHERE id = $1',
    [orderId],
  );

  assert.equal(saved.rows[0]?.status, 'IN_PROGRESS');
  assert.equal(saved.rows[0]?.version, 2);

  await cleanup();
});

after(async () => {
  await cleanup();
  await app.close();
  await corePool.end();
});
