import { DomainError } from '../errors/domain-error.js';
import { fail, ok } from '../result.js';
export class NonEmptyText {
    content;
    constructor(content) {
        this.content = content;
    }
    static create(value) {
        const normalized = value.trim();
        if (normalized.length === 0) {
            return fail(new DomainError('EMPTY_VALUE', 'O texto não pode ser vazio.'));
        }
        return ok(new NonEmptyText(normalized));
    }
    get value() {
        return this.content;
    }
    equals(other) {
        return this.content === other.content;
    }
}
//# sourceMappingURL=non-empty-text.js.map