import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(key + "-count"));
    if (!count) return null;
    const chunks = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(key + "-" + i)));
    return chunks.every((s) => s !== null) ? chunks.join("") : null;
  },
  async setItem(key: string, value: string) {
    const previous = Number(await SecureStore.getItemAsync(key + "-count"));
    const count = Math.ceil(value.length / 1800);
    for (let i = 0; i < count; i++) await SecureStore.setItemAsync(key + "-" + i, value.slice(i * 1800, (i + 1) * 1800));
    await SecureStore.setItemAsync(key + "-count", String(count));
    for (let i = count; i < previous; i++) await SecureStore.deleteItemAsync(key + "-" + i);
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(key + "-count"));
    await SecureStore.deleteItemAsync(key + "-count");
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(key + "-" + i);
  },
};
export const backend = url && key ? createClient(url, key, {
  auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock },
  global: { fetch: async (input, options) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options?.signal?.addEventListener("abort", abort);
    if (options?.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, 15000);
    try { return await fetch(input, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); options?.signal?.removeEventListener("abort", abort); }
  } },
}) : null;
