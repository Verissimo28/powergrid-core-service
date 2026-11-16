import assert from 'node:assert/strict';
import test from 'node:test';
import { SwitchOrder } from '../../src/core/domain/entities/switch-order.js';
import { CloseSwitchOrder } from '../../src/core/use-cases/close-switch-order.js';
import { InMemoryOperationRegistry } from '../../src/infra/database/in-memory/in-memory-operation-registry.js';
import { InMemoryOrderRepository } from '../../src/infra/database/in-memory/in-memory-order-repository.js';
import { InMemoryUnitOfWork } from '../../src/infra/database/in-memory/in-memory-unit-of-work.js';
import type { Clock } from '../../src/core/use-cases/ports/clock.js';

class FixedClock implements Clock {
  public constructor(private readonly current: Date) {}

  public now(): Date {
    return this.current;
  }
}

const createInProgressOrder = () => {
  const created = SwitchOrder.create({
    id: 'order-use-case-01',
    description: 'Ordem criada para o caso de uso',
    assignedOperatorId: 'operator-01',
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('Não foi possível criar a ordem.');

  const started = created.value.start('operator-01');
  assert.equal(started.ok, true);
  return created.value;
};

const createUseCase = () => {
  const orders = new InMemoryOrderRepository();
  const operations = new InMemoryOperationRegistry();
  const uow = new InMemoryUnitOfWork(orders, operations);
  const clock = new FixedClock(new Date('2026-11-09T15:00:00.000Z'));
  const useCase = new CloseSwitchOrder(uow, clock);
  return { orders, operations, uow, useCase };
};

test('fecha uma ordem pelo caso de uso', async () => {
  const { orders, useCase } = createUseCase();
  orders.seed(createInProgressOrder());

  const result = await useCase.execute({
    orderId: 'order-use-case-01',
    operatorId: 'operator-01',
    operationId: 'operation-001',
    safetyChecksPassed: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, {
    orderId: 'order-use-case-01',
    status: 'COMPLETED',
    version: 3,
    closedAt: '2026-11-09T15:00:00.000Z',
    idempotentReplay: false,
  });

  const saved = orders.get('order-use-case-01');
  assert.equal(saved?.snapshot().status, 'COMPLETED');
});

test('retorna erro de domínio sem salvar quando o operador é inválido', async () => {
  const { orders, useCase } = createUseCase();
  orders.seed(createInProgressOrder());

  const result = await useCase.execute({
    orderId: 'order-use-case-01',
    operatorId: 'operator-99',
    operationId: 'operation-002',
    safetyChecksPassed: true,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'OPERATOR_NOT_ASSIGNED');
  assert.equal(orders.get('order-use-case-01')?.snapshot().status, 'IN_PROGRESS');
});

test('retorna erro quando as pré-condições não foram satisfeitas', async () => {
  const { orders, useCase } = createUseCase();
  orders.seed(createInProgressOrder());

  const result = await useCase.execute({
    orderId: 'order-use-case-01',
    operatorId: 'operator-01',
    operationId: 'operation-003',
    safetyChecksPassed: false,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'SAFETY_CHECK_FAILED');
  assert.equal(orders.get('order-use-case-01')?.snapshot().status, 'IN_PROGRESS');
});

test('reprocessa a mesma operação de forma idempotente', async () => {
  const { orders, useCase } = createUseCase();
  orders.seed(createInProgressOrder());

  const input = {
    orderId: 'order-use-case-01',
    operatorId: 'operator-01',
    operationId: 'operation-repeated',
    safetyChecksPassed: true,
  };

  const first = await useCase.execute(input);
  const second = await useCase.execute(input);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;

  assert.equal(first.value.idempotentReplay, false);
  assert.equal(second.value.idempotentReplay, true);
  assert.equal(first.value.version, 3);
  assert.equal(second.value.version, 3);
  assert.equal(orders.get('order-use-case-01')?.snapshot().version, 3);
});

test('retorna erro quando a ordem não existe', async () => {
  const { useCase } = createUseCase();

  const result = await useCase.execute({
    orderId: 'does-not-exist',
    operatorId: 'operator-01',
    operationId: 'operation-004',
    safetyChecksPassed: true,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'INVALID_ORDER_ID');
});