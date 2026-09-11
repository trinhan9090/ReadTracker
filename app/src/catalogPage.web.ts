import { backend } from "./backend";
export async function catalogPage(url: string, signal: AbortSignal) {
  if(!backend)throw Error("Cloud unavailable");
  const {data:{session}}=await backend.auth.getSession();
  if(!session)throw Error("Sign in required");
  const response=await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL+"/functions/v1/catalog",{method:"POST",headers:{"Content-Type":"application/json",apikey:process.env.EXPO_PUBLIC_SUPABASE_KEY!,Authorization:"Bearer "+session.access_token},body:JSON.stringify({url}),signal});
  if(!response.ok)throw Error("Catalog unavailable");
  const data=await response.json();if(typeof data.html!=="string")throw Error("Invalid catalog response");
  return data.html as string;
}
