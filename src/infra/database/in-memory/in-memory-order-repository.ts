import { DomainError } from '../../../core/domain/errors/domain-error.js';
import type { SwitchOrder } from '../../../core/domain/entities/switch-order.js';
import { fail, ok, type Result } from '../../../core/domain/result.js';
import type { OrderRepository } from '../../../core/use-cases/ports/order-repository.js';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly items = new Map<string, SwitchOrder>();

  public seed(order: SwitchOrder): void {
    this.items.set(order.snapshot().id, order);
  }

  public async findById(orderId: string): Promise<Result<SwitchOrder, DomainError>> {
    const order = this.items.get(orderId);

    if (order === undefined) {
      return fail(new DomainError('INVALID_ORDER_ID', 'Ordem não encontrada.'));
    }

    return ok(order);
  }

  public async save(order: SwitchOrder): Promise<void> {
    this.items.set(order.snapshot().id, order);
  }

  public get(orderId: string): SwitchOrder | undefined {
    return this.items.get(orderId);
  }
}