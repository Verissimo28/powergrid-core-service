export interface OperationRegistry {
    has(operationID: string): Promise<boolean>;
    add(operationID: string): Promise<void>;
}