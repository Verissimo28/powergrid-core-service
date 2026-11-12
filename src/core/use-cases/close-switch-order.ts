import { fail, ok, type Result } from '../domain/result.js';
import { DomainError } from '../domain/errors/domain-error.js';
import type { CloseSwitchOrderInput, CloseSwitchOrderOutput } from './dtos/close-switch-order-dto.js';
import type { Clock } from './ports/clock.js';
import type { OperationRegistry } from './ports/operation-registry.js';
import type { OrderRepository } from './ports/order-repository.js';

export class CloseSwitchOrder {
  public constructor(
    private readonly orders: OrderRepository,
    private readonly operations: OperationRegistry,
    private readonly clock: Clock,
  ) {}

  public async execute(
    input: CloseSwitchOrderInput,
  ): Promise<Result<CloseSwitchOrderOutput, DomainError>> {
    const alreadyProcessed = await this.operations.has(input.operationId);
    if (alreadyProcessed) {
      const existingOrder = await this.orders.findById(input.orderId);
      if (!existingOrder.ok) return existingOrder;

      const snapshot = existingOrder.value.snapshot();
      if (snapshot.status !== 'COMPLETED' || snapshot.closedAt === null) {
        return fail(new DomainError(
          'INVALID_STATUS',
          'A operação foi registrada, mas a ordem não está concluída.',
        ));
      }

      return ok({
        orderId: snapshot.id,
        status: 'COMPLETED',
        version: snapshot.version,
        closedAt: snapshot.closedAt,
        idempotentReplay: true,
      });
    }

    const orderResult = await this.orders.findById(input.orderId);
    if (!orderResult.ok) return orderResult;

    const closeResult = orderResult.value.close({
      operatorId: input.operatorId,
      safetyChecksPassed: input.safetyChecksPassed,
      now: this.clock.now(),
    });
    if (!closeResult.ok) return closeResult;

    await this.orders.save(orderResult.value);
    await this.operations.add(input.operationId);

    const snapshot = orderResult.value.snapshot();
    if (snapshot.closedAt === null) {
      return fail(new DomainError(
        'INVALID_STATUS',
        'A ordem foi fechada sem data de fechamento.',
      ));
    }

    return ok({
        orderId: snapshot.id,
        status: 'COMPLETED',
        version: snapshot.version,
        closedAt: snapshot.closedAt,
        idempotentReplay: false,
    });
  }
}