import { DomainError } from '../../../core/domain/errors/domain-error.js';
import { fail, ok } from '../../../core/domain/result.js';
export class InMemoryOrderRepository {
    items = new Map();
    seed(order) {
        this.items.set(order.snapshot().id, order);
    }
    async findById(orderId) {
        const order = this.items.get(orderId);
        if (order === undefined) {
            return fail(new DomainError('INVALID_ORDER_ID', 'Ordem não encontrada.'));
        }
        return ok(order);
    }
    async save(order) {
        this.items.set(order.snapshot().id, order);
    }
    get(orderId) {
        return this.items.get(orderId);
    }
}
//# sourceMappingURL=in-memory-order-repository.js.map