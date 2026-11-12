import { type Result } from '../domain/result.js';
import { DomainError } from '../domain/errors/domain-error.js';
import type { CloseSwitchOrderInput, CloseSwitchOrderOutput } from './dtos/close-switch-order-dto.js';
import type { Clock } from './ports/clock.js';
import type { OperationRegistry } from './ports/operation-registry.js';
import type { OrderRepository } from './ports/order-repository.js';
export declare class CloseSwitchOrder {
    private readonly orders;
    private readonly operations;
    private readonly clock;
    constructor(orders: OrderRepository, operations: OperationRegistry, clock: Clock);
    execute(input: CloseSwitchOrderInput): Promise<Result<CloseSwitchOrderOutput, DomainError>>;
}
//# sourceMappingURL=close-switch-order.d.ts.map