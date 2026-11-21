import { Pool, PoolClient, QueryResultRow, types } from 'pg';
import { config } from '../config';

// Return NUMERIC columns (prices, fares, ratings) as JS numbers.
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
// Keep DATE columns as plain YYYY-MM-DD strings.
types.setTypeParser(1082, (value) => value);

if (config.env !== 'production') {
  // TLS defaults are fine for a local Postgres instance.
}

// Render Postgres (and most managed providers) require TLS for external
// connections. Internal connections work without it, so it stays opt-in.
const useSsl =
  process.env.DATABASE_SSL === 'true' || /[?&]sslmode=require/.test(config.databaseUrl);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('[db] unexpected idle client error', error);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
