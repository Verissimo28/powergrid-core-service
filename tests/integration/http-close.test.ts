import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { buildApp } from '../../src/infra/http/app.js';
import { corePool } from '../../src/infra/database/pool.js';

const orderId = 'order-http-001';
const operationId = 'operation-http-001';

const app = buildApp();

test('fecha uma ordem pelo endpoint HTTP usando PostgreSQL', async () => {
  await corePool.query(
    'DELETE FROM idempotency_keys WHERE operation_id = $1',
    [operationId],
  );
  await corePool.query('DELETE FROM switch_orders WHERE id = $1', [orderId]);
  await corePool.query(
    `
      INSERT INTO switch_orders
        (id, description, status, assigned_operator_id, version, closed_at)
      VALUES
        ($1, 'Ordem HTTP de integração', 'IN_PROGRESS', 'operator-01', 2, NULL)
    `,
    [orderId],
  );

  const response = await app.inject({
    method: 'POST',
    url: `/orders/${orderId}/close`,
    headers: {
      'idempotency-key': operationId,
      'x-correlation-id': 'correlation-http-001',
    },
    payload: {
      operatorId: 'operator-01',
      safetyChecksPassed: true,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'COMPLETED');
  assert.equal(response.json().version, 3);

  await corePool.query('DELETE FROM idempotency_keys WHERE operation_id = $1', [
    operationId,
  ]);
  await corePool.query('DELETE FROM switch_orders WHERE id = $1', [orderId]);
});

after(async () => {
  await app.close();
  await corePool.end();
});
