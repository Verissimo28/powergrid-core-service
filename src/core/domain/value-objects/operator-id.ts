import { DomainError } from '../errors/domain-error.js';
import { fail, ok, type Result } from '../result.js';

export class OperatorId {
  private constructor(private readonly content: string) {}

  public static create(value: string): Result<OperatorId, DomainError> {
    const normalized = value.trim();

    if (!/^[a-zA-Z0-9_-]{2,80}$/.test(normalized)) {
      return fail(new DomainError(
        'INVALID_OPERATOR_ID',
        'O identificador do operador deve ter entre 2 e 80 caracteres alfanuméricos, hífen ou sublinhado.',
      ));
    }

    return ok(new OperatorId(normalized));
  }

  public get value(): string {
    return this.content;
  }

  public equals(other: OperatorId): boolean {
    return this.content === other.content;
  }
}