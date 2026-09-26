// Minimal Cloudflare D1 implementation over node:sqlite for tests. It mirrors
// the D1 behaviour the app depends on: numbered parameters, batch() as one
// transaction, meta.changes, foreign keys on, and rejection of `undefined`.
import { DatabaseSync } from 'node:sqlite';

type Row = Record<string, unknown>;

function toSqlValue(value: unknown) {
  if (value === undefined) throw new Error("D1_TYPE_ERROR: Type 'undefined' not supported");
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint' || value instanceof Uint8Array) return value;
  throw new Error(`D1_TYPE_ERROR: Type '${typeof value}' not supported`);
}

class ShimStatement {
  constructor(
    private readonly owner: ShimD1,
    readonly query: string,
    readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new ShimStatement(this.owner, this.query, values);
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const { rows } = this.owner.execute(this);
    const row = rows[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async all<T = Row>() {
    return this.owner.execute(this).result as unknown as { results: T[]; success: true; meta: { changes: number; last_row_id: number } };
  }

  async run<T = Row>() {
    return this.all<T>();
  }

  async raw<T = unknown[]>() {
    return this.owner.execute(this).rows.map((row) => Object.values(row)) as T[];
  }
}

export class ShimD1 {
  readonly sqlite: DatabaseSync;

  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.sqlite.exec('PRAGMA foreign_keys = ON');
  }

  prepare(query: string) {
    return new ShimStatement(this, query);
  }

  execute(statement: ShimStatement) {
    const before = this.totalChanges();
    const rows = (this.run(statement) as Row[]).map((row) => ({ ...row }));
    const changes = this.totalChanges() - before;
    const lastRowId = Number((this.sqlite.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }).id);
    return { rows, result: { results: rows, success: true as const, meta: { changes, last_row_id: lastRowId, duration: 0 } } };
  }

  /**
   * D1 binds values to numbered parameters (?1, ?2) by position. Older
   * node:sqlite releases (22.14) cannot, so those become named parameters.
   */
  private run(statement: ShimStatement) {
    const numbers = [...new Set([...statement.query.matchAll(/\?(\d+)/g)].map((match) => Number(match[1])))];
    if (!numbers.length) return this.sqlite.prepare(statement.query).all(...(statement.params.map(toSqlValue) as never[]));
    const named = Object.fromEntries(numbers.map((number) => [`:p${number}`, toSqlValue(statement.params[number - 1])]));
    return this.sqlite.prepare(statement.query.replace(/\?(\d+)/g, ':p$1')).all(named as never);
  }

  private totalChanges() {
    return Number((this.sqlite.prepare('SELECT total_changes() AS c').get() as { c: number }).c);
  }

  async batch(statements: ShimStatement[]) {
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map((statement) => this.execute(statement).result);
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  async exec(query: string) {
    this.sqlite.exec(query);
    return { count: 1, duration: 0 };
  }
}

export function createTestD1() {
  return new ShimD1() as unknown as D1Database;
}
