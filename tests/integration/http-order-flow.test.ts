import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { buildApp } from '../../src/infra/http/app.js';
import { corePool } from '../../src/infra/database/pool.js';

const app = buildApp();
let orderId = '';
const startOperationId = 'operation-start-flow-001';
const closeOperationId = 'operation-close-flow-001';

async function removeFixtures(): Promise<void> {
  if (orderId !== '') {
    await corePool.query('DELETE FROM switch_orders WHERE id = $1', [orderId]);
  }

  await corePool.query(
    'DELETE FROM idempotency_keys WHERE operation_id IN ($1, $2)',
    [startOperationId, closeOperationId],
  );
}

test('executa o fluxo HTTP completo de uma ordem', async () => {
  await removeFixtures();

  const created = await app.inject({
    method: 'POST',
    url: '/orders',
    payload: {
      description: 'Ordem HTTP do fluxo completo',
      assignedOperatorId: 'operator-01',
    },
  });

  assert.equal(created.statusCode, 201);
  const createdBody = created.json() as {
    id: string;
    status: string;
    version: number;
  };
  orderId = createdBody.id;
  assert.equal(createdBody.status, 'OPEN');
  assert.equal(createdBody.version, 1);

  const opened = await app.inject({
    method: 'GET',
    url: `/orders/${orderId}`,
  });
  assert.equal(opened.statusCode, 200);
  assert.equal(opened.json().status, 'OPEN');

  const started = await app.inject({
    method: 'POST',
    url: `/orders/${orderId}/start`,
    headers: {
      'idempotency-key': startOperationId,
      'x-correlation-id': 'correlation-flow-001',
    },
    payload: {
      operatorId: 'operator-01',
    },
  });
  assert.equal(started.statusCode, 200);
  assert.equal(started.json().status, 'IN_PROGRESS');
  assert.equal(started.json().version, 2);

  const closed = await app.inject({
    method: 'POST',
    url: `/orders/${orderId}/close`,
    headers: {
      'idempotency-key': closeOperationId,
      'x-correlation-id': 'correlation-flow-001',
    },
    payload: {
      operatorId: 'operator-01',
      safetyChecksPassed: true,
    },
  });
  assert.equal(closed.statusCode, 200);
  assert.equal(closed.json().status, 'COMPLETED');
  assert.equal(closed.json().version, 3);

  const completed = await app.inject({
    method: 'GET',
    url: `/orders/${orderId}`,
  });
  assert.equal(completed.statusCode, 200);
  assert.equal(completed.json().status, 'COMPLETED');
  assert.equal(completed.json().version, 3);

  await removeFixtures();
});

after(async () => {
  await removeFixtures();
  await app.close();
  await corePool.end();
});
