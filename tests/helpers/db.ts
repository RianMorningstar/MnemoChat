import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import * as schema from "../../src/main/db/schema";

/**
 * Creates an isolated in-memory SQLite database with the full production schema
 * applied via the same migration files used in production. Each call returns a
 * fresh, independent database instance — safe to use per test file.
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
  return db;
}
