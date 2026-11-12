import { DomainError } from '../../../core/domain/errors/domain-error.js';
import type { SwitchOrder } from '../../../core/domain/entities/switch-order.js';
import { type Result } from '../../../core/domain/result.js';
import type { OrderRepository } from '../../../core/use-cases/ports/order-repository.js';
export declare class InMemoryOrderRepository implements OrderRepository {
    private readonly items;
    seed(order: SwitchOrder): void;
    findById(orderId: string): Promise<Result<SwitchOrder, DomainError>>;
    save(order: SwitchOrder): Promise<void>;
    get(orderId: string): SwitchOrder | undefined;
}
//# sourceMappingURL=in-memory-order-repository.d.ts.map