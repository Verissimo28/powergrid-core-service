export type CloseSwitchOrderInput = {
    orderId: string;
    operatorId: string;
    operationId: string;
    safetyChecksPassed: boolean;
};
export type CloseSwitchOrderOutput = {
    orderId: string;
    status: 'COMPLETED';
    version: number;
    closedAt: string;
    idempotentReplay: boolean;
};
//# sourceMappingURL=close-switch-order-dto.d.ts.map