import { DomainError } from '../errors/domain-error.js';
import { fail, ok, type Result } from '../result.js';
import { NonEmptyText } from '../value-objects/non-empty-text.js';
import { OperatorId } from '../value-objects/operator-id.js';
import { OrderId } from '../value-objects/order-id.js';

export const ORDER_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type SwitchOrderSnapshot = {
  id: string;
  description: string;
  status: OrderStatus;
  assignedOperatorId: string | null;
  version: number;
  closedAt: string | null;
};

type SwitchOrderProps = {
  id: OrderId;
  description: NonEmptyText;
  status: OrderStatus;
  assignedOperatorId: OperatorId | null;
  version: number;
  closedAt: Date | null;
};

type RehydrateInput = {
  id: string;
  description: string;
  status: OrderStatus;
  assignedOperatorId: string | null;
  version: number;
  closedAt: Date | null;
};

type CreateInput = {
  id: string;
  description: string;
  assignedOperatorId: string | null;
};

export class SwitchOrder {
  private constructor(private readonly props: SwitchOrderProps) {}

  public static create(input: CreateInput): Result<SwitchOrder, DomainError> {
    const id = OrderId.create(input.id);
    if (!id.ok) return id;

    const description = NonEmptyText.create(input.description);
    if (!description.ok) return description;

    let assignedOperatorId: OperatorId | null = null;
    if (input.assignedOperatorId !== null) {
      const operatorId = OperatorId.create(input.assignedOperatorId);
      if (!operatorId.ok) return operatorId;
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

  public static rehydrate(input: RehydrateInput): Result<SwitchOrder, DomainError> {
    const id = OrderId.create(input.id);
    if (!id.ok) return id;

    const description = NonEmptyText.create(input.description);
    if (!description.ok) return description;

    if (!Number.isInteger(input.version) || input.version < 1) {
      return fail(new DomainError('INVALID_STATUS', 'A versão da ordem deve ser um inteiro positivo.'));
    }

    let assignedOperatorId: OperatorId | null = null;
    if (input.assignedOperatorId !== null) {
      const operatorId = OperatorId.create(input.assignedOperatorId);
      if (!operatorId.ok) return operatorId;
      assignedOperatorId = operatorId.value;
    }

    if (input.status === 'COMPLETED' && input.closedAt === null) {
      return fail(new DomainError(
        'INVALID_STATUS',
        'Uma ordem concluída precisa possuir data de fechamento.',
      ));
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

  public assignOperator(operatorIdValue: string): Result<void, DomainError> {
    const operatorId = OperatorId.create(operatorIdValue);
    if (!operatorId.ok) return operatorId;

    if (this.props.status === 'COMPLETED') {
      return fail(new DomainError(
        'INVALID_STATUS',
        'Uma ordem concluída não pode receber novo operador.',
      ));
    }

    this.props.assignedOperatorId = operatorId.value;
    this.props.version += 1;
    return ok(undefined);
  }

  public start(operatorIdValue: string): Result<void, DomainError> {
    const operatorId = OperatorId.create(operatorIdValue);
    if (!operatorId.ok) return operatorId;

    if (this.props.status !== 'OPEN') {
      return fail(new DomainError(
        'INVALID_STATUS',
        'Somente uma ordem aberta pode ser iniciada.',
      ));
    }

    if (this.props.assignedOperatorId === null ||
        !this.props.assignedOperatorId.equals(operatorId.value)) {
      return fail(new DomainError(
        'OPERATOR_NOT_ASSIGNED',
        'O operador informado não está atribuído à ordem.',
      ));
    }

    this.props.status = 'IN_PROGRESS';
    this.props.version += 1;
    return ok(undefined);
  }

  public close(input: {
    operatorId: string;
    safetyChecksPassed: boolean;
    now: Date;
  }): Result<{ version: number; closedAt: Date }, DomainError> {
    const operatorId = OperatorId.create(input.operatorId);
    if (!operatorId.ok) return operatorId;

    if (this.props.status !== 'IN_PROGRESS') {
      return fail(new DomainError(
        'INVALID_STATUS',
        'Somente uma ordem em execução pode ser concluída.',
      ));
    }

    if (this.props.assignedOperatorId === null ||
        !this.props.assignedOperatorId.equals(operatorId.value)) {
      return fail(new DomainError(
        'OPERATOR_NOT_ASSIGNED',
        'O operador informado não está atribuído à ordem.',
      ));
    }

    if (!input.safetyChecksPassed) {
      return fail(new DomainError(
        'SAFETY_CHECK_FAILED',
        'As pré-condições de segurança simuladas não foram satisfeitas.',
      ));
    }

    this.props.status = 'COMPLETED';
    this.props.closedAt = input.now;
    this.props.version += 1;

    return ok({
      version: this.props.version,
      closedAt: input.now,
    });
  }

  public snapshot(): SwitchOrderSnapshot {
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