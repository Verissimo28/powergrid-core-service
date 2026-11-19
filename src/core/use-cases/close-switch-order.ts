import { randomUUID } from 'node:crypto';
import { DomainError } from '../domain/errors/domain-error.js';
import { fail, ok, type Result } from '../domain/result.js';
import type {
  CloseSwitchOrderInput,
  CloseSwitchOrderOutput,
} from './dtos/close-switch-order-dto.js';
import type { Clock } from './ports/clock.js';
import type { UnitOfWork } from './ports/unit-of-work.js';

export class CloseSwitchOrder {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  public async execute(
    input: CloseSwitchOrderInput,
  ): Promise<Result<CloseSwitchOrderOutput, DomainError>> {
    return this.uow.transaction(async (transaction) => {
      const alreadyProcessed = await transaction.operations.has(
        input.operationId,
      );

      if (alreadyProcessed) {
        const existingOrder = await transaction.orders.findByIdForUpdate(
          input.orderId,
        );
        if (!existingOrder.ok) return existingOrder;

        const snapshot = existingOrder.value.snapshot();
        if (snapshot.status !== 'COMPLETED' || snapshot.closedAt === null) {
          return fail(
            new DomainError(
              'INVALID_STATUS',
              'A operação foi registrada, mas a ordem não está concluída.',
            ),
          );
        }

        return ok({
          orderId: snapshot.id,
          status: 'COMPLETED',
          version: snapshot.version,
          closedAt: snapshot.closedAt,
          idempotentReplay: true,
        });
      }

      const orderResult = await transaction.orders.findByIdForUpdate(
        input.orderId,
      );
      if (!orderResult.ok) return orderResult;

      const closeResult = orderResult.value.close({
        operatorId: input.operatorId,
        safetyChecksPassed: input.safetyChecksPassed,
        now: this.clock.now(),
      });
      if (!closeResult.ok) return closeResult;

      await transaction.orders.save(orderResult.value);
      await transaction.operations.add(input.operationId);

      const snapshot = orderResult.value.snapshot();
      if (snapshot.closedAt === null) {
        return fail(
          new DomainError(
            'INVALID_STATUS',
            'A ordem foi fechada sem data de fechamento.',
          ),
        );
      }

      await transaction.outbox.append({
        eventId: randomUUID(),
        eventType: 'order.closed.v1',
        aggregateId: snapshot.id,
        aggregateVersion: snapshot.version,
        correlationId: input.correlationId ?? input.operationId,
        producer: 'core-service',
        payload: {
          orderId: snapshot.id,
          operatorId: input.operatorId,
          closedAt: snapshot.closedAt,
          previousStatus: 'IN_PROGRESS',
          status: 'COMPLETED',
        },
      });

      return ok({
        orderId: snapshot.id,
        status: 'COMPLETED',
        version: snapshot.version,
        closedAt: snapshot.closedAt,
        idempotentReplay: false,
      });
    });
  }
}
