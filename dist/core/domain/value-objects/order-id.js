import { DomainError } from '../errors/domain-error.js';
import { fail, ok } from '../result.js';
export class OrderId {
    content;
    constructor(content) {
        this.content = content;
    }
    static create(value) {
        const normalized = value.trim();
        if (!/^[a-zA-Z0-9_-]{3,80}$/.test(normalized)) {
            return fail(new DomainError('INVALID_ORDER_ID', 'O identificador da ordem deve ter entre 3 e 80 caracteres alfanuméricos, hífen ou sublinhado.'));
        }
        return ok(new OrderId(normalized));
    }
    get value() {
        return this.content;
    }
    equals(other) {
        return this.content === other.content;
    }
}
//# sourceMappingURL=order-id.js.map