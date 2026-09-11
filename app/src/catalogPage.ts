export async function catalogPage(url: string, signal: AbortSignal) {
  const response=await fetch(url,{signal});
  if(!response.ok)throw Error("Catalog unavailable");
  return response.text();
}
