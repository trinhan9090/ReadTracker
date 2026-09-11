import { createClient } from "@supabase/supabase-js";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
export const backend = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  global: { fetch: async (input, options) => {
    const controller = new AbortController(); const abort = () => controller.abort();
    options?.signal?.addEventListener("abort", abort);
    if (options?.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, 15000);
    try { return await fetch(input, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); options?.signal?.removeEventListener("abort", abort); }
  } },
}) : null;
