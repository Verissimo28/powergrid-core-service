import type { DomainError } from '../../domain/errors/domain-error.js';
import type { SwitchOrder } from '../../domain/entities/switch-order.js';
import type { Result } from '../../domain/result.js';
export interface OrderRepository {
    findById(orderId: string): Promise<Result<SwitchOrder, DomainError>>;
    save(order: SwitchOrder): Promise<void>;
}
//# sourceMappingURL=order-repository.d.ts.map