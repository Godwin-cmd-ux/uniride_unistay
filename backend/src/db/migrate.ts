import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('[migrate] applying schema...');
  await pool.query(sql);
  console.log('[migrate] schema is up to date');
  await pool.end();
}

migrate().catch((error) => {
  console.error('[migrate] failed', error);
  process.exit(1);
});
