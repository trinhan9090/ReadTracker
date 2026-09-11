import { useEffect, useRef, useState, type RefObject } from "react";
import { AppState } from "react-native";
import { emptyState, id, type State } from "./model";
import { pullLibrary, applyOperations } from "./online";
import { persist } from "./storage";
import { changes, reconcile, snapshot, same } from "./sync";

export function useCloud(owner: string | undefined, ready: boolean, state: State, ref: RefObject<State>, setState: (s: State) => void, paused = false) {
  const [status, setStatus] = useState("");
  const active = useRef(true), busy = useRef(false), pause = useRef(paused);
  pause.current = paused;
  const apply = (s: State) => { if (!active.current || same(s, ref.current)) return; persist(s); ref.current = s; setState(s); };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function pull() {
    if (!owner || busy.current || ref.current.draft) return;
    busy.current = true;
    const before = ref.current;
    try {
      const remote = await pullLibrary(owner);
      if (!active.current || ref.current !== before) return;
      if (!remote) throw Error("No cloud copy");
      apply({ ...remote, syncBase: snapshot(remote), syncOutbox: [], syncConflicts: [] }); setStatus("");
    } catch { if (active.current) setStatus("Không tải được cloud; dữ liệu đang có được giữ / Cloud unavailable; current data kept."); }
    finally { busy.current = false; }
  }
  async function sync() {
    if (!owner || !ready || busy.current || ref.current.draft || pause.current || !active.current) return;
    busy.current = true;
    try {
      // Retry the exact persisted request first: the previous response may have been lost.
      let ops = ref.current.syncOutbox ?? [];
      if (!ops.length) {
        const remote = await pullLibrary(owner) ?? { ...emptyState(), cloudRevision: 0 };
        if (!active.current || pause.current || ref.current.draft) return;
        const local = ref.current;
        if (!local.syncBase) {
          if (local.cloudDirty && (local.cloudRevision ?? 0) !== (remote.cloudRevision ?? 0)) {
            setStatus("Bản 0.4 trên máy có thay đổi chưa đồng bộ và cloud đã đổi. Hãy xuất JSON trước khi tải bản cloud / Unsynced 0.4 changes: export JSON before loading the newer cloud copy."); return;
          }
          apply(local.cloudDirty ? { ...local, syncBase: snapshot(remote) }
            : { ...local, ...snapshot(remote), cloudRevision: remote.cloudRevision, syncBase: snapshot(remote), cloudDirty: false });
        } else apply(reconcile(local, remote));
        ops = changes(ref.current.syncBase!, ref.current, ref.current.syncConflicts).slice(0, 50).map(op => ({ ...op, opId: id() }));
        if (!ops.length) {
          setStatus(ref.current.syncConflicts?.length ? "Có thay đổi cần bạn chọn trong Cài đặt → Tài khoản & đồng bộ / Resolve conflicting changes in Settings → Account & sync." : "");
          return;
        }
        apply({ ...ref.current, syncOutbox: ops });
      }
      const result = await applyOperations(owner, ops);
      if (!active.current || pause.current || ref.current.draft) return;
      const accepted = ops.filter(op => result.accepted.includes(op.opId));
      const next = reconcile(ref.current, result.remote, accepted);
      for (const c of result.conflicts) if (!next.syncConflicts!.some(x => x.kind === c.kind && x.id === c.id)) next.syncConflicts!.push(c);
      apply({ ...next, syncOutbox: [] });
      setStatus(next.syncConflicts?.length ? "Có thay đổi cần bạn chọn trong Cài đặt → Tài khoản & đồng bộ / Resolve conflicting changes in Settings → Account & sync." : "");
    } catch {
      if (active.current) setStatus("Chưa đồng bộ được. Thay đổi đang được giữ; app sẽ thử lại khi có mạng. Trên web, đừng xóa dữ liệu trình duyệt / Sync failed. Changes are kept for retry. Do not clear browser data.");
    } finally { busy.current = false; }
  }
  const run = useRef(sync); run.current = sync;
  useEffect(() => {
    if (!owner || !ready || paused || state.draft) return;
    const timer = setTimeout(() => { void run.current(); }, 1000);
    return () => clearTimeout(timer);
  }, [owner, ready, paused, state.cloudDirty, state.syncOutbox, state.syncConflicts, state.books, state.sessions, state.settings]);
  useEffect(() => {
    if (!owner || !ready) return;
    const retry = () => { if (AppState.currentState === "active") void run.current(); };
    const timer = setInterval(retry, 10000);
    const listener = AppState.addEventListener("change", s => { if (s === "active") retry(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [owner, ready]);
  return { status, sync, pull };
}
