import { DomainError } from '../errors/domain-error.js';
import { type Result } from '../result.js';
export declare class OrderId {
    private readonly content;
    private constructor();
    static create(value: string): Result<OrderId, DomainError>;
    get value(): string;
    equals(other: OrderId): boolean;
}
//# sourceMappingURL=order-id.d.ts.map