import type { PoolClient } from 'pg';
import type { OperationRegistry } from '../../../core/use-cases/ports/operation-registry.js';

export class PostgresOperationRegistry implements OperationRegistry {
  public constructor(private readonly client: PoolClient) {}

  public async has(operationId: string): Promise<boolean> {
    const result = await this.client.query<{ operation_id: string }>(
      `SELECT operation_id FROM idempotency_keys WHERE operation_id = $1`,
      [operationId],
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  public async add(operationId: string): Promise<void> {
    await this.client.query(
      `
        INSERT INTO idempotency_keys (operation_id, response)
        VALUES ($1, '{}'::jsonb)
        ON CONFLICT (operation_id) DO NOTHING
      `,
      [operationId],
    );
  }
}
