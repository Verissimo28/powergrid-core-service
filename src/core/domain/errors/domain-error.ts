export type DomainErrorCode =
  | 'EMPTY_VALUE'
  | 'INVALID_ORDER_ID'
  | 'INVALID_OPERATOR_ID'
  | 'INVALID_STATUS'
  | 'OPERATOR_NOT_ASSIGNED'
  | 'SAFETY_CHECK_FAILED';

export class DomainError {
  public constructor(
    public readonly code: DomainErrorCode,
    public readonly message: string,
  ) {}
}