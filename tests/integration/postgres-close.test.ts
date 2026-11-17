import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { corePool } from '../../src/infra/database/pool.js';
import { CloseSwitchOrder } from '../../src/core/use-cases/close-switch-order.js';
import { PostgresUnitOfWork } from '../../src/infra/database/postgres/postgres-unit-of-work.js';
import type { Clock } from '../../src/core/use-cases/ports/clock.js';

class FixedClock implements Clock {
  public now(): Date {
    return new Date('2026-11-17T12:00:00.000Z');
  }
}

const orderId = 'order-integration-001';
const operationId = 'operation-integration-001';

async function cleanFixtures(): Promise<void> {
  await corePool.query(
    'DELETE FROM idempotency_keys WHERE operation_id = $1',
    [operationId],
  );
  await corePool.query('DELETE FROM switch_orders WHERE id = $1', [orderId]);
}

test('fecha uma ordem no PostgreSQL e registra idempotência', async () => {
  await cleanFixtures();

  await corePool.query(
    `
      INSERT INTO switch_orders
        (id, description, status, assigned_operator_id, version, closed_at)
      VALUES
        ($1, 'Ordem de integração PostgreSQL', 'IN_PROGRESS', 'operator-01', 2, NULL)
    `,
    [orderId],
  );

  const useCase = new CloseSwitchOrder(
    new PostgresUnitOfWork(corePool),
    new FixedClock(),
  );

  const result = await useCase.execute({
    orderId,
    operatorId: 'operator-01',
    operationId,
    safetyChecksPassed: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    orderId,
    status: 'COMPLETED',
    version: 3,
    closedAt: '2026-11-17T12:00:00.000Z',
    idempotentReplay: false,
  });

  const order = await corePool.query<{
    status: string;
    version: number;
    description: string;
    closed_at: Date | null;
  }>(
    `
      SELECT status, version, description, closed_at
        FROM switch_orders
       WHERE id = $1
    `,
    [orderId],
  );

  assert.equal(order.rows[0]?.status, 'COMPLETED');
  assert.equal(order.rows[0]?.version, 3);
  assert.equal(order.rows[0]?.description, 'Ordem de integração PostgreSQL');
  assert.notEqual(order.rows[0]?.closed_at, null);

  const operation = await corePool.query(
    'SELECT operation_id FROM idempotency_keys WHERE operation_id = $1',
    [operationId],
  );
  assert.equal(operation.rowCount, 1);

  await cleanFixtures();
});

after(async () => {
  await corePool.end();
});
