import { strict as assert } from 'node:assert';
import test from 'node:test';
import { SwitchOrder } from '../../src/core/domain/entities/switch-order.js';

const createOrder = () => {
  const result = SwitchOrder.create({
    id: 'order-001',
    description: 'Fechar circuito auxiliar da subestação norte',
    assignedOperatorId: 'operator-01',
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('A ordem de teste não foi criada.');
  return result.value;
};

test('cria uma ordem no estado OPEN com versão 1', () => {
  const order = createOrder();

  assert.deepEqual(order.snapshot(), {
    id: 'order-001',
    description: 'Fechar circuito auxiliar da subestação norte',
    status: 'OPEN',
    assignedOperatorId: 'operator-01',
    version: 1,
    closedAt: null,
  });
});

test('inicia a ordem quando o operador atribuído é informado', () => {
  const order = createOrder();
  const result = order.start('operator-01');

  assert.equal(result.ok, true);
  assert.equal(order.snapshot().status, 'IN_PROGRESS');
  assert.equal(order.snapshot().version, 2);
});

test('rejeita início por operador diferente', () => {
  const order = createOrder();
  const result = order.start('operator-99');

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'OPERATOR_NOT_ASSIGNED');
  assert.equal(result.error.message, 'O operador informado não está atribuído à ordem.');
});

test('rejeita fechamento enquanto a ordem está OPEN', () => {
  const order = createOrder();
  const result = order.close({
    operatorId: 'operator-01',
    safetyChecksPassed: true,
    now: new Date('2026-11-08T12:00:00.000Z'),
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'INVALID_STATUS');
  assert.equal(result.error.message, 'Somente uma ordem em execução pode ser concluída.');
});

test('fecha uma ordem em execução com pré-condições satisfeitas', () => {
  const order = createOrder();
  const startResult = order.start('operator-01');
  assert.equal(startResult.ok, true);

  const closeResult = order.close({
    operatorId: 'operator-01',
    safetyChecksPassed: true,
    now: new Date('2026-11-08T12:00:00.000Z'),
  });

  assert.equal(closeResult.ok, true);
  if (!closeResult.ok) return;
  assert.equal(closeResult.value.version, 3);
  assert.deepEqual(closeResult.value.closedAt, new Date('2026-11-08T12:00:00.000Z'));
  assert.equal(order.snapshot().status, 'COMPLETED');
  assert.equal(order.snapshot().closedAt, '2026-11-08T12:00:00.000Z');
});

test('rejeita fechamento quando as pré-condições falham', () => {
  const order = createOrder();
  assert.equal(order.start('operator-01').ok, true);

  const result = order.close({
    operatorId: 'operator-01',
    safetyChecksPassed: false,
    now: new Date('2026-11-08T12:00:00.000Z'),
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'SAFETY_CHECK_FAILED');
  assert.equal(
    result.error.message,
    'As pré-condições de segurança simuladas não foram satisfeitas.',
  );
  assert.equal(order.snapshot().status, 'IN_PROGRESS');
});

test('rejeita segunda tentativa de fechamento', () => {
  const order = createOrder();
  assert.equal(order.start('operator-01').ok, true);
  assert.equal(order.close({
    operatorId: 'operator-01',
    safetyChecksPassed: true,
    now: new Date('2026-11-08T12:00:00.000Z'),
  }).ok, true);

  const secondClose = order.close({
    operatorId: 'operator-01',
    safetyChecksPassed: true,
    now: new Date('2026-11-08T12:01:00.000Z'),
  });

  assert.equal(secondClose.ok, false);
  if (secondClose.ok) return;
  assert.equal(secondClose.error.code, 'INVALID_STATUS');
  assert.equal(
    secondClose.error.message,
    'Somente uma ordem em execução pode ser concluída.',
  );
});

test('normaliza espaços dos identificadores e da descrição', () => {
  const result = SwitchOrder.create({
    id: ' order-002 ',
    description: '  Inspeção de painel  ',
    assignedOperatorId: ' operator-02 ',
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('A ordem normalizada não foi criada.');

  assert.deepEqual(result.value.snapshot(), {
    id: 'order-002',
    description: 'Inspeção de painel',
    status: 'OPEN',
    assignedOperatorId: 'operator-02',
    version: 1,
    closedAt: null,
  });
});