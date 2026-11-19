import { randomUUID } from 'node:crypto';
import { SwitchOrder, type SwitchOrderSnapshot } from '../domain/entities/switch-order.js';
import type { DomainError } from '../domain/errors/domain-error.js';
import { ok, type Result } from '../domain/result.js';
import type { OrderStore } from './ports/order-store.js';

export type CreateSwitchOrderInput = {
  description: string;
  assignedOperatorId: string | null;
};

export class CreateSwitchOrder {
  public constructor(private readonly orders: OrderStore) {}

  public async execute(
    input: CreateSwitchOrderInput,
  ): Promise<Result<SwitchOrderSnapshot, DomainError>> {
    const created = SwitchOrder.create({
      id: randomUUID(),
      description: input.description,
      assignedOperatorId: input.assignedOperatorId,
    });

    if (!created.ok) return created;

    await this.orders.create(created.value);
    return ok(created.value.snapshot());
  }
}
