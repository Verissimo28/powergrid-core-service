import 'dotenv/config';
import { buildApp } from './infra/http/app.js';
import { closeCoreDatabase } from './infra/database/pool.js';

const port = Number(process.env.CORE_HTTP_PORT ?? 3001);
const app = buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({ host: '0.0.0.0', port });
  } catch (error) {
    app.log.error(error);
    await closeCoreDatabase();
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'encerrando core-service');
  await app.close();
  await closeCoreDatabase();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void start();
