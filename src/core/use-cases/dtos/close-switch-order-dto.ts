export type CloseSwitchOrderInput = {
  orderId: string;
  operatorId: string;
  operationId: string;
  correlationId?: string;
  safetyChecksPassed: boolean;
};

export type CloseSwitchOrderOutput = {
  orderId: string;
  status: 'COMPLETED';
  version: number;
  closedAt: string;
  idempotentReplay: boolean;
};
