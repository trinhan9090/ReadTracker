import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVietnameseBook, parseVietnameseResults, loadVietnameseBook, lookupVietnameseIsbn } from "../src/catalog.ts";
import { normalizeIsbn } from "../src/isbn.ts";
const tre = { title: "THẦN THOẠI SISYPHUS", source: "tre" as const, url: "https://www.nxbtre.com.vn/xem-them/146679.html" };
const info = '<ul class="itemDetail-cat"><li><span>Tác giả:</span><a>Albert Camus</a></li><li>Số trang: <span>204</span></li><li>ISBN: <span>978-604-1-20467-6</span></li></ul>';
test("Vietnamese publisher parser preserves edition ISBN and does not confuse it with the supplied sample", () => {
  const book = parseVietnameseBook(info, tre);
  assert.equal(book.author, "Albert Camus"); assert.equal(book.total, "204"); assert.equal(book.isbn, "9786041204676");
  assert.equal(normalizeIsbn("9786041267879"), "9786041267879");
  assert.notEqual(book.isbn, "9786041267879");
});
test("publisher results decode Vietnamese entities and discard untrusted links", () => {
  const html = '<h3 class="pro-title"><a href="/nha-gia-kim-tb-2026">NH&#192; GIẢ KIM</a></h3><h3 class="pro-title"><a href="https://untrusted.invalid">Injected</a></h3>';
  assert.deepEqual(parseVietnameseResults(html, "nhanam"), [{ title: "NHÀ GIẢ KIM", source: "nhanam", url: "https://nhanam.vn/nha-gia-kim-tb-2026" }]);
  assert.throws(() => parseVietnameseResults('<html>Maintenance</html>', "tre"));
  assert.deepEqual(parseVietnameseResults('Không tìm thấy kết quả', "nhanam"), []);
  assert.equal(parseVietnameseBook('<ul class="book-info-detail"><li><span>Tác giả</span><span>Paulo Coelho</span></li><li><span>Số trang</span><span>228</span></li></ul>', { ...tre, source: "nhanam" }).isbn, null);
});
test("catalog rejects forged URLs before fetching and propagates cancellation", async () => {
  await assert.rejects(loadVietnameseBook({ ...tre, url: "https://untrusted.invalid/" }, new AbortController().signal));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(loadVietnameseBook(tre, controller.signal));
});
test("title matches with a different ISBN cannot satisfy an ISBN lookup", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async url => new Response(String(url).includes("nhanam") ? "Không tìm thấy" : String(url).includes("xem-them") ? info : '<a href="/xem-them/146679.html"><img alt="THẦN THOẠI SISYPHUS" /></a>')) as typeof fetch;
    assert.equal(await lookupVietnameseIsbn("9786041267879", new AbortController().signal), null);
    assert.equal((await lookupVietnameseIsbn("9786041204676", new AbortController().signal))?.title, tre.title);
  } finally { globalThis.fetch = original; }
});
