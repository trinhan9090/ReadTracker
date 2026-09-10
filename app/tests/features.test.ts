import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyGoal, dailyStreak, daySeconds, emptyState, liveSessions, saveSession, validGoal, validateBackup, type Session } from "../src/model.ts";
import { normalizeIsbn, lookupIsbn } from "../src/isbn.ts";
import { suggestedBooks, privateImport } from "../src/model.ts";
const session = (date: string, seconds: number, extra = {}): Session => ({ id: `${date}-${seconds}`, bookId: "b", start: 0, end: 1, seconds, date, note: "", createdAt: 1, ...extra });
const settings = emptyState().settings;
test("blank daily goal requires exactly five accumulated minutes; an unfinished today keeps yesterday's streak", () => {
  assert.equal(dailyGoal(settings), 5);
  const sessions = [session("2026-08-30", 300), session("2026-08-31", 120), session("2026-08-31", 180), session("2026-09-01", 299)];
  assert.equal(dailyStreak(sessions, settings, "2026-09-01"), 2);
  assert.equal(dailyStreak(sessions, settings, "2026-09-02"), 0);
  sessions.push(session("2026-09-01", 1));
  assert.equal(daySeconds(sessions, "2026-09-01"), 300);
  assert.equal(dailyStreak(sessions, settings, "2026-09-01"), 3);
});
test("timer suggests only unread/in-progress books, while private import resets sharing", () => {
  const state = emptyState();
  const base = { title: "Book", author: "Author", total: 100, position: 0, completed: false, reflection: "", createdAt: 1 };
  state.books = [{ ...base, id: "unread" }, { ...base, id: "reading", position: 20 }, { ...base, id: "finished", completed: true }, { ...base, id: "at-end", position: 100 }, { ...base, id: "trash", deletedAt: 1 }];
  assert.deepEqual(suggestedBooks(state.books).map(b => b.id), ["unread", "reading"]);
  state.books[0].visibility = "public";
  state.books[0].reflectionVisibility = "public";
  state.sessions = [session("2026-08-30", 300, { visibility: "public" })];
  const imported = privateImport(state);
  assert.equal(imported.books[0].visibility, "private");
  assert.equal(imported.books[0].reflectionVisibility, "private");
  assert.equal(imported.sessions[0].visibility, "private");
  assert.equal(state.books[0].visibility, "public");
});
test("Vietnamese metadata falls back to Google Books and rejects mismatched editions", async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = (async (url) => String(url).includes("openlibrary") ? new Response("unavailable", { status: 503 }) : new Response(JSON.stringify({ items: [{ volumeInfo: { title: "Tên sách tiếng Việt", authors: ["Tác giả Việt"], pageCount: 120, industryIdentifiers: [{ identifier: "9780140328721" }] } }] }))) as typeof fetch;
    const result = await lookupIsbn("9780140328721", new AbortController().signal);
    assert.equal(result?.title, "Tên sách tiếng Việt");
    assert.equal(result?.total, "120");
    globalThis.fetch = (async (url) => String(url).includes("openlibrary") ? new Response('{"docs":[]}') : new Response(JSON.stringify({ items: [{ volumeInfo: { title: "Wrong edition", industryIdentifiers: [{ identifier: "9786042255035" }] } }] }))) as typeof fetch;
    assert.equal(await lookupIsbn("9780140328721", new AbortController().signal), null);
  } finally { globalThis.fetch = old; }
});
test("20 minute goal recalculates all history, adds sessions and excludes deleted sessions", () => {
  const data = [session("2026-08-30", 300), session("2026-08-31", 700), session("2026-08-31", 500), session("2026-09-01", 1199), session("2026-09-01", 1, { deletedAt: 1 })];
  assert.equal(dailyStreak(data, settings, "2026-09-01"), 3);
  assert.equal(dailyStreak(data, { ...settings, dailyGoalMinutes: 20 }, "2026-09-01"), 1);
  assert.equal(daySeconds(data, "2026-09-01"), 1199);
});
test("below-goal sessions still save and retain session goals through backup", () => {
  const state = emptyState();
  state.books.push({ id: "b", title: "Book", author: "Author", total: 10, position: 0, completed: false, reflection: "", createdAt: 1 });
  state.settings.dailyGoalMinutes = 20;
  const saved = saveSession(state, session("2026-09-01", 600, { goalMinutes: 30 }));
  assert.equal(saved.sessions.length, 1);
  assert.equal(dailyStreak(liveSessions(saved), saved.settings, "2026-09-01"), 0);
  assert.equal(saved.sessions[0].goalMinutes, 30);
  assert.ok(validateBackup(JSON.parse(JSON.stringify(saved))));
  saved.books[0].deletedAt = 1;
  assert.equal(liveSessions(saved).length, 0);
});
test("old backups work and malformed goal or sound settings are rejected", () => {
  assert.ok(validateBackup(emptyState()));
  for (const value of [0, -1, 0.5, 1441, NaN, "20", null]) {
    assert.equal(validGoal(value), false);
    assert.equal(validateBackup({ ...emptyState(), settings: { ...settings, dailyGoalMinutes: value } }), false);
  }
  assert.ok(validGoal(1440));
  assert.equal(validateBackup({ ...emptyState(), settings: { ...settings, soundEnabled: "true" } }), false);
});
test("ISBN accepts valid ISBN10/13 and rejects ordinary EAN and wrong checksums", () => {
  assert.equal(normalizeIsbn("978-0-14-032872-1"), "9780140328721");
  assert.equal(normalizeIsbn("0-8044-2957-x"), "080442957X");
  for (const code of ["9780140328722", "4006381333931", "123", "", "9780140328721x"]) assert.equal(normalizeIsbn(code), null);
});
test("ISBN lookup handles metadata, missing book, failures and abort propagation", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  try {
    globalThis.fetch = (async (url, options) => {
      assert.match(String(url), /isbn=9780140328721/);
      assert.equal(options?.signal, controller.signal);
      return new Response(JSON.stringify({ docs: [{ title: "Book", author_name: ["Writer"], number_of_pages_median: 110 }] }));
    }) as typeof fetch;
    assert.deepEqual(await lookupIsbn("9780140328721", controller.signal), { title: "Book", author: "Writer", total: "110" });
    globalThis.fetch = (async () => new Response('{"docs":[]}')) as typeof fetch;
    assert.equal(await lookupIsbn("9780140328721", controller.signal), null);
    globalThis.fetch = (async () => new Response("", { status: 503 })) as typeof fetch;
    await assert.rejects(lookupIsbn("9780140328721", controller.signal));
    globalThis.fetch = (async () => { throw new Error("Aborted"); }) as typeof fetch;
    await assert.rejects(lookupIsbn("9780140328721", controller.signal));
  } finally { globalThis.fetch = original; }
});
