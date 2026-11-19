import type { OperationRegistry } from '../../../core/use-cases/ports/operation-registry.js';
import type {
  TransactionContext,
  UnitOfWork,
} from '../../../core/use-cases/ports/unit-of-work.js';
import { InMemoryOperationRegistry } from './in-memory-operation-registry.js';
import { InMemoryOrderRepository } from './in-memory-order-repository.js';
import { InMemoryOutboxRepository } from './in-memory-outbox-repository.js';

export class InMemoryUnitOfWork implements UnitOfWork {
  public constructor(
    public readonly orders: InMemoryOrderRepository =
      new InMemoryOrderRepository(),
    public readonly operations: OperationRegistry =
      new InMemoryOperationRegistry(),
    public readonly outbox: InMemoryOutboxRepository =
      new InMemoryOutboxRepository(),
  ) {}

  public async transaction<T>(
    work: (context: TransactionContext) => Promise<T>,
  ): Promise<T> {
    const context: TransactionContext = {
      orders: {
        findByIdForUpdate: (orderId) => this.orders.findById(orderId),
        save: (order) => this.orders.save(order),
      },
      operations: this.operations,
      outbox: this.outbox,
    };

    return work(context);
  }
}
