import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";
import path from "path";
import * as schema from "./schema";

const dbPath = app.isPackaged
  ? path.join(app.getPath("userData"), "mnemochat.db")
  : path.join(process.cwd(), "mnemochat.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
