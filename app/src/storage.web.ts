import { emptyState, validateBackup, type State } from "./model";
let scope = "guest";
// Only unsynced work is retained in this tab. The cloud remains the library source.
export function load(account = "guest"): State {
  scope = account;
  const raw = sessionStorage.getItem("rs-recovery:" + scope);
  if (!raw) return emptyState();
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !validateBackup({ ...parsed, draft: null })) throw Error("Invalid recovery copy");
  return parsed as State;
}
export function persist(state: State) {
  const key = "rs-recovery:" + scope;
  if (state.cloudDirty || state.draft || state.syncOutbox?.length || state.syncConflicts?.length) sessionStorage.setItem(key, JSON.stringify(state));
  else sessionStorage.removeItem(key);
}
export const guestLibrary = emptyState;
export const hasChosenStorage = () => true;
export function chooseStorage() {}
