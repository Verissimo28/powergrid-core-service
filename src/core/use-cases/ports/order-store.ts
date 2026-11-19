import type { SwitchOrder } from '../../domain/entities/switch-order.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import type { Result } from '../../domain/result.js';

export interface OrderStore {
  create(order: SwitchOrder): Promise<void>;
  findById(orderId: string): Promise<Result<SwitchOrder, DomainError>>;
}
