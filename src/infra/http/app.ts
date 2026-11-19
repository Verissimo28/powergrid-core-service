import Fastify, { type FastifyInstance } from 'fastify';
import { CreateSwitchOrder } from '../../core/use-cases/create-switch-order.js';
import { GetSwitchOrder } from '../../core/use-cases/get-switch-order.js';
import { StartSwitchOrder } from '../../core/use-cases/start-switch-order.js';
import { CloseSwitchOrder } from '../../core/use-cases/close-switch-order.js';
import type { Clock } from '../../core/use-cases/ports/clock.js';
import { corePool } from '../database/pool.js';
import { PostgresUnitOfWork } from '../database/postgres/postgres-unit-of-work.js';
import { PostgresOrderStore } from '../database/postgres/postgres-order-repository.js';

type CreateOrderBody = {
  description: string;
  assignedOperatorId: string | null;
};

type StartOrderBody = {
  operatorId: string;
};

type CloseOrderBody = {
  operatorId: string;
  safetyChecksPassed: boolean;
};

class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

function getOperationId(
  headers: Record<string, unknown>,
): string | undefined {
  const value = headers['idempotency-key'];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return undefined;
}

function isValidCorrelationId(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function createCloseSwitchOrder(): CloseSwitchOrder {
  return new CloseSwitchOrder(
    new PostgresUnitOfWork(corePool),
    new SystemClock(),
  );
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const orders = new PostgresOrderStore(corePool);
  const createOrder = new CreateSwitchOrder(orders);
  const getOrder = new GetSwitchOrder(orders);
  const startOrder = new StartSwitchOrder(new PostgresUnitOfWork(corePool));

  app.get('/health', async () => ({
    status: 'ok',
    service: 'core-service',
    version: '0.1.0',
  }));

  app.post<{ Body: CreateOrderBody }>('/orders', async (request, reply) => {
    const { description, assignedOperatorId } = request.body;

    if (
      typeof description !== 'string' ||
      description.trim() === '' ||
      (assignedOperatorId !== null &&
        typeof assignedOperatorId !== 'string')
    ) {
      return reply.code(422).send({
        error: 'INVALID_BODY',
        message: 'description e assignedOperatorId são inválidos.',
      });
    }

    const result = await createOrder.execute({
      description,
      assignedOperatorId,
    });

    if (!result.ok) {
      return reply.code(422).send({
        error: result.error.code,
        message: result.error.message,
      });
    }

    return reply.code(201).send(result.value);
  });

  app.get<{ Params: { orderId: string } }>(
    '/orders/:orderId',
    async (request, reply) => {
      const result = await getOrder.execute(request.params.orderId);

      if (!result.ok) {
        return reply.code(404).send({
          error: result.error.code,
          message: result.error.message,
        });
      }

      return reply.code(200).send(result.value);
    },
  );

  app.post<{
    Params: { orderId: string };
    Body: StartOrderBody;
  }>('/orders/:orderId/start', async (request, reply) => {
    const operationId = getOperationId(request.headers);
    const correlationId = request.headers['x-correlation-id'];

    if (operationId === undefined) {
      return reply.code(400).send({
        error: 'MISSING_IDEMPOTENCY_KEY',
        message: 'O header Idempotency-Key é obrigatório.',
      });
    }

    if (!isValidCorrelationId(correlationId)) {
      return reply.code(400).send({
        error: 'MISSING_CORRELATION_ID',
        message: 'O header X-Correlation-Id é obrigatório.',
      });
    }

    if (
      typeof request.body.operatorId !== 'string' ||
      request.body.operatorId.trim() === ''
    ) {
      return reply.code(422).send({
        error: 'INVALID_BODY',
        message: 'operatorId é obrigatório.',
      });
    }

    const result = await startOrder.execute({
      orderId: request.params.orderId,
      operatorId: request.body.operatorId,
      operationId,
      correlationId,
    });

    if (!result.ok) {
      const statusCode = result.error.code === 'INVALID_ORDER_ID' ? 404 : 409;
      return reply.code(statusCode).send({
        error: result.error.code,
        message: result.error.message,
      });
    }

    return reply.code(200).send(result.value);
  });

  app.post<{
    Params: { orderId: string };
    Body: CloseOrderBody;
  }>('/orders/:orderId/close', async (request, reply) => {
    const operationId = getOperationId(request.headers);
    const correlationId = request.headers['x-correlation-id'];

    if (operationId === undefined) {
      return reply.code(400).send({
        error: 'MISSING_IDEMPOTENCY_KEY',
        message: 'O header Idempotency-Key é obrigatório.',
      });
    }

    if (!isValidCorrelationId(correlationId)) {
      return reply.code(400).send({
        error: 'MISSING_CORRELATION_ID',
        message: 'O header X-Correlation-Id é obrigatório.',
      });
    }

    const { operatorId, safetyChecksPassed } = request.body;
    if (
      typeof operatorId !== 'string' ||
      operatorId.trim() === '' ||
      typeof safetyChecksPassed !== 'boolean'
    ) {
      return reply.code(422).send({
        error: 'INVALID_BODY',
        message: 'operatorId e safetyChecksPassed são obrigatórios.',
      });
    }

    const result = await createCloseSwitchOrder().execute({
      orderId: request.params.orderId,
      operatorId,
      operationId,
      safetyChecksPassed,
      correlationId,
    });

    if (result.ok) return reply.code(200).send(result.value);

    const statusCode = result.error.code === 'INVALID_ORDER_ID' ? 404 : 409;
    return reply.code(statusCode).send({
      error: result.error.code,
      message: result.error.message,
    });
  });

  return app;
}
