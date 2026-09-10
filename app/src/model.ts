export type Book = {
  id: string;
  title: string;
  author: string;
  total: number;
  position: number;
  completed: boolean;
  reflection: string;
  cover?: string;
  isbn?: string;
  deletedAt?: number;
  createdAt: number;
};
export type Session = {
  id: string;
  bookId: string;
  start: number;
  end: number;
  seconds: number;
  goalMinutes?: number;
  date: string;
  note: string;
  createdAt: number;
  deletedAt?: number;
};
export type Draft = {
  id: string;
  bookId: string;
  start: number;
  elapsed: number;
  runningSince: number | null;
  checkpoint: number;
  date: string;
  end: string;
  note: string;
  editingSeconds?: string;
  finishing?: boolean;
  goalMinutes?: number;
};
export type State = {
  version: 1;
  books: Book[];
  sessions: Session[];
  draft: Draft | null;
  settings: { language: "vi" | "en"; theme: "light" | "dark" | "system"; soundEnabled?: boolean; dailyGoalMinutes?: number };
  lastBookId?: string;
};
export const emptyState = (): State => ({
  version: 1,
  books: [],
  sessions: [],
  draft: null,
  settings: { language: "vi", theme: "system" },
});
export const id = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function duration(d: Draft, now = Date.now()) {
  return Math.max(
    0,
    d.elapsed +
      (d.runningSince === null
        ? 0
        : Math.max(0, Math.floor((now - d.runningSince) / 1000))),
  );
}
export function clock(n: number) {
  n = Math.floor(Math.max(0, n));
  return [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
}
export function parseClock(value: string) {
  const m = /^(\d{1,5}):([0-5]\d):([0-5]\d)$/.exec(value);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : NaN;
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T12:00:00");
  return (
    Number.isFinite(d.getTime()) &&
    localDate(d) === value &&
    value <= localDate()
  );
}
export function validPages(start: number, end: number, total: number) {
  return (
    [start, end, total].every(Number.isInteger) &&
    total >= 1 &&
    total <= 999999 &&
    start >= 0 &&
    end >= 0 &&
    start <= total &&
    end <= total
  );
}
export function saveSession(state: State, session: Session): State {
  const previous = state.sessions.find((x) => x.id === session.id);
  const sessions = previous
    ? state.sessions.map((x) => (x.id === session.id ? session : x))
    : [...state.sessions, session];
  const newest = [...sessions]
    .filter((x) => x.bookId === session.bookId && !x.deletedAt)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
    )[0];
  const updatePosition = newest?.id === session.id;
  return {
    ...state,
    sessions,
    books: state.books.map((b) =>
      b.id === session.bookId && updatePosition
        ? { ...b, position: session.end, completed: session.end === b.total }
        : b,
    ),
    draft: null,
    lastBookId: session.bookId,
  };
}
export function liveSessions(state: State) {
  const ids = new Set(state.books.filter((b) => !b.deletedAt).map((b) => b.id));
  return state.sessions.filter((s) => !s.deletedAt && ids.has(s.bookId));
}
export function weekStart(date: string) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDate(d);
}
export function weeklyStreak(sessions: Session[], today = localDate()) {
  const weeks = new Set(
    sessions.filter((s) => s.seconds > 0).map((s) => weekStart(s.date)),
  );
  let current = weekStart(today),
    count = 0;
  const previous = (date: string) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 7);
    return localDate(d);
  };
  if (!weeks.has(current)) current = previous(current);
  while (weeks.has(current)) {
    count++;
    current = previous(current);
  }
  return count;
}
export function validGoal(minutes: unknown): minutes is number {
  return typeof minutes === "number" && Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440;
}
export function dailyGoal(settings: State["settings"]) {
  return settings.dailyGoalMinutes ?? 5;
}
export function daySeconds(sessions: Session[], date: string) {
  return sessions.filter((s) => !s.deletedAt && s.date === date).reduce((sum, s) => sum + s.seconds, 0);
}
export function dailyStreak(sessions: Session[], settings: State["settings"], today = localDate()) {
  const totals = new Map<string, number>();
  for (const s of sessions) if (!s.deletedAt) totals.set(s.date, (totals.get(s.date) ?? 0) + s.seconds);
  const reached = (date: string) => (totals.get(date) ?? 0) >= dailyGoal(settings) * 60;
  const previous = (date: string) => { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() - 1); return localDate(d); };
  let date = reached(today) ? today : previous(today), count = 0;
  while (reached(date)) { count++; date = previous(date); }
  return count;
}
export function validateBackup(value: unknown): value is State {
  if (!value || typeof value !== "object") return false;
  const s = value as State;
  if (
    s.version !== 1 ||
    !Array.isArray(s.books) ||
    !Array.isArray(s.sessions) ||
    !s.settings ||
    !["vi", "en"].includes(s.settings.language) ||
    !["light", "dark", "system"].includes(s.settings.theme) ||
    s.draft !== null
  )
    return false;
  if (s.settings.soundEnabled !== undefined && typeof s.settings.soundEnabled !== "boolean") return false;
  if (s.settings.dailyGoalMinutes !== undefined && !validGoal(s.settings.dailyGoalMinutes)) return false;
  const ids = new Set<string>();
  for (const b of s.books) {
    if (
      !b ||
      typeof b.id !== "string" ||
      ids.has(b.id) ||
      typeof b.title !== "string" ||
      !b.title.trim() ||
      typeof b.author !== "string" ||
      !b.author.trim() ||
      !validPages(0, b.position, b.total) ||
      typeof b.completed !== "boolean" ||
      typeof b.reflection !== "string" ||
      !Number.isFinite(b.createdAt) ||
      (b.isbn !== undefined && (typeof b.isbn !== "string" || !/^(?:\d{13}|\d{9}[\dX])$/.test(b.isbn))) ||
      (b.cover !== undefined &&
        (typeof b.cover !== "string" ||
          !/^data:image\/(jpeg|png|webp);base64,/.test(b.cover))) ||
      (b.deletedAt !== undefined && !Number.isFinite(b.deletedAt))
    )
      return false;
    ids.add(b.id);
  }
  const sessionIds = new Set<string>();
  for (const x of s.sessions) {
    if (!x || typeof x !== "object") return false;
    const b = s.books.find((b) => b.id === x.bookId);
    if (
      !b ||
      typeof x.id !== "string" ||
      sessionIds.has(x.id) ||
      !validPages(x.start, x.end, 999999) ||
      !Number.isFinite(x.seconds) ||
      x.seconds < 0 ||
      !Number.isInteger(x.seconds) ||
      (x.goalMinutes !== undefined && !validGoal(x.goalMinutes)) ||
      !validDate(x.date) ||
      typeof x.note !== "string" ||
      !Number.isFinite(x.createdAt) ||
      (x.deletedAt !== undefined && !Number.isFinite(x.deletedAt))
    )
      return false;
    sessionIds.add(x.id);
  }
  return true;
}
export function csv(state: State) {
  const cell = (v: unknown) => {
    let text = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      ["date", "book", "author", "start", "end", "pages", "seconds", "note"],
      ...liveSessions(state).map((s) => {
        const b = state.books.find((b) => b.id === s.bookId)!;
        return [
          s.date,
          b.title,
          b.author,
          s.start,
          s.end,
          Math.max(0, s.end - s.start),
          s.seconds,
          s.note,
        ];
      }),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
