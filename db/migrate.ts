import { migrations, type Migration } from './migrations';

const TRACKING_TABLE = `CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

async function appliedIds(db: D1Database) {
  const result = await db.prepare('SELECT id FROM _migrations').all<{ id: string }>();
  return new Set(result.results.map((row) => row.id));
}

function context(db: D1Database) {
  return {
    db,
    columns: async (table: string) => {
      if (!/^[a-z_]+$/.test(table)) throw new Error(`Invalid table name: ${table}`);
      const result = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
      return new Set(result.results.map((row) => row.name));
    },
  };
}

/**
 * Applies pending migrations in order. Each migration runs as one atomic batch
 * together with its tracking row, so a failed migration leaves nothing behind.
 * Two isolates racing on the same migration are safe: the loser's batch fails
 * on the tracking row and is treated as applied once the winner's row exists.
 */
export async function applyMigrations(db: D1Database, list: readonly Migration[] = migrations) {
  // One query on an up-to-date database (every cold isolate runs this); the
  // tracking table is created only when it is missing.
  let applied = await appliedIds(db).catch(async () => {
    await db.prepare(TRACKING_TABLE).run();
    return appliedIds(db);
  });
  if (list.every((migration) => applied.has(migration.id))) return;
  for (const migration of list) {
    if (applied.has(migration.id)) continue;
    const statements = await migration.build(context(db));
    try {
      await db.batch([...statements, db.prepare('INSERT INTO _migrations(id) VALUES (?1)').bind(migration.id)]);
    } catch (error) {
      applied = await appliedIds(db);
      if (!applied.has(migration.id)) throw error;
    }
    applied.add(migration.id);
  }
}
