import type { OperationRegistry } from '../../../core/use-cases/ports/operation-registry.js';

export class InMemoryOperationRegistry implements OperationRegistry {
  private readonly operationIds = new Set<string>();

  public async has(operationId: string): Promise<boolean> {
    return this.operationIds.has(operationId);
  }

  public async add(operationId: string): Promise<void> {
    this.operationIds.add(operationId);
  }
}