import { DomainError } from '../errors/domain-error.js';
import { type Result } from '../result.js';
export declare class NonEmptyText {
    private readonly content;
    private constructor();
    static create(value: string): Result<NonEmptyText, DomainError>;
    get value(): string;
    equals(other: NonEmptyText): boolean;
}
//# sourceMappingURL=non-empty-text.d.ts.map