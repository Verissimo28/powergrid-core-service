export type DomainErrorCode = 'EMPTY_VALUE' | 'INVALID_ORDER_ID' | 'INVALID_OPERATOR_ID' | 'INVALID_STATUS' | 'OPERATOR_NOT_ASSIGNED' | 'SAFETY_CHECK_FAILED';
export declare class DomainError {
    readonly code: DomainErrorCode;
    readonly message: string;
    constructor(code: DomainErrorCode, message: string);
}
//# sourceMappingURL=domain-error.d.ts.map