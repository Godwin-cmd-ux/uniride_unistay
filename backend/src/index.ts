import { createApp } from './app';
import { config } from './config';
import { pool } from './db';

async function main() {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('[startup] cannot reach PostgreSQL. Is it running and are credentials correct?');
    console.error(error);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`\n  UNIRIDE UNISTAY API`);
    console.log(`  → http://localhost:${config.port}/api/health`);
    console.log(`  → environment: ${config.env}\n`);
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
