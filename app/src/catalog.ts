import { normalizeIsbn, type IsbnBook } from "./isbn.ts";
export type VietnameseSource = "nhanam" | "tre";
export type CatalogResult = { title: string; url: string; source: VietnameseSource };
export type CatalogBook = IsbnBook & { isbn: string | null; url: string; source: VietnameseSource };
const origins = { nhanam: "https://nhanam.vn", tre: "https://www.nxbtre.com.vn" };
function plain(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
    const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
  }).replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, name: string) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " }[name] ?? "")).replace(/\s+/g, " ").trim();
}
export function parseVietnameseResults(html: string, source: VietnameseSource): CatalogResult[] {
  const results: CatalogResult[] = [];
  const pattern = source === "tre"
    ? /<a\b[^>]*href="(\/xem-them\/\d+\.html)"[^>]*>[\s\S]*?<img\b[^>]*alt="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi
    : /<h3\b[^>]*class="pro-title"[^>]*>\s*<a\b[^>]*href="(\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const url = origins[source] + match[1], title = plain(match[2]).slice(0, 1000);
    if (title && !results.some(r => r.url === url)) results.push({ title, url, source });
    if (results.length >= 12) break;
  }
  // Fail explicitly if the site's template changes; do not confuse breakage with no match.
  if (!results.length && !/Không tìm thấy|Có\s*<span[^>]*>0<\/span>/i.test(html)) throw new Error("Catalog format changed");
  return results;
}
export function parseVietnameseBook(html: string, result: CatalogResult): CatalogBook {
  const info = html.match(/<ul\b[^>]*class="(?:itemDetail-cat|book-info-detail)"[^>]*>([\s\S]*?)<\/ul>/i)?.[1];
  if (!info) throw new Error("Missing book metadata");
  const fields = [...info.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m => plain(m[1]));
  const field = (name: string) => fields.find(f => f.startsWith(name))?.slice(name.length).replace(/^\s*:\s*/, "").trim() ?? "";
  const total = field("Số trang");
  return { ...result, author: field("Tác giả").slice(0, 1000), total: /^\d{1,6}$/.test(total) && Number(total) > 0 ? total : "", isbn: normalizeIsbn(field("ISBN")) };
}
async function page(url: string, signal: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal.aborted) throw new Error("Aborted");
  signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Catalog unavailable");
    const html = await response.text();
    if (html.length > 2500000) throw new Error("Unexpected catalog response");
    return html;
  } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
}
export async function searchVietnameseBooks(query: string, source: VietnameseSource, signal: AbortSignal) {
  if (query.trim().length < 2) return [];
  const term = encodeURIComponent(query.trim().slice(0, 100));
  const url = source === "nhanam" ? `${origins.nhanam}/search?type=product&query=${term}` : `${origins.tre}/tim-kiem?q=${term}`;
  return parseVietnameseResults(await page(url, signal), source);
}
export async function loadVietnameseBook(result: CatalogResult, signal: AbortSignal) {
  const parsed = new URL(result.url);
  if (parsed.origin !== origins[result.source] || !/^\/(?:xem-them\/\d+\.html|[a-z0-9-]+)$/.test(parsed.pathname) || parsed.search) throw new Error("Invalid catalog URL");
  return parseVietnameseBook(await page(result.url, signal), result);
}
export async function lookupVietnameseIsbn(isbn: string, signal: AbortSignal): Promise<IsbnBook | null> {
  if (!normalizeIsbn(isbn)) return null;
  // Exact ISBN only: a title result never establishes an edition match.
  const searches = await Promise.allSettled((["nhanam", "tre"] as const).map(source => searchVietnameseBooks(isbn, source, signal)));
  const results = searches.flatMap(r => r.status === "fulfilled" ? r.value.slice(0, 3) : []);
  const books = await Promise.allSettled(results.map(result => loadVietnameseBook(result, signal)));
  if (signal.aborted) throw new Error("Aborted");
  return books.flatMap(r => r.status === "fulfilled" ? [r.value] : []).find(book => book.isbn === isbn) ?? null;
}

