import { fail, ok } from '../domain/result.js';
import { DomainError } from '../domain/errors/domain-error.js';
export class CloseSwitchOrder {
    orders;
    operations;
    clock;
    constructor(orders, operations, clock) {
        this.orders = orders;
        this.operations = operations;
        this.clock = clock;
    }
    async execute(input) {
        const alreadyProcessed = await this.operations.has(input.operationId);
        if (alreadyProcessed) {
            const existingOrder = await this.orders.findById(input.orderId);
            if (!existingOrder.ok)
                return existingOrder;
            const snapshot = existingOrder.value.snapshot();
            if (snapshot.status !== 'COMPLETED' || snapshot.closedAt === null) {
                return fail(new DomainError('INVALID_STATUS', 'A operação foi registrada, mas a ordem não está concluída.'));
            }
            return ok({
                orderId: snapshot.id,
                status: 'COMPLETED',
                version: snapshot.version,
                closedAt: snapshot.closedAt,
                idempotentReplay: true,
            });
        }
        const orderResult = await this.orders.findById(input.orderId);
        if (!orderResult.ok)
            return orderResult;
        const closeResult = orderResult.value.close({
            operatorId: input.operatorId,
            safetyChecksPassed: input.safetyChecksPassed,
            now: this.clock.now(),
        });
        if (!closeResult.ok)
            return closeResult;
        await this.orders.save(orderResult.value);
        await this.operations.add(input.operationId);
        const snapshot = orderResult.value.snapshot();
        if (snapshot.closedAt === null) {
            return fail(new DomainError('INVALID_STATUS', 'A ordem foi fechada sem data de fechamento.'));
        }
        return ok({
            orderId: snapshot.id,
            status: 'COMPLETED',
            version: snapshot.version,
            closedAt: snapshot.closedAt,
            idempotentReplay: false,
        });
    }
}
//# sourceMappingURL=close-switch-order.js.map