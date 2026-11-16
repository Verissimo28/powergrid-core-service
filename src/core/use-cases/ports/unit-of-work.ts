import type { DomainError } from '../../domain/errors/domain-error.js';
import type { Result } from '../../domain/result.js';
import type { SwitchOrder } from '../../domain/entities/switch-order.js';
import type { OperationRegistry } from './operation-registry.js';

export type TransactionOrderRepository = {
  findByIdForUpdate(
    orderId: string,
  ): Promise<Result<SwitchOrder, DomainError>>;
  save(order: SwitchOrder): Promise<void>;
};

export type TransactionContext = {
  orders: TransactionOrderRepository;
  operations: OperationRegistry;
};

export interface UnitOfWork {
  transaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
