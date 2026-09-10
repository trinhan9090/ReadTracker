import { backend } from "./backend";
import { validateBackup, type State } from "./model";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
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
export async function pushLibrary(state: State) {
  const books = await Promise.all(state.books.map(async (b) => ({ ...b, cover: b.cover && b.cover.length > 300000 ? await thumbnail(b.cover) : b.cover })));
  const snapshot = { ...state, books, draft: null, cloudRevision: undefined, cloudDirty: undefined };
  const { data, error } = await backend!.rpc("rs_sync", { expected_revision: state.cloudRevision ?? 0, snapshot });
  if (error) throw error;
  return data as number;
}
