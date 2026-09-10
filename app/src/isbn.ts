export function normalizeIsbn(value: string): string | null {
  const code = value.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(code)) {
    const sum = [...code].reduce((n, ch, i) => n + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
    if (sum % 11 === 0) return code;
  }
  if (/^97[89]\d{10}$/.test(code)) {
    const sum = [...code].reduce((n, ch, i) => n + Number(ch) * (i % 2 ? 3 : 1), 0);
    if (sum % 10 === 0) return code;
  }
  return null;
}

export type IsbnBook = { title: string; author: string; total: string };
export async function lookupIsbn(code: string, signal: AbortSignal): Promise<IsbnBook | null> {
  const isbn = normalizeIsbn(code);
  if (!isbn) throw new Error("Invalid ISBN");
  const response = await fetch(`https://openlibrary.org/search.json?isbn=${isbn}&fields=title,author_name,number_of_pages_median&limit=1`, { signal });
  if (!response.ok) throw new Error("Book lookup unavailable");
  const data = await response.json();
  const book = data?.docs?.[0];
  if (!book || typeof book.title !== "string") return null;
  const pages = book.number_of_pages_median;
  return {
    title: book.title.slice(0, 1000),
    author: Array.isArray(book.author_name) ? book.author_name.filter((a: unknown) => typeof a === "string").join(", ").slice(0, 1000) : "",
    total: Number.isInteger(pages) && pages > 0 && pages <= 999999 ? String(pages) : "",
  };
}
