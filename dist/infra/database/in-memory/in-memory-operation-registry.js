export class InMemoryOperationRegistry {
    operationIds = new Set();
    async has(operationId) {
        return this.operationIds.has(operationId);
    }
    async add(operationId) {
        this.operationIds.add(operationId);
    }
}
//# sourceMappingURL=in-memory-operation-registry.js.map