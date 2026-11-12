import { DomainError } from '../errors/domain-error.js';
import { fail, ok } from '../result.js';
import { NonEmptyText } from '../value-objects/non-empty-text.js';
import { OperatorId } from '../value-objects/operator-id.js';
import { OrderId } from '../value-objects/order-id.js';
export const ORDER_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
export class SwitchOrder {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(input) {
        const id = OrderId.create(input.id);
        if (!id.ok)
            return id;
        const description = NonEmptyText.create(input.description);
        if (!description.ok)
            return description;
        let assignedOperatorId = null;
        if (input.assignedOperatorId !== null) {
            const operatorId = OperatorId.create(input.assignedOperatorId);
            if (!operatorId.ok)
                return operatorId;
            assignedOperatorId = operatorId.value;
        }
        return ok(new SwitchOrder({
            id: id.value,
            description: description.value,
            status: 'OPEN',
            assignedOperatorId,
            version: 1,
            closedAt: null,
        }));
    }
    static rehydrate(input) {
        const id = OrderId.create(input.id);
        if (!id.ok)
            return id;
        const description = NonEmptyText.create(input.description);
        if (!description.ok)
            return description;
        if (!Number.isInteger(input.version) || input.version < 1) {
            return fail(new DomainError('INVALID_STATUS', 'A versão da ordem deve ser um inteiro positivo.'));
        }
        let assignedOperatorId = null;
        if (input.assignedOperatorId !== null) {
            const operatorId = OperatorId.create(input.assignedOperatorId);
            if (!operatorId.ok)
                return operatorId;
            assignedOperatorId = operatorId.value;
        }
        if (input.status === 'COMPLETED' && input.closedAt === null) {
            return fail(new DomainError('INVALID_STATUS', 'Uma ordem concluída precisa possuir data de fechamento.'));
        }
        return ok(new SwitchOrder({
            id: id.value,
            description: description.value,
            status: input.status,
            assignedOperatorId,
            version: input.version,
            closedAt: input.closedAt,
        }));
    }
    assignOperator(operatorIdValue) {
        const operatorId = OperatorId.create(operatorIdValue);
        if (!operatorId.ok)
            return operatorId;
        if (this.props.status === 'COMPLETED') {
            return fail(new DomainError('INVALID_STATUS', 'Uma ordem concluída não pode receber novo operador.'));
        }
        this.props.assignedOperatorId = operatorId.value;
        this.props.version += 1;
        return ok(undefined);
    }
    start(operatorIdValue) {
        const operatorId = OperatorId.create(operatorIdValue);
        if (!operatorId.ok)
            return operatorId;
        if (this.props.status !== 'OPEN') {
            return fail(new DomainError('INVALID_STATUS', 'Somente uma ordem aberta pode ser iniciada.'));
        }
        if (this.props.assignedOperatorId === null ||
            !this.props.assignedOperatorId.equals(operatorId.value)) {
            return fail(new DomainError('OPERATOR_NOT_ASSIGNED', 'O operador informado não está atribuído à ordem.'));
        }
        this.props.status = 'IN_PROGRESS';
        this.props.version += 1;
        return ok(undefined);
    }
    close(input) {
        const operatorId = OperatorId.create(input.operatorId);
        if (!operatorId.ok)
            return operatorId;
        if (this.props.status !== 'IN_PROGRESS') {
            return fail(new DomainError('INVALID_STATUS', 'Somente uma ordem em execução pode ser concluída.'));
        }
        if (this.props.assignedOperatorId === null ||
            !this.props.assignedOperatorId.equals(operatorId.value)) {
            return fail(new DomainError('OPERATOR_NOT_ASSIGNED', 'O operador informado não está atribuído à ordem.'));
        }
        if (!input.safetyChecksPassed) {
            return fail(new DomainError('SAFETY_CHECK_FAILED', 'As pré-condições de segurança simuladas não foram satisfeitas.'));
        }
        this.props.status = 'COMPLETED';
        this.props.closedAt = input.now;
        this.props.version += 1;
        return ok({
            version: this.props.version,
            closedAt: input.now,
        });
    }
    snapshot() {
        return {
            id: this.props.id.value,
            description: this.props.description.value,
            status: this.props.status,
            assignedOperatorId: this.props.assignedOperatorId?.value ?? null,
            version: this.props.version,
            closedAt: this.props.closedAt?.toISOString() ?? null,
        };
    }
}
//# sourceMappingURL=switch-order.js.map