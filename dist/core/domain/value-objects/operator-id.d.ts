import { DomainError } from '../errors/domain-error.js';
import { type Result } from '../result.js';
export declare class OperatorId {
    private readonly content;
    private constructor();
    static create(value: string): Result<OperatorId, DomainError>;
    get value(): string;
    equals(other: OperatorId): boolean;
}
//# sourceMappingURL=operator-id.d.ts.map