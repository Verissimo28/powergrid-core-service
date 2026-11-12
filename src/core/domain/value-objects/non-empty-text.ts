import { DomainError } from '../errors/domain-error.js';
import { fail, ok, type Result } from '../result.js';

export class NonEmptyText {
  private constructor(private readonly content: string) {}

  public static create(value: string): Result<NonEmptyText, DomainError> {
    const normalized = value.trim();

    if (normalized.length === 0) {
      return fail(new DomainError('EMPTY_VALUE', 'O texto não pode ser vazio.'));
    }

    return ok(new NonEmptyText(normalized));
  }

  public get value(): string {
    return this.content;
  }

  public equals(other: NonEmptyText): boolean {
    return this.content === other.content;
  }
}