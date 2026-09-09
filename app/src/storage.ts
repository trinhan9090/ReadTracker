import * as SQLite from "expo-sqlite";
import { emptyState, type State } from "./model";
let database: SQLite.SQLiteDatabase | undefined;
export function load(): State {
  database = SQLite.openDatabaseSync("readsession.db");
  database.execSync(
    "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id=1), value TEXT NOT NULL);",
  );
  const row = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_state WHERE id=1",
  );
  return row ? (JSON.parse(row.value) as State) : emptyState();
}
export function persist(state: State) {
  if (!database) throw new Error("Database is unavailable");
  database.runSync(
    "INSERT INTO app_state (id,value) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
    JSON.stringify(state),
  );
}
