import { randomUUID } from 'node:crypto';
import type { SwitchOrderSnapshot } from '../domain/entities/switch-order.js';
import type { DomainError } from '../domain/errors/domain-error.js';
import type { Result } from '../domain/result.js';
import type { UnitOfWork } from './ports/unit-of-work.js';

export type StartSwitchOrderResult = SwitchOrderSnapshot & {
  idempotentReplay: boolean;
};

export class StartSwitchOrder {
  public constructor(private readonly uow: UnitOfWork) {}

  public async execute(input: {
    orderId: string;
    operatorId: string;
    operationId: string;
    correlationId?: string;
  }): Promise<Result<StartSwitchOrderResult, DomainError>> {
    return this.uow.transaction(async (transaction) => {
      const alreadyProcessed = await transaction.operations.has(
        input.operationId,
      );

      if (alreadyProcessed) {
        const replayed = await transaction.orders.findByIdForUpdate(
          input.orderId,
        );
        if (!replayed.ok) return replayed;

        return {
          ok: true,
          value: {
            ...replayed.value.snapshot(),
            idempotentReplay: true,
          },
        };
      }

      const found = await transaction.orders.findByIdForUpdate(input.orderId);
      if (!found.ok) return found;

      const started = found.value.start(input.operatorId);
      if (!started.ok) return started;

      await transaction.orders.save(found.value);
      await transaction.operations.add(input.operationId);

      const snapshot = found.value.snapshot();
      await transaction.outbox.append({
        eventId: randomUUID(),
        eventType: 'order.started.v1',
        aggregateId: snapshot.id,
        aggregateVersion: snapshot.version,
        correlationId: input.correlationId ?? input.operationId,
        producer: 'core-service',
        payload: {
          orderId: snapshot.id,
          operatorId: input.operatorId,
          previousStatus: 'OPEN',
          status: 'IN_PROGRESS',
        },
      });

      return {
        ok: true,
        value: {
          ...snapshot,
          idempotentReplay: false,
        },
      };
    });
  }
}
