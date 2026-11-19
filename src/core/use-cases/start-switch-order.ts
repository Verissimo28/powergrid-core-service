import type { SwitchOrderSnapshot } from '../domain/entities/switch-order.js';
import type { DomainError } from '../domain/errors/domain-error.js';
import type { Result } from '../domain/result.js';
import type { UnitOfWork } from './ports/unit-of-work.js';

export class StartSwitchOrder {
  public constructor(private readonly uow: UnitOfWork) {}

  public async execute(input: {
    orderId: string;
    operatorId: string;
  }): Promise<Result<SwitchOrderSnapshot, DomainError>> {
    return this.uow.transaction(async (transaction) => {
      const found = await transaction.orders.findByIdForUpdate(input.orderId);
      if (!found.ok) return found;

      const started = found.value.start(input.operatorId);
      if (!started.ok) return started;

      await transaction.orders.save(found.value);

      return {
        ok: true,
        value: found.value.snapshot(),
      };
    });
  }
}
