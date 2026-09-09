import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clock,
  csv,
  duration,
  emptyState,
  liveSessions,
  parseClock,
  saveSession,
  validateBackup,
  validDate,
  validPages,
  weeklyStreak,
} from "../src/model.ts";
import type { Book, Draft, Session } from "../src/model.ts";
const book: Book = {
  id: "b",
  title: "Sách",
  author: "Tác giả mẫu",
  total: 110,
  position: 0,
  completed: false,
  reflection: "",
  createdAt: 1,
};
const session = (
  id: string,
  start: number,
  end: number,
  date = "2026-08-01",
  createdAt = 1,
): Session => ({
  id,
  bookId: "b",
  start,
  end,
  date,
  seconds: 600,
  note: "Một ý tưởng",
  createdAt,
});
const initial = () => ({ ...emptyState(), books: [{ ...book }] });
test("0 → 98 → 110 completes a 110-page book and retains both sessions", () => {
  let s = saveSession(initial(), session("1", 0, 98));
  assert.equal(s.books[0].position, 98);
  assert.equal(s.books[0].completed, false);
  s = saveSession(s, session("2", 98, 110, "2026-08-02", 2));
  assert.equal(s.books[0].completed, true);
  assert.equal(s.books[0].position, 110);
  assert.equal(
    s.sessions.reduce((n, x) => n + x.end - x.start, 0),
    110,
  );
});
test("rereading updates position without erasing reading history", () => {
  let s = saveSession(initial(), session("1", 0, 98));
  s = saveSession(s, session("2", 40, 50, "2026-08-02", 2));
  assert.equal(s.books[0].position, 50);
  assert.equal(s.sessions.length, 2);
  assert.equal(s.sessions[0].end, 98);
});
test("editing an older session does not move the current position backward", () => {
  let s = saveSession(initial(), session("1", 0, 98));
  s = saveSession(s, session("2", 98, 110, "2026-08-02", 2));
  s = saveSession(s, session("1", 0, 80));
  assert.equal(s.books[0].position, 110);
  assert.equal(s.sessions.length, 2);
  assert.equal(s.sessions[0].end, 80);
});
test("saving the same session twice is idempotent", () => {
  let s = saveSession(initial(), session("1", 0, 98));
  s = saveSession(s, session("1", 0, 98));
  assert.equal(s.sessions.length, 1);
});
test("backdated sessions do not displace current progress", () => {
  let s = saveSession(initial(), session("1", 0, 98, "2026-08-03"));
  s = saveSession(s, session("2", 0, 10, "2026-08-01", 2));
  assert.equal(s.books[0].position, 98);
});
test("trash hides book history and restoring preserves individually deleted sessions", () => {
  let s = saveSession(initial(), session("1", 0, 98));
  s.books[0].deletedAt = 5;
  assert.equal(liveSessions(s).length, 0);
  delete s.books[0].deletedAt;
  assert.equal(liveSessions(s).length, 1);
  s.sessions[0].deletedAt = 6;
  assert.equal(liveSessions(s).length, 0);
});
test("paused timer excludes pauses and clamps backward clock changes", () => {
  const d: Draft = {
    id: "d",
    bookId: "b",
    start: 0,
    elapsed: 10,
    runningSince: 1000,
    checkpoint: 1000,
    date: "2026-08-01",
    end: "0",
    note: "",
  };
  assert.equal(duration(d, 6000), 15);
  assert.equal(duration({ ...d, runningSince: null }, 999999), 10);
  assert.equal(duration(d, 0), 10);
  assert.equal(clock(3661), "01:01:01");
  assert.equal(parseClock("01:01:01"), 3661);
  assert.ok(Number.isNaN(parseClock("01:60:00")));
});
test("weekly streak permits one session per week and grace during current week", () => {
  const list = [
    session("1", 0, 1, "2026-08-17"),
    session("2", 1, 2, "2026-08-24"),
  ];
  assert.equal(weeklyStreak(list, "2026-08-31"), 2);
  assert.equal(weeklyStreak(list, "2026-09-07"), 0);
  assert.equal(weeklyStreak([{ ...list[0], seconds: 0 }], "2026-08-18"), 0);
});
test("page and date validation rejects fractional, out-of-range and impossible values", () => {
  assert.equal(validPages(0, 110, 110), true);
  assert.equal(validPages(110, 98, 110), true);
  assert.equal(validPages(0, 111, 110), false);
  assert.equal(validPages(0, 1.5, 110), false);
  assert.equal(validPages(0, 0, 0), false);
  assert.equal(validPages(0, 0, 1000000), false);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2999-01-01"), false);
});
test("backup round trip preserves Vietnamese notes and validates references", () => {
  const s = saveSession(initial(), session("1", 0, 98));
  const data = JSON.parse(JSON.stringify(s));
  assert.equal(validateBackup(data), true);
  assert.equal(data.sessions[0].note, "Một ý tưởng");
  data.sessions[0].bookId = "missing";
  assert.equal(validateBackup(data), false);
  assert.equal(validateBackup(null), false);
  assert.equal(validateBackup({ ...s, version: 2 }), false);
});
test("malformed backups and duplicate identifiers are rejected", () => {
  const s = initial();
  assert.equal(validateBackup({ ...s, books: [book, book] }), false);
  assert.equal(
    validateBackup({
      ...s,
      books: [{ ...book, cover: "https://example.com/image.jpg" }],
    }),
    false,
  );
  assert.equal(
    validateBackup({ ...s, books: [{ ...book, total: -1 }] }),
    false,
  );
});
test("CSV quotes newlines and formula-like input", () => {
  const s = saveSession(initial(), {
    ...session("1", 0, 98),
    note: '=1+1\n"note"',
  });
  const output = csv(s);
  assert.ok(output.startsWith("\uFEFF"));
  assert.ok(output.includes('"\'=1+1\n""note"""'));
});
