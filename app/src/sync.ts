import type { State, Book, Session } from "./model.ts";
export type SyncSnapshot = Pick<State, "books" | "sessions" | "settings">;
export type RecordKind = "books" | "sessions" | "settings";
export type RecordValue = Book | Session | State["settings"] | null;
export type SyncOperation = { opId: string; kind: RecordKind; id: string; base: RecordValue; value: RecordValue };
export type SyncConflict = { kind: RecordKind; id: string; remote: RecordValue };
export const snapshot = (s: SyncSnapshot): SyncSnapshot => ({ books: s.books, sessions: s.sessions, settings: s.settings });
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, ordered(v)]));
  return value;
}
export const same = (a: unknown, b: unknown) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
export function record(s: SyncSnapshot, kind: RecordKind, id: string): RecordValue { return kind === "settings" ? s.settings : s[kind].find(x => x.id === id) ?? null; }
export function replace(s: SyncSnapshot, kind: RecordKind, id: string, value: RecordValue): SyncSnapshot {
  if (kind === "settings") return { ...s, settings: (value ?? s.settings) as State["settings"] };
  const list = s[kind].filter(x => x.id !== id);
  if (value) list.push(value as Book & Session);
  return { ...s, [kind]: list };
}
const keys = (kind: RecordKind, ...states: SyncSnapshot[]) => kind === "settings" ? ["settings"] : [...new Set(states.flatMap(s => s[kind].map(x => x.id)))];
export function changes(base: SyncSnapshot, local: SyncSnapshot, conflicts: SyncConflict[] = []): Omit<SyncOperation,"opId">[] {
  return (["books","sessions","settings"] as const).flatMap(kind => keys(kind,base,local).filter(id => !conflicts.some(c => c.kind === kind && c.id === id)).flatMap(id => {
    const before=record(base,kind,id), after=record(local,kind,id);
    if (kind === "sessions" && after && "bookId" in after && conflicts.some(c => c.kind === "books" && c.id === after.bookId)) return [];
    return same(before,after) ? [] : [{kind,id,base:before,value:after}];
  }));
}
// Preserve edits made while a request was in flight. Acknowledged operations advance
// only their own baseline before merging the server's latest version.
export function reconcile(local: State, remote: State, acknowledged: SyncOperation[] = []): State {
  let base = snapshot(local.syncBase ?? remote);
  for (const op of acknowledged) base = replace(base,op.kind,op.id,op.value);
  let merged = snapshot(local), nextBase = snapshot(remote);
  const conflicts: SyncConflict[] = [];
  for (const kind of ["books","sessions","settings"] as const) for (const id of keys(kind,base,local,remote)) {
    const b=record(base,kind,id), l=record(local,kind,id), r=record(remote,kind,id);
    if (same(l,b)) merged=replace(merged,kind,id,r);
    else if (!same(r,b) && !same(l,r)) {
      conflicts.push({kind,id,remote:r}); nextBase=replace(nextBase,kind,id,b);
    }
  }
  // A remotely removed parent must not silently orphan an unsent session.
  for (const session of merged.sessions) {
    if (session.deletedAt || merged.books.some(b => b.id === session.bookId && !b.deletedAt) || same(session,record(remote,"sessions",session.id))) continue;
    const parent = local.books.find(b => b.id === session.bookId);
    if (!parent || parent.deletedAt) continue;
    merged = replace(merged,"books",parent.id,parent);
    nextBase = replace(nextBase,"books",parent.id,record(base,"books",parent.id));
    if (!conflicts.some(c => c.kind === "books" && c.id === parent.id)) conflicts.push({kind:"books",id:parent.id,remote:record(remote,"books",parent.id)});
  }
  return { ...local, ...merged, cloudRevision:remote.cloudRevision, syncBase:nextBase, syncConflicts:conflicts, cloudDirty:changes(nextBase,merged).length>0 };
}
export function resolveConflict(state: State, conflict: SyncConflict, keepLocal: boolean): State {
  if (!state.syncBase) return state;
  const syncBase=replace(state.syncBase,conflict.kind,conflict.id,conflict.remote);
  const values=keepLocal ? snapshot(state) : replace(snapshot(state),conflict.kind,conflict.id,conflict.remote);
  if (!keepLocal && conflict.kind === "books" && conflict.remote === null) values.sessions = values.sessions.filter(s => s.bookId !== conflict.id);
  return { ...state,...values,syncBase,syncConflicts:(state.syncConflicts??[]).filter(c=>c.kind!==conflict.kind||c.id!==conflict.id),cloudDirty:changes(syncBase,values).length>0 };
}
