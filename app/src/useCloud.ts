import { useEffect, useRef, useState, type RefObject } from "react";
import { type State } from "./model";
import { pullLibrary, pushLibrary } from "./online";
import { persist } from "./storage";
export function useCloud(owner: string | undefined, ready: boolean, state: State, ref: RefObject<State>, setState: (s: State) => void) {
  const [initialized, setInitialized] = useState(false), [status, setStatus] = useState("");
  const active = useRef(true), busy = useRef(false);
  const apply = (s: State) => { if (!active.current) return; persist(s); ref.current = s; setState(s); };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function pull() {
    if (!owner || busy.current || ref.current.draft) return;
    busy.current = true; setStatus("Đang tải cloud / Loading cloud…");
    const before = ref.current;
    try {
      const remote = await pullLibrary(owner);
      if (!active.current) return;
      if (ref.current !== before) { setStatus("Bạn vừa sửa dữ liệu; chưa thay bằng cloud / Local data changed; cloud copy was not applied."); return; }
      if (remote) apply(remote);
      setInitialized(true); setStatus(remote ? "Đã tải bản cloud / Cloud copy loaded" : "Cloud chưa có dữ liệu / No cloud copy yet");
    } catch { if (active.current) setStatus("Không tải được cloud. Dữ liệu trên máy được giữ / Cloud unavailable; local data kept."); }
    finally { busy.current = false; }
  }
  async function sync() {
    if (!owner || busy.current || ref.current.draft || !active.current) return;
    busy.current = true; setStatus("Đang đồng bộ / Syncing…");
    const snapshot = ref.current;
    try {
      const revision = await pushLibrary(snapshot);
      if (!active.current) return;
      apply({ ...ref.current, cloudRevision: revision, cloudDirty: ref.current !== snapshot });
      setStatus("Đã đồng bộ / Synced");
    } catch (error) {
      if (active.current) setStatus(String((error as { message?: string }).message).includes("RS_CONFLICT")
        ? "Cloud có bản mới hơn. Xuất JSON để giữ thay đổi trên máy, rồi tải bản cloud / Newer cloud copy; export local JSON before loading it."
        : "Chưa đồng bộ. Người khác vẫn thấy bản public cũ; kết nối mạng và bấm Đồng bộ ngay / Not synced; others see the previous public copy. Retry online.");
    } finally { busy.current = false; }
  }
  useEffect(() => {
    if (!owner || !ready) return;
    let cancelled = false;
    const local = ref.current;
    void pullLibrary(owner).then((remote) => {
      if (cancelled) return;
      if (!local.cloudDirty && !local.draft && ref.current === local && remote) apply(remote);
      else if (!remote && !local.cloudDirty) apply({ ...ref.current, cloudDirty: true });
      setStatus("Cloud sẵn sàng / Cloud ready");
    }).catch(() => { if (!cancelled) setStatus("Ngoại tuyến: dữ liệu vẫn lưu trên máy / Offline: data stays on this device"); })
      .finally(() => { if (!cancelled) setInitialized(true); });
    return () => { cancelled = true; };
  }, [owner, ready]);
  useEffect(() => {
    if (!owner || !initialized || !state.cloudDirty || state.draft) return;
    const timer = setTimeout(() => { void sync(); }, 1500);
    return () => clearTimeout(timer);
  }, [owner, initialized, state]);
  return { status, sync, pull };
}
