import type { Pool, PoolClient } from 'pg';
import { SwitchOrder } from '../../../core/domain/entities/switch-order.js';
import { DomainError } from '../../../core/domain/errors/domain-error.js';
import { fail, type Result } from '../../../core/domain/result.js';
import type { OrderStore } from '../../../core/use-cases/ports/order-store.js';
import type { TransactionOrderRepository } from '../../../core/use-cases/ports/unit-of-work.js';

type OrderRow = {
  id: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  assigned_operator_id: string | null;
  version: number;
  closed_at: Date | null;
};

function rehydrate(row: OrderRow): Result<SwitchOrder, DomainError> {
  return SwitchOrder.rehydrate({
    id: row.id,
    description: row.description,
    status: row.status,
    assignedOperatorId: row.assigned_operator_id,
    version: row.version,
    closedAt: row.closed_at,
  });
}

export class PostgresOrderRepository
  implements TransactionOrderRepository, OrderStore
{
  public constructor(private readonly client: PoolClient) {}

  public async create(order: SwitchOrder): Promise<void> {
    const snapshot = order.snapshot();

    await this.client.query(
      `
        INSERT INTO switch_orders
          (id, description, status, assigned_operator_id, version, closed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        snapshot.id,
        snapshot.description,
        snapshot.status,
        snapshot.assignedOperatorId,
        snapshot.version,
        snapshot.closedAt,
      ],
    );
  }

  public async findById(
    orderId: string,
  ): Promise<Result<SwitchOrder, DomainError>> {
    const result = await this.client.query<OrderRow>(
      `
        SELECT id, description, status, assigned_operator_id, version, closed_at
          FROM switch_orders
         WHERE id = $1
      `,
      [orderId],
    );

    const row = result.rows[0];
    if (row === undefined) {
      return fail(new DomainError('INVALID_ORDER_ID', 'Ordem não encontrada.'));
    }

    return rehydrate(row);
  }

  public async findByIdForUpdate(
    orderId: string,
  ): Promise<Result<SwitchOrder, DomainError>> {
    const result = await this.client.query<OrderRow>(
      `
        SELECT id, description, status, assigned_operator_id, version, closed_at
          FROM switch_orders
         WHERE id = $1
         FOR UPDATE
      `,
      [orderId],
    );

    const row = result.rows[0];
    if (row === undefined) {
      return fail(new DomainError('INVALID_ORDER_ID', 'Ordem não encontrada.'));
    }

    return rehydrate(row);
  }

  public async save(order: SwitchOrder): Promise<void> {
    const snapshot = order.snapshot();

    await this.client.query(
      `
        UPDATE switch_orders
           SET status = $2,
               version = $3,
               closed_at = $4,
               updated_at = NOW()
         WHERE id = $1
      `,
      [snapshot.id, snapshot.status, snapshot.version, snapshot.closedAt],
    );
  }
}

export class PostgresOrderStore implements OrderStore {
  public constructor(private readonly pool: Pool) {}

  public async create(order: SwitchOrder): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await new PostgresOrderRepository(client).create(order);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async findById(
    orderId: string,
  ): Promise<Result<SwitchOrder, DomainError>> {
    const client = await this.pool.connect();

    try {
      return await new PostgresOrderRepository(client).findById(orderId);
    } finally {
      client.release();
    }
  }
}
