import type { PoolClient } from 'pg';
import { SwitchOrder } from '../../../core/domain/entities/switch-order.js';
import { DomainError } from '../../../core/domain/errors/domain-error.js';
import { fail, type Result } from '../../../core/domain/result.js';
import type { TransactionOrderRepository } from '../../../core/use-cases/ports/unit-of-work.js';

export class PostgresOrderRepository implements TransactionOrderRepository {
  public constructor(private readonly client: PoolClient) {}

  public async findByIdForUpdate(
    orderId: string,
  ): Promise<Result<SwitchOrder, DomainError>> {
    const result = await this.client.query<{
      id: string;
      description: string;
      status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
      assigned_operator_id: string | null;
      version: number;
      closed_at: Date | null;
    }>(
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

    return SwitchOrder.rehydrate({
      id: row.id,
      description: row.description,
      status: row.status,
      assignedOperatorId: row.assigned_operator_id,
      version: row.version,
      closedAt: row.closed_at,
    });
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
