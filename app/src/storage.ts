import * as SQLite from "expo-sqlite";
import { emptyState, type State } from "./model";
let database: SQLite.SQLiteDatabase | undefined;
let scope = "guest";
export function load(account = "guest"): State {
  scope = account;
  database = SQLite.openDatabaseSync("readsession.db");
  database.execSync(
    "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id=1), value TEXT NOT NULL);",
  );
  database.execSync("CREATE TABLE IF NOT EXISTS account_state (account TEXT PRIMARY KEY, value TEXT NOT NULL)");
  if (scope !== "guest") {
    const row = database.getFirstSync<{ value: string }>("SELECT value FROM account_state WHERE account=?", scope);
    return row ? JSON.parse(row.value) as State : emptyState();
  }
  const row = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_state WHERE id=1",
  );
  return row ? (JSON.parse(row.value) as State) : emptyState();
}
export function persist(state: State) {
  if (!database) throw new Error("Database is unavailable");
  if (scope !== "guest") {
    database.runSync("INSERT INTO account_state(account,value) VALUES (?,?) ON CONFLICT(account) DO UPDATE SET value=excluded.value", scope, JSON.stringify(state));
    return;
  }
  database.runSync(
    "INSERT INTO app_state (id,value) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
    JSON.stringify(state),
  );
}
export function guestLibrary(): State {
  const row = database?.getFirstSync<{ value: string }>("SELECT value FROM app_state WHERE id=1");
  return row ? JSON.parse(row.value) as State : emptyState();
}
