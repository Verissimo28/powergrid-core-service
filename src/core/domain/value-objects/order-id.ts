import { DomainError } from '../errors/domain-error.js';
import { fail, ok, type Result } from '../result.js';

export class OrderId {
  private constructor(private readonly content: string) {}

  public static create(value: string): Result<OrderId, DomainError> {
    const normalized = value.trim();

    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(normalized)) {
      return fail(new DomainError(
        'INVALID_ORDER_ID',
        'O identificador da ordem deve ter entre 3 e 80 caracteres alfanuméricos, hífen ou sublinhado.',
      ));
    }

    return ok(new OrderId(normalized));
  }

  public get value(): string {
    return this.content;
  }

  public equals(other: OrderId): boolean {
    return this.content === other.content;
  }
}