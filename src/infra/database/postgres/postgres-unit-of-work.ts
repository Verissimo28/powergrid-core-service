import type { Pool, PoolClient } from 'pg';
import type {
  TransactionContext,
  UnitOfWork,
} from '../../../core/use-cases/ports/unit-of-work.js';
import { PostgresOperationRegistry } from './postgres-operation-registry.js';
import { PostgresOrderRepository } from './postgres-order-repository.js';

export class PostgresUnitOfWork implements UnitOfWork {
  public constructor(private readonly pool: Pool) {}

  public async transaction<T>(
    work: (context: TransactionContext) => Promise<T>,
  ): Promise<T> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const context: TransactionContext = {
        orders: new PostgresOrderRepository(client),
        operations: new PostgresOperationRegistry(client),
      };

      const result = await work(context);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
