import type { OperationRegistry } from '../../../core/use-cases/ports/operation-registry.js';
export declare class InMemoryOperationRegistry implements OperationRegistry {
    private readonly operationIds;
    has(operationId: string): Promise<boolean>;
    add(operationId: string): Promise<void>;
}
//# sourceMappingURL=in-memory-operation-registry.d.ts.map