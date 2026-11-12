import { DomainError } from '../errors/domain-error.js';
import { type Result } from '../result.js';
export declare const ORDER_STATUSES: readonly ["OPEN", "IN_PROGRESS", "COMPLETED"];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type SwitchOrderSnapshot = {
    id: string;
    description: string;
    status: OrderStatus;
    assignedOperatorId: string | null;
    version: number;
    closedAt: string | null;
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
export declare class SwitchOrder {
    private readonly props;
    private constructor();
    static create(input: CreateInput): Result<SwitchOrder, DomainError>;
    static rehydrate(input: RehydrateInput): Result<SwitchOrder, DomainError>;
    assignOperator(operatorIdValue: string): Result<void, DomainError>;
    start(operatorIdValue: string): Result<void, DomainError>;
    close(input: {
        operatorId: string;
        safetyChecksPassed: boolean;
        now: Date;
    }): Result<{
        version: number;
        closedAt: Date;
    }, DomainError>;
    snapshot(): SwitchOrderSnapshot;
}
export {};
//# sourceMappingURL=switch-order.d.ts.map