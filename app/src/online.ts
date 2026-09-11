import { backend } from "./backend";
import { validateBackup, type State } from "./model";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { SyncOperation, SyncConflict } from "./sync";
export type Profile = { id: string; name: string; avatar: string | null; featured: string[] };
export type PublicBook = { owner: string; id: string; title: string; author: string; total: number; position: number; completed: boolean; cover?: string; reflection: string; isbn?: string };
export type PublicNote = { id: string; book_id: string; note: string; date: string };
export type Friend = { sender: string; recipient: string; accepted: boolean };
export async function thumbnail(uri: string) {
  const result = await manipulateAsync(uri, [{ resize: { width: 240 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}
export async function pullLibrary(owner: string) {
  const { data, error } = await backend!.from("rs_libraries").select("payload,revision").eq("owner", owner).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!validateBackup(data.payload)) throw new Error("Invalid cloud backup");
  return { ...data.payload, cloudRevision: data.revision, cloudDirty: false } as State;
}
export async function applyOperations(owner: string, operations: SyncOperation[]) {
  const { data, error } = await backend!.rpc("rs_apply_ops", { expected_owner: owner, operations });
  if (error) throw error;
  if (!data || !validateBackup(data.library) || !Array.isArray(data.accepted) || !Array.isArray(data.conflicts)) throw new Error("Invalid sync response");
  return { remote: { ...data.library, draft: null, cloudRevision: data.revision, cloudDirty: false } as State,
    accepted: data.accepted as string[], conflicts: data.conflicts as (SyncConflict & { reason?: string })[] };
}

export type PublicReading = { id: string; book_id: string; date: string; seconds: number; start_page: number; end_page: number; note: string };
