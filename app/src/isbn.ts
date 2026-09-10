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
  let available = false;
  const urls = [
    `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,author_name,number_of_pages_median&limit=1`,
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=5`,
  ];
  for (let i = 0; i < urls.length; i++) {
    try {
      if (signal.aborted) throw new Error("Aborted");
      const response = await fetch(urls[i], { signal });
      if (!response.ok) continue;
      const data = await response.json(); available = true;
      const book = i === 0 ? data?.docs?.[0] : data?.items?.find((x: any) => x.volumeInfo?.industryIdentifiers?.some((v: any) => normalizeIsbn(v.identifier ?? "") === isbn))?.volumeInfo;
      if (!book || typeof book.title !== "string") continue;
      const pages = i === 0 ? book.number_of_pages_median : book.pageCount;
      const authors = i === 0 ? book.author_name : book.authors;
      return { title: book.title.slice(0, 1000), author: Array.isArray(authors) ? authors.filter((a: unknown) => typeof a === "string").join(", ").slice(0, 1000) : "", total: Number.isInteger(pages) && pages > 0 && pages <= 999999 ? String(pages) : "" };
    } catch { if (signal.aborted) throw new Error("Aborted"); }
  }
  if (!available) throw new Error("Book lookup unavailable");
  return null;
}
