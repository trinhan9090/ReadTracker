// Authenticated, fixed-origin catalog proxy for the web app. No library data is sent.
const origins = new Set(["https://trinhan9090.github.io", "http://localhost:8081", "http://127.0.0.1:8081"]);
const cache = new Map<string,{html:string,until:number}>();
const rates = new Map<string,{count:number,until:number}>();
function allowed(value: string) {
  const u=new URL(value);
  if(u.username || u.password || u.hash || u.href.length>1500)return false;
  if(u.origin==="https://nhanam.vn") return (/^\/[a-z0-9-]+$/.test(u.pathname) && !u.search) || (u.pathname==="/search" && [...u.searchParams.keys()].every(k=>["type","query"].includes(k)));
  if(u.origin==="https://www.nxbtre.com.vn") return (/^\/xem-them\/\d+\.html$/.test(u.pathname) && !u.search) || (u.pathname==="/tim-kiem" && [...u.searchParams.keys()].every(k=>k==="q"));
  return false;
}
Deno.serve(async (req: Request) => {
  const origin=req.headers.get("origin") ?? "";
  const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":origins.has(origin)?origin:"https://trinhan9090.github.io","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
  const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST" || (origin && !origins.has(origin)))return reply(403,{error:"Forbidden"});
  try{
    const authorization=req.headers.get("authorization")??"";
    if(!authorization.startsWith("Bearer "))return reply(401,{error:"Sign in required"});
    const auth=await fetch(Deno.env.get("SUPABASE_URL")+"/auth/v1/user",{headers:{authorization,apikey:Deno.env.get("SUPABASE_ANON_KEY")!},signal:AbortSignal.timeout(8000)});
    if(!auth.ok)return reply(401,{error:"Sign in required"});
    const user=await auth.json();
    const now=Date.now();let rate=rates.get(user.id);if(!rate || rate.until<now)rate={count:0,until:now+60000};
    rate.count++;rates.set(user.id,rate);if(rate.count>40)return reply(429,{error:"Please retry later"});
    const body=await req.text();if(body.length>2000)return reply(413,{error:"Too large"});
    const {url}=JSON.parse(body);if(typeof url!=="string" || !allowed(url))return reply(400,{error:"Invalid catalog URL"});
    const hit=cache.get(url);if(hit && hit.until>now)return reply(200,{html:hit.html});
    const result=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(12000)});
    if(!result.ok)return reply(502,{error:"Catalog unavailable"});
    if(Number(result.headers.get("content-length"))>2500000)return reply(502,{error:"Catalog too large"});
    const reader=result.body!.getReader();let size=0;const chunks:Uint8Array[]=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000){await reader.cancel();return reply(502,{error:"Catalog too large"});}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const html=new TextDecoder().decode(bytes);if(cache.size>100)cache.clear();cache.set(url,{html,until:now+600000});
    if(rates.size>1000)for(const [key,value] of rates)if(value.until<now)rates.delete(key);
    return reply(200,{html});
  }catch{return reply(502,{error:"Catalog unavailable"});}
});
