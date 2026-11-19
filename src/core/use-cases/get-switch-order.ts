import { type SwitchOrderSnapshot } from '../domain/entities/switch-order.js';
import type { DomainError } from '../domain/errors/domain-error.js';
import type { Result } from '../domain/result.js';
import type { OrderStore } from './ports/order-store.js';

export class GetSwitchOrder {
  public constructor(private readonly orders: OrderStore) {}

  public async execute(
    orderId: string,
  ): Promise<Result<SwitchOrderSnapshot, DomainError>> {
    const result = await this.orders.findById(orderId);
    if (!result.ok) return result;

    return {
      ok: true,
      value: result.value.snapshot(),
    };
  }
}
