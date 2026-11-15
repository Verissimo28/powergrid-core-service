import pg from 'pg';

const { Pool } = pg;

export const coreDatabaseUrl =
  process.env.CORE_DATABASE_URL ??
  'postgresql://core_user:change_me_core@localhost:5433/powergrid_core';

export const corePool = new Pool({
  connectionString: coreDatabaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function closeCoreDatabase(): Promise<void> {
  await corePool.end();
}
