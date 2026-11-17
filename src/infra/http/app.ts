import Fastify, { type FastifyInstance } from 'fastify';
import { CloseSwitchOrder } from '../../core/use-cases/close-switch-order.js';
import type { Clock } from '../../core/use-cases/ports/clock.js';
import { corePool } from '../database/pool.js';
import { PostgresUnitOfWork } from '../database/postgres/postgres-unit-of-work.js';

type CloseOrderBody = {
  operatorId: string;
  safetyChecksPassed: boolean;
};

type CloseOrderParams = {
  orderId: string;
};

class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

function createCloseSwitchOrder(): CloseSwitchOrder {
  return new CloseSwitchOrder(
    new PostgresUnitOfWork(corePool),
    new SystemClock(),
  );
}

function getOperationId(
  headers: Record<string, unknown>,
): string | undefined {
  const value = headers['idempotency-key'];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return undefined;
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'core-service',
    version: '0.1.0',
  }));

  app.post<{
    Params: CloseOrderParams;
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

    if (typeof correlationId !== 'string' || correlationId.trim() === '') {
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
    });

    if (result.ok) return reply.code(200).send(result.value);

    const statusCode =
      result.error.code === 'INVALID_ORDER_ID' ? 404 : 409;

    return reply.code(statusCode).send({
      error: result.error.code,
      message: result.error.message,
    });
  });

  return app;
}
