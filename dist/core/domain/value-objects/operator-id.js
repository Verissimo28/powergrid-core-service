import { DomainError } from '../errors/domain-error.js';
import { fail, ok } from '../result.js';
export class OperatorId {
    content;
    constructor(content) {
        this.content = content;
    }
    static create(value) {
        const normalized = value.trim();
        if (!/^[a-zA-Z0-9_-]{2,80}$/.test(normalized)) {
            return fail(new DomainError('INVALID_OPERATOR_ID', 'O identificador do operador deve ter entre 2 e 80 caracteres alfanuméricos, hífen ou sublinhado.'));
        }
        return ok(new OperatorId(normalized));
    }
    get value() {
        return this.content;
    }
    equals(other) {
        return this.content === other.content;
    }
}
//# sourceMappingURL=operator-id.js.map