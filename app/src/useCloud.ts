import { useEffect, useRef, useState, type RefObject } from "react";
import { AppState } from "react-native";
import { type State } from "./model";
import { pullLibrary, pushLibrary } from "./online";
import { persist } from "./storage";
export function useCloud(owner: string | undefined, ready: boolean, state: State, ref: RefObject<State>, setState: (s: State) => void) {
  const [initialized, setInitialized] = useState(false), [status, setStatus] = useState("");
  const active = useRef(true), busy = useRef(false), conflict = useRef(false);
  const apply = (s: State) => { if (!active.current) return; persist(s); ref.current = s; setState(s); };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function pull() {
    if (!owner || busy.current || ref.current.draft) return;
    busy.current = true;
    const before = ref.current;
    try {
      const remote = await pullLibrary(owner);
      if (!active.current) return;
      if (ref.current !== before) { setStatus("Bạn vừa sửa dữ liệu; chưa thay bằng cloud / Local data changed; cloud copy was not applied."); return; }
      if (!remote) { setStatus("Cloud chưa có bản để tải. Dữ liệu trên máy được giữ / No cloud copy exists; local data kept."); return; }
      apply(remote); conflict.current = false; setInitialized(true); setStatus("");
    } catch { if (active.current) setStatus("Không tải được cloud. Dữ liệu trên máy được giữ / Cloud unavailable; local data kept."); }
    finally { busy.current = false; }
  }
  async function sync() {
    if (!owner || !initialized || busy.current || ref.current.draft || !active.current) return;
    busy.current = true;
    const snapshot = ref.current;
    try {
      const revision = await pushLibrary(snapshot, owner);
      if (!active.current) return;
      apply({ ...ref.current, cloudRevision: revision, cloudDirty: ref.current !== snapshot });
      conflict.current = false; setStatus("");
    } catch (error) {
      conflict.current = String((error as { message?: string }).message).includes("RS_CONFLICT");
      if (active.current) setStatus(conflict.current
        ? "Cloud có bản mới hơn. Xuất JSON để giữ thay đổi trên máy, rồi tải bản cloud trong Cài đặt → Tài khoản & đồng bộ / Newer cloud copy; export local JSON before loading it in Settings → Account & sync."
        : "Chưa đồng bộ được. Dữ liệu vẫn lưu trên máy; sẽ thử lại khi có mạng và app đang mở / Sync failed. Local data is kept; retrying while the app is open.");
    } finally { busy.current = false; }
  }
  useEffect(() => {
    if (!owner || !ready) return;
    let cancelled = false; busy.current = true;
    const local = ref.current;
    void pullLibrary(owner).then((remote) => {
      if (cancelled) return;
      if (!local.cloudDirty && !local.draft && ref.current === local && remote) apply(remote);
      else if (!remote && !local.cloudDirty) apply({ ...ref.current, cloudDirty: true });
      setStatus("");
    }).catch(() => { if (!cancelled) setStatus("Không tải được cloud. Dữ liệu trên máy vẫn dùng được; hãy thử lại trong Cài đặt → Tài khoản & đồng bộ / Cloud unavailable. Local data is available; retry in Settings → Account & sync."); })
      .finally(() => { busy.current = false; if (!cancelled) setInitialized(true); });
    return () => { cancelled = true; };
  }, [owner, ready]);
  useEffect(() => {
    if (!owner || !initialized || !state.cloudDirty || state.draft || conflict.current) return;
    const timer = setTimeout(() => { if (AppState.currentState === "active") void sync(); }, 1500);
    return () => clearTimeout(timer);
  }, [owner, initialized, state]);
  useEffect(() => {
    if (!owner || !initialized) return;
    const retry = () => { if (AppState.currentState === "active" && ref.current.cloudDirty && !conflict.current) void sync(); };
    const timer = setInterval(retry, 30000);
    const listener = AppState.addEventListener("change", status => { if (status === "active") retry(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [owner, initialized]);
  return { status, sync, pull };
}
