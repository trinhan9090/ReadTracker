import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Linking,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import {
  type Book,
  type Session,
  type State,
  clock,
  csv,
  duration,
  emptyState,
  id,
  liveSessions,
  localDate,
  parseClock,
  saveSession,
  validDate,
  validPages,
  validateBackup,
  dailyStreak,
  dailyGoal,
  daySeconds,
  validGoal,
} from "./model";
import { IsbnTools } from "./IsbnTools";
import { normalizeIsbn } from "./isbn";
import { Pressable, SoundProvider } from "./sound";
import { load, persist } from "./storage";
import { Button, Field, Cover, light, dark, styles } from "./ui";

function Main() {
  const [state, setState] = useState<State>(emptyState);
  const ref = useRef(state);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState("");
  const [tab, setTab] = useState<"sessions" | "books" | "settings">("sessions");
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState("");
  const [modal, setModal] = useState<
    null | "book" | "start" | "finish" | "detail" | "manual" | "trash"
  >(null);
  const [bookId, setBookId] = useState("");
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    total: "",
    position: "0",
    cover: "",
    isbn: "",
    completed: false,
    reflection: "",
  });
  const [sessionForm, setSessionForm] = useState({
    id: "",
    bookId: "",
    start: "0",
    end: "0",
    time: "00:00:00",
    date: localDate(),
    note: "",
  });
  const [sessionGoal, setSessionGoal] = useState("20");
  const [dailyInput, setDailyInput] = useState("");
  useEffect(() => { setDailyInput(state.settings.dailyGoalMinutes === undefined ? "" : String(state.settings.dailyGoalMinutes)); }, [state.settings.dailyGoalMinutes]);
  const [start, setStart] = useState("0");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [historyBook, setHistoryBook] = useState("");
  const system = useColorScheme();
  const c =
    state.settings.theme === "dark" ||
    (state.settings.theme === "system" && system === "dark")
      ? dark
      : light;
  const t = (vi: string, en: string) =>
    state.settings.language === "vi" ? vi : en;
  const message = (body: string) => Alert.alert("ReadSession", body);
  function commit(next: State) {
    try {
      persist(next);
      ref.current = next;
      setState(next);
      return true;
    } catch {
      message(
        t(
          "Không thể lưu. Hãy thử lại; dữ liệu đang nhập vẫn được giữ.",
          "Could not save. Please retry; your input is still here.",
        ),
      );
      return false;
    }
  }
  useEffect(() => {
    try {
      let s = load();
      if (s.draft) {
        s = {
          ...s,
          draft: {
            ...s.draft,
            elapsed: duration(s.draft, s.draft.checkpoint),
            runningSince: null,
          },
        };
        persist(s);
        Alert.alert(
          "ReadSession",
          s.settings.language === "vi"
            ? "Đã khôi phục và tạm dừng phiên bị gián đoạn. Hãy kiểm tra thời gian trước khi lưu."
            : "Your interrupted session was restored and paused. Check its duration before saving.",
        );
      }
      ref.current = s;
      setState(s);
      setSelected(s.lastBookId ?? "");
      setReady(true);
    } catch {
      setFatal("Không thể mở dữ liệu / Unable to open local data.");
    }
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const s = ref.current;
      if (s.draft?.runningSince && n - s.draft.checkpoint >= 5000) {
        const next = { ...s, draft: { ...s.draft, checkpoint: n } };
        try {
          persist(next);
          ref.current = next;
        } catch {
          /* Retry without discarding the draft. */
        }
      }
    }, 1000);
    const sub = AppState.addEventListener("change", (status) => {
      const s = ref.current;
      if (status !== "active" && s.draft) {
        const next = { ...s, draft: { ...s.draft, checkpoint: Date.now() } };
        try {
          persist(next);
          ref.current = next;
        } catch {}
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const books = state.books.filter((b) => !b.deletedAt);
  const chosen = books.find((b) => b.id === selected) ?? books[0];
  const draft = state.draft;
  const readingBook = books.find((b) => b.id === draft?.bookId);
  const detail = state.books.find((b) => b.id === bookId);
  const sessions = liveSessions(state);
  const today = localDate(new Date(now));
  const todaySeconds = daySeconds(sessions, today);
  const targetSeconds = dailyGoal(state.settings) * 60;
  const monthly = sessions.filter((s) => s.date.startsWith(month));
  const shown = monthly
    .filter((s) => !historyBook || s.bookId === historyBook)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const confirm = (body: string, action: () => void) =>
    Alert.alert(t("Xác nhận", "Confirm"), body, [
      { text: t("Hủy", "Cancel"), style: "cancel" },
      { text: t("Đồng ý", "Confirm"), onPress: action },
    ]);
  function closeModal() {
    if (modal === "book" || modal === "manual") {
      confirm(t("Đóng và bỏ các thay đổi chưa lưu?", "Close and discard unsaved changes?"), () => setModal(null));
    } else setModal(null);
  }
  const openBook = (b?: Book) => {
    setBookId(b?.id ?? id());
    setBookForm({
      title: b?.title ?? "",
      author: b?.author ?? "",
      total: String(b?.total ?? ""),
      position: String(b?.position ?? 0),
      cover: b?.cover ?? "",
      isbn: b?.isbn ?? "",
      completed: b?.completed ?? false,
      reflection: b?.reflection ?? "",
    });
    setModal("book");
  };
  function storeBook() {
    const total = Number(bookForm.total),
      position = Number(bookForm.position);
    if (
      !bookForm.title.trim() ||
      !bookForm.author.trim() ||
      !bookForm.total.trim() ||
      !validPages(0, position, total)
    ) {
      message(
        t(
          "Nhập tên, tác giả, số trang 1–999999 và tiến độ trong phạm vi sách.",
          "Enter a title, author, 1–999999 total pages and a valid position.",
        ),
      );
      return;
    }
    if (draft?.bookId === bookId) {
      message(
        t(
          "Kết thúc phiên trước khi sửa sách này.",
          "Finish the current session before editing this book.",
        ),
      );
      return;
    }
    const isbn = bookForm.isbn.trim() ? normalizeIsbn(bookForm.isbn) : undefined;
    if (isbn === null) { message(t("ISBN không hợp lệ.", "Invalid ISBN.")); return; }
    const old = state.books.find((b) => b.id === bookId);
    const b: Book = {
      ...old,
      id: old?.id ?? bookId,
      title: bookForm.title.trim(),
      author: bookForm.author.trim(),
      total,
      position,
      cover: bookForm.cover || undefined,
      isbn,
      completed: bookForm.completed || position === total,
      reflection: bookForm.reflection,
      createdAt: old?.createdAt ?? Date.now(),
    };
    if (
      commit({
        ...ref.current,
        books: old
          ? state.books.map((x) => (x.id === b.id ? b : x))
          : [...state.books, b],
      })
    ) {
      setSelected(b.id);
      setModal(null);
    }
  }
  async function pickCover(camera = false) {
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("ReadSession", t("Cho phép camera để chụp ảnh bìa. Bạn vẫn có thể chọn ảnh có sẵn.", "Allow camera access to take a cover photo. You can still choose an existing image."), [
            { text: t("Đóng", "Close"), style: "cancel" },
            { text: t("Mở cài đặt", "Open settings"), onPress: () => { void Linking.openSettings(); } },
          ]);
          return;
        }
      }
      const launch = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const r = await launch({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.5,
        base64: true,
      });
      if (!r.canceled && r.assets[0].base64) {
        const a = r.assets[0];
        if (a.base64!.length > 5_000_000) {
          message(
            t("Chọn ảnh nhỏ hơn 4 MB.", "Choose an image smaller than 4 MB."),
          );
          return;
        }
        setBookForm((f) => ({
          ...f,
          cover: `data:${a.mimeType === "image/png" ? "image/png" : "image/jpeg"};base64,${a.base64}`,
        }));
      }
    } catch {
      message(
        t(
          "Không mở được ảnh. Bạn vẫn có thể thêm sách không có bìa.",
          "Could not open the image. You can still add a book without a cover.",
        ),
      );
    }
  }
  function begin() {
    if (!chosen || ref.current.draft) return;
    const goal = sessionGoal.trim() ? Number(sessionGoal) : undefined;
    if (goal !== undefined && !validGoal(goal)) { message(t("Mục tiêu cần là số phút nguyên từ 1 đến 1440, hoặc để trống.", "Goal must be 1–1440 whole minutes, or blank.")); return; }
    const n = Number(start);
    if (!start.trim() || !validPages(n, n, chosen.total)) {
      message(t("Mốc bắt đầu không hợp lệ.", "Invalid start position."));
      return;
    }
    const action = () => {
      if (ref.current.draft) return;
      const stamp = Date.now();
      if (
        commit({
          ...ref.current,
          lastBookId: chosen.id,
          draft: {
            id: id(),
            bookId: chosen.id,
            start: n,
            elapsed: 0,
            goalMinutes: goal,
            runningSince: stamp,
            checkpoint: stamp,
            date: localDate(),
            end: String(n),
            note: "",
          },
        })
      )
        setModal(null);
    };
    if (n !== chosen.position)
      confirm(
        t(
          "Vị trí khác lần trước. Lịch sử cũ vẫn được giữ. Tiếp tục?",
          "This differs from the previous position. Existing history is kept. Continue?",
        ),
        action,
      );
    else action();
  }
  function pause() {
    const d = ref.current.draft;
    if (!d) return;
    const stamp = Date.now();
    commit({
      ...ref.current,
      draft: {
        ...d,
        elapsed: duration(d, stamp),
        runningSince: d.runningSince === null ? stamp : null,
        checkpoint: stamp,
        editingSeconds: undefined,
      },
    });
  }
  function finish() {
    const d = ref.current.draft;
    if (!d) return;
    const stamp = Date.now();
    if (
      commit({
        ...ref.current,
        draft: {
          ...d,
          elapsed: duration(d, stamp),
          runningSince: null,
          checkpoint: stamp,
          finishing: true,
        },
      })
    )
      setModal("finish");
  }
  function patchDraft(p: Partial<NonNullable<State["draft"]>>) {
    if (ref.current.draft)
      commit({ ...ref.current, draft: { ...ref.current.draft, ...p } });
  }
  function storeSession(manual: boolean) {
    const d = ref.current.draft;
    const f = manual ? sessionForm : null;
    if (!manual && !d) return;
    const b = books.find((b) => b.id === (f?.bookId ?? d?.bookId));
    if (!b) return;
    const startValue = f ? Number(f.start) : d!.start,
      end = Number(f?.end ?? d!.end),
      seconds = parseClock(f?.time ?? d!.editingSeconds ?? clock(d!.elapsed)),
      date = f?.date ?? d!.date;
    if (
      !(f?.end ?? d!.end).trim() ||
      (f && !f.start.trim()) ||
      !validPages(startValue, end, b.total) ||
      !Number.isFinite(seconds) ||
      !validDate(date)
    ) {
      message(
        t(
          "Kiểm tra số trang, thời gian HH:MM:SS và ngày YYYY-MM-DD không ở tương lai.",
          "Check pages, HH:MM:SS duration and a valid YYYY-MM-DD date not in the future.",
        ),
      );
      return;
    }
    const old = f?.id ? state.sessions.find((s) => s.id === f.id) : undefined;
    const s: Session = {
      id: f?.id || d?.id || id(),
      bookId: b.id,
      start: startValue,
      end,
      seconds,
      goalMinutes: manual ? old?.goalMinutes : d?.goalMinutes,
      date,
      note: f?.note ?? d!.note,
      createdAt: old?.createdAt ?? Date.now(),
    };
    const action = () => {
      if (!manual && ref.current.draft?.id !== s.id) return;
      if (commit(saveSession(ref.current, s))) setModal(null);
    };
    if (end <= startValue || seconds < 30)
      confirm(
        t(
          "Phiên không có trang mới hoặc dưới 30 giây. Vẫn lưu?",
          "This session has no new pages or is under 30 seconds. Save anyway?",
        ),
        action,
      );
    else action();
  }
  function manual(s?: Session) {
    if (draft) {
      message(
        t(
          "Kết thúc phiên đang chạy trước khi nhập hoặc sửa phiên khác.",
          "Finish your active session before adding or editing another.",
        ),
      );
      return;
    }
    if (!chosen && !s) {
      message(t("Thêm sách trước.", "Add a book first."));
      return;
    }
    setSessionForm({
      id: s?.id ?? id(),
      bookId: s?.bookId ?? chosen!.id,
      start: String(s?.start ?? chosen!.position),
      end: String(s?.end ?? chosen!.position),
      time: clock(s?.seconds ?? 0),
      date: s?.date ?? localDate(),
      note: s?.note ?? "",
    });
    setModal("manual");
  }
  async function exportData(format: "json" | "csv") {
    if (draft) {
      message(
        t(
          "Kết thúc phiên trước khi xuất.",
          "Finish your session before exporting.",
        ),
      );
      return;
    }
    try {
      const f = new File(Paths.cache, `ReadSession-${localDate()}.${format}`);
      f.create({ overwrite: true });
      f.write(
        format === "csv"
          ? csv(state)
          : JSON.stringify({ ...state, draft: null }, null, 2),
      );
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(f.uri, {
          mimeType: format === "csv" ? "text/csv" : "application/json",
        });
      else
        message(
          t(
            "Thiết bị không hỗ trợ chia sẻ tệp.",
            "File sharing is unavailable.",
          ),
        );
    } catch {
      message(
        t(
          "Không xuất được dữ liệu. Hãy thử lại.",
          "Could not export data. Please retry.",
        ),
      );
    }
  }
  async function importData() {
    if (draft) {
      message(
        t(
          "Kết thúc phiên trước khi khôi phục.",
          "Finish your session before restoring.",
        ),
      );
      return;
    }
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (r.canceled) return;
      const f = new File(r.assets[0].uri);
      if (f.size > 30_000_000) {
        message(
          t(
            "Bản sao lưu vượt giới hạn 30 MB của bản draft.",
            "The backup exceeds this draft’s 30 MB limit.",
          ),
        );
        return;
      }
      const data: unknown = JSON.parse(await f.text());
      if (!validateBackup(data)) {
        message(
          t(
            "Tệp không phải bản sao lưu ReadSession hợp lệ.",
            "This is not a valid ReadSession backup.",
          ),
        );
        return;
      }
      confirm(
        t(
          "Thay thế toàn bộ dữ liệu hiện tại? Hãy sao lưu trước khi tiếp tục.",
          "Replace all current data? Export a backup first.",
        ),
        () => {
          if (commit(data)) {
            setSelected(data.lastBookId ?? "");
            message(t("Đã khôi phục.", "Backup restored."));
          }
        },
      );
    } catch {
      message(
        t(
          "Không đọc được bản sao lưu. Dữ liệu hiện tại được giữ nguyên.",
          "Could not read the backup. Current data was kept.",
        ),
      );
    }
  }
  function trashBook(b: Book) {
    if (draft?.bookId === b.id) {
      message(
        t(
          "Kết thúc phiên của sách trước.",
          "Finish this book’s session first.",
        ),
      );
      return;
    }
    confirm(
      t(
        "Chuyển sách và lịch sử liên quan vào Thùng rác?",
        "Move this book and its history to Trash?",
      ),
      () => {
        if (
          commit({
            ...ref.current,
            books: state.books.map((x) =>
              x.id === b.id ? { ...x, deletedAt: Date.now() } : x,
            ),
          })
        )
          setModal(null);
      },
    );
  }
  const label = (vi: string, en: string, size = 14) => (
    <Text style={{ color: c.muted, fontSize: size, lineHeight: size + 7 }}>
      {t(vi, en)}
    </Text>
  );
  const heading = (vi: string, en: string) => (
    <Text style={[styles.heading, { color: c.ink }]}>{t(vi, en)}</Text>
  );
  const card = (children: React.ReactNode) => (
    <View
      style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}
    >
      {children}
    </View>
  );
  const bookRow = (b: Book, action: () => void) => (
    <Pressable
      key={b.id}
      accessibilityRole="button"
      onPress={action}
      style={[styles.bookRow, { borderColor: c.line }]}
    >
      <Cover book={b} c={c} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: c.ink, fontSize: 16, fontWeight: "700" }}>
          {b.title}
        </Text>
        <Text style={{ color: c.muted, fontSize: 12 }}>{b.author}</Text>
        <View style={{ height: 4, backgroundColor: c.soft, borderRadius: 3 }}>
          <View
            style={{
              height: 4,
              width: `${Math.min(100, (b.position / b.total) * 100)}%`,
              backgroundColor: c.green,
              borderRadius: 3,
            }}
          />
        </View>
        <Text
          style={{
            color: b.completed ? c.green : b.position ? "#A77C1E" : c.muted,
            fontSize: 12,
          }}
        >
          {b.position} / {b.total} ·{" "}
          {b.completed
            ? t("Đã xong", "Finished")
            : b.position
              ? t("Đang đọc", "Reading")
              : t("Chưa đọc", "Unread")}
        </Text>
      </View>
    </Pressable>
  );
  const historyRow = (s: Session) => (
    <Pressable
      key={s.id}
      onPress={() => manual(s)}
      accessibilityRole="button"
      style={[styles.history, { borderColor: c.line }]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ color: c.ink, fontWeight: "700", flex: 1 }}>
          {state.books.find((b) => b.id === s.bookId)?.title}
        </Text>
        <Text style={{ color: c.green, fontWeight: "700" }}>
          {clock(s.seconds)}
        </Text>
      </View>
      <Text style={{ color: c.muted, fontSize: 12 }}>
        {s.date} · {s.start} → {s.end} · {Math.max(0, s.end - s.start)}{" "}
        {t("trang", "pages")}
      </Text>
      {!!s.note && (
        <Text numberOfLines={2} style={{ color: c.muted, lineHeight: 20 }}>
          {s.note}
        </Text>
      )}
      {s.goalMinutes !== undefined && <Text style={{ color: c.green, fontSize: 12 }}>{t("Mục tiêu phiên", "Session goal")}: {s.goalMinutes} {t("phút", "min")} · {s.seconds >= s.goalMinutes * 60 ? t("Đã đạt", "Reached") : t("Chưa đạt", "Not reached")}</Text>}
    </Pressable>
  );
  if (!ready)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 30,
          backgroundColor: c.bg,
        }}
      >
        <Text style={{ color: c.ink }}>{fatal || "ReadSession…"}</Text>
      </SafeAreaView>
    );
  return (
    <SoundProvider enabled={state.settings.soundEnabled ?? false}>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={c === dark ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.green,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 2,
            }}
          >
            READSESSION
          </Text>
          <Text
            style={{
              color: c.ink,
              fontSize: 26,
              fontFamily: "serif",
              marginTop: 5,
            }}
          >
            {tab === "sessions"
              ? t("Một chút thời gian cho sách", "A little time for a book")
              : tab === "books"
                ? t("Tủ sách của bạn", "Your bookshelf")
                : t("Theo cách của bạn", "Make it yours")}
          </Text>
        </View>
        <Text style={{ color: c.green, padding: 8 }}>0.2</Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingTop: 0,
          paddingBottom: 32,
          gap: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "sessions" && (
          <>
            {card(
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  {label(
                    draft ? "PHIÊN ĐỌC HIỆN TẠI" : "KHOẢNG LẶNG CỦA BẠN",
                    draft ? "CURRENT SESSION" : "YOUR QUIET MOMENT",
                    11,
                  )}
                  {draft &&
                    label(
                      draft.runningSince ? "Đang đọc" : "Tạm dừng",
                      draft.runningSince ? "Reading" : "Paused",
                      11,
                    )}
                </View>
                <Text
                  style={{
                    fontSize: 46,
                    fontVariant: ["tabular-nums"],
                    color: c.ink,
                    textAlign: "center",
                    marginVertical: 24,
                    fontWeight: "300",
                  }}
                >
                  {clock(draft ? duration(draft, now) : 0)}
                </Text>
                {draft?.goalMinutes !== undefined && <Text accessibilityLiveRegion="polite" style={{ color: c.green, textAlign: "center" }}>
                  {duration(draft, now) >= draft.goalMinutes * 60
                    ? t("✓ Đã đạt mục tiêu phiên · Bạn có thể tiếp tục đọc", "✓ Session goal reached · Keep reading if you like")
                    : `${t("Còn", "Remaining")} ${clock(draft.goalMinutes * 60 - duration(draft, now))}`}
                  {` · ${draft.goalMinutes} ${t("phút", "min")}`}
                </Text>}
                {(readingBook ?? chosen)
                  ? bookRow((readingBook ?? chosen)!, () => {
                      if (!draft) {
                        setBookId(chosen!.id);
                        setModal("detail");
                      }
                    })
                  : label(
                      "Thêm cuốn sách đầu tiên để bắt đầu.",
                      "Add your first book to get started.",
                    )}
                {draft ? (
                  <>
                    <Button
                      label={
                        draft.runningSince
                          ? t("Tạm dừng", "Pause")
                          : t("Tiếp tục", "Resume")
                      }
                      onPress={pause}
                      c={c}
                      secondary
                    />
                    <Button
                      label={t("Kết thúc phiên", "Finish session")}
                      onPress={finish}
                      c={c}
                    />
                  </>
                ) : (
                  <Button
                    label={
                      chosen
                        ? t("Bắt đầu đọc", "Start reading")
                        : t("Thêm sách đầu tiên", "Add your first book")
                    }
                    onPress={() => {
                      if (chosen) {
                        setStart(String(chosen.position));
                        setModal("start");
                      } else openBook();
                    }}
                    c={c}
                  />
                )}
                {!draft && books.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingTop: 8 }}
                  >
                    {books.map((b) => (
                      <Pressable
                        key={b.id}
                        onPress={() => setSelected(b.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              chosen?.id === b.id ? c.soft : c.bg,
                          },
                        ]}
                      >
                        <Text style={{ color: c.ink }}>{b.title}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>,
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                [
                  `${(monthly.reduce((n, s) => n + s.seconds, 0) / 3600).toFixed(1)}`,
                  t("giờ trong tháng", "hours this month"),
                ],
                [
                  String(
                    monthly.reduce(
                      (n, s) => n + Math.max(0, s.end - s.start),
                      0,
                    ),
                  ),
                  t("trang trong tháng", "pages this month"),
                ],
                [
                  String(dailyStreak(sessions, state.settings, today)),
                  t("ngày liên tiếp", "day streak"),
                ],
              ].map(([value, name]) => (
                <View
                  key={name}
                  style={[styles.stat, { backgroundColor: c.soft }]}
                >
                  <Text
                    style={{ color: c.green, fontSize: 25, fontWeight: "700" }}
                  >
                    {value}
                  </Text>
                  <Text
                    style={{
                      color: c.muted,
                      fontSize: 11,
                      textAlign: "center",
                    }}
                  >
                    {name}
                  </Text>
                </View>
              ))}
            </View>
            {card(<>
              {heading("Mục tiêu hôm nay", "Today's goal")}
              <Text style={{ color: c.ink, fontSize: 22 }}>{clock(todaySeconds)} / {dailyGoal(state.settings)} {t("phút", "min")}</Text>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.soft }}><View style={{ height: 8, borderRadius: 4, backgroundColor: c.green, width: `${Math.min(100, todaySeconds / targetSeconds * 100)}%` }} /></View>
              {label(todaySeconds >= targetSeconds ? "✓ Đã đạt mục tiêu ngày" : "Chưa đạt · Cộng các phiên đã lưu trong hôm nay", todaySeconds >= targetSeconds ? "✓ Daily goal reached" : "Not reached · Counts today's saved sessions")}
            </>)}
            {heading("Nhịp đọc trong tháng", "This month’s rhythm")}
            <View
              style={{
                flexDirection: "row",
                height: 70,
                alignItems: "flex-end",
                gap: 3,
              }}
            >
              {Array.from({ length: 31 }, (_, i) => {
                const sec = monthly
                  .filter((s) => Number(s.date.slice(8)) === i + 1)
                  .reduce((n, s) => n + s.seconds, 0);
                const max = Math.max(
                  1,
                  ...Array.from({ length: 31 }, (_, j) =>
                    monthly
                      .filter((s) => Number(s.date.slice(8)) === j + 1)
                      .reduce((n, s) => n + s.seconds, 0),
                  ),
                );
                return (
                  <View
                    key={i}
                    accessibilityLabel={`${i + 1}: ${clock(sec)}`}
                    style={{
                      flex: 1,
                      height: Math.max(3, (sec / max) * 65),
                      backgroundColor: sec >= targetSeconds ? c.green : sec ? c.muted : c.line,
                      borderRadius: 3,
                    }}
                  />
                );
              })}
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {label("Ngày 1", "Day 1", 11)}
              {label("Xanh: đạt mục tiêu · Xám: chưa đạt", "Green: goal reached · Gray: below goal", 11)}
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {heading("Lịch sử phiên", "Session history")}
              <Pressable onPress={() => manual()}>
                <Text style={{ color: c.green, fontWeight: "700" }}>
                  {t("+ Nhập tay", "+ Add session")}
                </Text>
              </Pressable>
            </View>
            <Field
              c={c}
              label={t("Lọc tháng YYYY-MM", "Month YYYY-MM")}
              value={month}
              onChange={setMonth}
              placeholder="2026-09"
            />
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              <Pressable
                onPress={() => setHistoryBook("")}
                style={[
                  styles.chip,
                  { backgroundColor: !historyBook ? c.soft : c.card },
                ]}
              >
                <Text style={{ color: c.ink }}>{t("Tất cả", "All")}</Text>
              </Pressable>
              {books.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => setHistoryBook(b.id)}
                  style={[
                    styles.chip,
                    { backgroundColor: historyBook === b.id ? c.soft : c.card },
                  ]}
                >
                  <Text style={{ color: c.ink }}>{b.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {shown.length
              ? card(shown.map(historyRow))
              : label(
                  "Chưa có phiên đọc trong khoảng này.",
                  "No sessions in this period.",
                )}
          </>
        )}
        {tab === "books" && (
          <>
            <Button
              label={t("+ Thêm sách", "+ Add book")}
              c={c}
              onPress={() => openBook()}
            />
            <Field
              c={c}
              label={t("Tìm sách hoặc tác giả", "Search title or author")}
              value={search}
              onChange={setSearch}
            />
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              {[
                ["all", "Tất cả", "All"],
                ["unread", "Chưa đọc", "Unread"],
                ["reading", "Đang đọc", "Reading"],
                ["finished", "Đã xong", "Finished"],
              ].map(([key, vi, en]) => (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[
                    styles.chip,
                    { backgroundColor: filter === key ? c.soft : c.card },
                  ]}
                >
                  <Text style={{ color: c.ink }}>{t(vi, en)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {card(
              books
                .filter(
                  (b) =>
                    (b.title + " " + b.author)
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()) &&
                    (filter === "all" ||
                      (filter === "finished" && b.completed) ||
                      (filter === "unread" && !b.completed && !b.position) ||
                      (filter === "reading" && !b.completed && b.position > 0)),
                )
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((b) =>
                  bookRow(b, () => {
                    setBookId(b.id);
                    setModal("detail");
                  }),
                ),
            )}
            {!books.length &&
              label(
                "Tủ sách đang trống. Hãy thêm một cuốn bạn muốn đọc.",
                "Your shelf is empty. Add a book you’d like to read.",
              )}
          </>
        )}
        {tab === "settings" && (
          <>
            {heading("Mục tiêu đọc", "Reading goals")}
            {card(<>
              <Field c={c} numeric label={t("Mục tiêu ngày (phút)", "Daily goal (minutes)")} value={dailyInput} onChange={setDailyInput} placeholder={t("Để trống: 5 phút", "Blank: 5 minutes")} />
              {label("Cộng tất cả phiên trong ngày. Để trống tương đương 5 phút. Đổi mục tiêu sẽ tính lại toàn bộ chuỗi theo mục tiêu hiện tại; phiên chưa đạt vẫn được lưu.", "Adds all sessions per day. Blank means 5 minutes. Changing this recalculates all streak history using the current goal; shorter sessions are still saved.")}
              <Button c={c} label={t("Lưu mục tiêu ngày", "Save daily goal")} onPress={() => {
                const minutes = dailyInput.trim() ? Number(dailyInput) : undefined;
                if (minutes !== undefined && !validGoal(minutes)) { message(t("Nhập số phút nguyên từ 1 đến 1440, hoặc để trống.", "Enter 1–1440 whole minutes, or leave blank.")); return; }
                if (commit({ ...ref.current, settings: { ...ref.current.settings, dailyGoalMinutes: minutes } })) message(t("Đã lưu và tính lại chuỗi ngày.", "Saved and recalculated your daily streak."));
              }} />
            </>)}
            {heading("Âm thanh", "Sound")}
            {card(<>
              <Button c={c} secondary label={(state.settings.soundEnabled ? "✓ " : "") + t("Âm thanh khi bấm nút", "Button sounds")} onPress={() => commit({ ...ref.current, settings: { ...ref.current.settings, soundEnabled: !ref.current.settings.soundEnabled } })} />
              {label("Âm thanh ngắn, nhẹ. Mặc định tắt; khi bật, dùng âm lượng đa phương tiện của điện thoại.", "A short, gentle tap. Off by default; uses the phone's media volume when enabled.")}
            </>)}
            {heading("Hiển thị", "Appearance")}
            {card(
              <>
                {label("Ngôn ngữ", "Language")}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["vi", "en"] as const).map((lang) => (
                    <Button
                      key={lang}
                      label={
                        (state.settings.language === lang ? "✓ " : "") +
                        (lang === "vi" ? "Tiếng Việt" : "English")
                      }
                      c={c}
                      secondary
                      onPress={() =>
                        commit({
                          ...ref.current,
                          settings: { ...state.settings, language: lang },
                        })
                      }
                    />
                  ))}
                </View>
                {label("Giao diện", "Theme")}
                {(["system", "light", "dark"] as const).map((theme, i) => (
                  <Button
                    key={theme}
                    secondary
                    c={c}
                    label={
                      (state.settings.theme === theme ? "✓ " : "") +
                      [
                        t("Theo thiết bị", "System"),
                        t("Sáng", "Light"),
                        t("Tối", "Dark"),
                      ][i]
                    }
                    onPress={() =>
                      commit({
                        ...ref.current,
                        settings: { ...state.settings, theme },
                      })
                    }
                  />
                ))}
              </>,
            )}
            {heading("Dữ liệu của bạn", "Your data")}
            {card(
              <>
                {label(
                  "Dữ liệu lưu trên điện thoại. Sao lưu trước khi gỡ ứng dụng.",
                  "Data is stored on this phone. Back up before uninstalling.",
                )}
                <Button
                  secondary
                  c={c}
                  label={t("Xuất lịch sử CSV", "Export history CSV")}
                  onPress={() => exportData("csv")}
                />
                <Button
                  secondary
                  c={c}
                  label={t("Sao lưu đầy đủ JSON", "Full JSON backup")}
                  onPress={() => exportData("json")}
                />
                <Button
                  secondary
                  c={c}
                  label={t("Khôi phục bản sao lưu", "Restore backup")}
                  onPress={importData}
                />
                <Button
                  secondary
                  c={c}
                  label={t("Thùng rác", "Trash")}
                  onPress={() => setModal("trash")}
                />
              </>,
            )}
            {label(
              "ReadSession 0.2 · Bản draft Android\nKhông tài khoản · Không quảng cáo · Dùng ngoại tuyến",
              "ReadSession 0.2 · Android draft\nNo account · No ads · Works offline",
            )}
          </>
        )}
      </ScrollView>
      <View
        style={[styles.tabs, { backgroundColor: c.card, borderColor: c.line }]}
      >
        {(
          [
            ["sessions", "◷", "Phiên", "Sessions"],
            ["books", "▤", "Sách", "Books"],
            ["settings", "☷", "Cài đặt", "Settings"],
          ] as const
        ).map(([key, icon, vi, en]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[
              styles.tab,
              { backgroundColor: tab === key ? c.soft : "transparent" },
            ]}
          >
            <Text
              style={{ color: tab === key ? c.green : c.muted, fontSize: 23 }}
            >
              {icon}
            </Text>
            <Text
              style={{
                color: tab === key ? c.green : c.muted,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {t(vi, en)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={modal !== null}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <Text
                style={{
                  color: c.ink,
                  fontSize: 21,
                  fontWeight: "700",
                  flex: 1,
                }}
              >
                {modal === "book"
                  ? t("Thông tin sách", "Book details")
                  : modal === "start"
                    ? t("Bắt đầu phiên", "Start session")
                    : modal === "finish"
                      ? t("Một phiên đọc nữa", "Another reading session")
                      : modal === "manual"
                        ? t("Thông tin phiên", "Session details")
                        : modal === "trash"
                          ? t("Thùng rác", "Trash")
                          : t("Cuốn sách của bạn", "Your book")}
              </Text>
              <Pressable
                onPress={closeModal}
                accessibilityLabel={t("Đóng", "Close")}
                style={{ padding: 10 }}
              >
                <Text style={{ color: c.green, fontSize: 24 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {modal === "book" && (
                <>
                  <IsbnTools c={c} t={t} value={bookForm.isbn} onChange={(isbn) => setBookForm((f) => ({ ...f, isbn }))} onFound={(book) => setBookForm((f) => ({ ...f, title: f.title || book.title, author: f.author || book.author, total: f.total || book.total }))} />
                  <Field
                    c={c}
                    label={t("Tên sách *", "Title *")}
                    value={bookForm.title}
                    onChange={(title) => setBookForm((f) => ({ ...f, title }))}
                  />
                  <Field
                    c={c}
                    label={t("Tác giả *", "Author *")}
                    value={bookForm.author}
                    onChange={(author) =>
                      setBookForm((f) => ({ ...f, author }))
                    }
                  />
                  <Field
                    c={c}
                    numeric
                    label={t(
                      "Mốc kết thúc / số trang nội dung *",
                      "End position / content pages *",
                    )}
                    value={bookForm.total}
                    onChange={(total) => setBookForm((f) => ({ ...f, total }))}
                  />
                  <Field
                    c={c}
                    numeric
                    label={t("Tiến độ hiện tại", "Current position")}
                    value={bookForm.position}
                    onChange={(position) =>
                      setBookForm((f) => ({ ...f, position }))
                    }
                  />
                  {label(
                    "0 là chưa đọc. Chọn mốc kết thúc trước phụ lục nếu muốn bỏ qua phần đó.",
                    "0 means unread. Set the end position before appendices to exclude them.",
                  )}
                  {!!bookForm.cover && (
                    <Image
                      source={{ uri: bookForm.cover }}
                      style={{ width: 90, height: 125, borderRadius: 8 }}
                    />
                  )}
                  <Button
                    secondary
                    c={c}
                    label={t("Chọn ảnh bìa", "Choose cover")}
                    onPress={() => pickCover(false)}
                  />
                  <Button c={c} secondary label={t("Chụp ảnh bìa", "Take cover photo")} onPress={() => pickCover(true)} />
                  {!!bookForm.cover && (
                    <Button
                      secondary
                      c={c}
                      label={t("Bỏ ảnh bìa", "Remove cover")}
                      onPress={() => setBookForm((f) => ({ ...f, cover: "" }))}
                    />
                  )}
                  <Button
                    secondary
                    c={c}
                    label={
                      (bookForm.completed ? "✓ " : "") +
                      t("Đánh dấu đã hoàn thành", "Mark as finished")
                    }
                    onPress={() =>
                      setBookForm((f) => ({ ...f, completed: !f.completed }))
                    }
                  />
                  {(bookForm.completed ||
                    Number(bookForm.position) === Number(bookForm.total)) && (
                    <Field
                      multiline
                      c={c}
                      label={t("Cảm nghĩ về cuốn sách", "Book reflection")}
                      value={bookForm.reflection}
                      onChange={(reflection) =>
                        setBookForm((f) => ({ ...f, reflection }))
                      }
                    />
                  )}
                  <Button
                    c={c}
                    label={t("Lưu sách", "Save book")}
                    onPress={storeBook}
                  />
                </>
              )}
              {modal === "start" && chosen && (
                <>
                  {bookRow(chosen, () => {})}
                  <Field
                    c={c}
                    numeric
                    label={t("Mốc bắt đầu", "Start position")}
                    value={start}
                    onChange={setStart}
                  />
                  <Field c={c} numeric label={t("Mục tiêu phiên (phút, tùy chọn)", "Session goal (minutes, optional)")} value={sessionGoal} onChange={setSessionGoal} placeholder={t("Không đặt mục tiêu", "No goal")} />
                  {label("Đạt mục tiêu thì timer vẫn tiếp tục. Bạn có thể kết thúc sớm và lưu phiên.", "The timer continues after the goal. You can finish early and save.")}
                  {label(
                    "Từ 98 đến 110 được tính là 12 trang.",
                    "98 to 110 counts as 12 pages.",
                  )}
                  <Button
                    c={c}
                    label={t("Bắt đầu timer", "Start timer")}
                    onPress={begin}
                  />
                </>
              )}
              {modal === "finish" && draft && (
                <>
                  {label(
                    "Thời gian đã tạm dừng. Có thể chỉnh trước khi lưu.",
                    "The timer is paused. Adjust it before saving if needed.",
                  )}
                  <Field
                    c={c}
                    label={t("Thời gian HH:MM:SS", "Duration HH:MM:SS")}
                    value={draft.editingSeconds ?? clock(draft.elapsed)}
                    onChange={(editingSeconds) =>
                      patchDraft({ editingSeconds })
                    }
                  />
                  <Field
                    c={c}
                    numeric
                    label={t("Mốc dừng", "End position")}
                    value={draft.end}
                    onChange={(end) => patchDraft({ end })}
                  />
                  <Field
                    c={c}
                    multiline
                    label={t(
                      "Bạn muốn giữ lại điều gì?",
                      "What would you like to remember?",
                    )}
                    value={draft.note}
                    onChange={(note) => patchDraft({ note })}
                    placeholder={t(
                      "Một ý tưởng, một câu hay, một điều mới…",
                      "An idea, a favorite line, something new…",
                    )}
                  />
                  <Button
                    c={c}
                    label={t("Lưu phiên đọc", "Save session")}
                    onPress={() => storeSession(false)}
                  />
                  <Button
                    secondary
                    c={c}
                    label={t("Hủy phiên này", "Discard session")}
                    onPress={() =>
                      confirm(
                        t(
                          "Xóa bản nháp phiên này?",
                          "Discard this session draft?",
                        ),
                        () => {
                          if (commit({ ...ref.current, draft: null }))
                            setModal(null);
                        },
                      )
                    }
                  />
                </>
              )}
              {modal === "manual" && (
                <>
                  <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                    {books.map((b) => (
                      <Pressable
                        disabled={state.sessions.some(
                          (s) => s.id === sessionForm.id,
                        )}
                        key={b.id}
                        onPress={() =>
                          setSessionForm((f) => ({
                            ...f,
                            bookId: b.id,
                            start: String(b.position),
                            end: String(b.position),
                          }))
                        }
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              sessionForm.bookId === b.id ? c.soft : c.card,
                          },
                        ]}
                      >
                        <Text style={{ color: c.ink }}>{b.title}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Field
                    c={c}
                    label={t("Ngày YYYY-MM-DD", "Date YYYY-MM-DD")}
                    value={sessionForm.date}
                    onChange={(date) => setSessionForm((f) => ({ ...f, date }))}
                  />
                  <Field
                    c={c}
                    numeric
                    label={t("Mốc bắt đầu", "Start position")}
                    value={sessionForm.start}
                    onChange={(start) =>
                      setSessionForm((f) => ({ ...f, start }))
                    }
                  />
                  <Field
                    c={c}
                    numeric
                    label={t("Mốc dừng", "End position")}
                    value={sessionForm.end}
                    onChange={(end) => setSessionForm((f) => ({ ...f, end }))}
                  />
                  <Field
                    c={c}
                    label={t("Thời gian HH:MM:SS", "Duration HH:MM:SS")}
                    value={sessionForm.time}
                    onChange={(time) => setSessionForm((f) => ({ ...f, time }))}
                  />
                  <Field
                    c={c}
                    multiline
                    label={t("Ghi chú", "Note")}
                    value={sessionForm.note}
                    onChange={(note) => setSessionForm((f) => ({ ...f, note }))}
                  />
                  <Button
                    c={c}
                    label={t("Lưu phiên", "Save session")}
                    onPress={() => storeSession(true)}
                  />
                  {state.sessions.some((s) => s.id === sessionForm.id) && (
                    <Button
                      c={c}
                      secondary
                      label={t("Chuyển vào Thùng rác", "Move to Trash")}
                      onPress={() =>
                        confirm(
                          t(
                            "Xóa phiên khỏi thống kê? Vị trí sách được giữ nguyên.",
                            "Remove this session from statistics? The book position is kept.",
                          ),
                          () => {
                            if (
                              commit({
                                ...ref.current,
                                sessions: state.sessions.map((s) =>
                                  s.id === sessionForm.id
                                    ? { ...s, deletedAt: Date.now() }
                                    : s,
                                ),
                              })
                            )
                              setModal(null);
                          },
                        )
                      }
                    />
                  )}
                </>
              )}
              {modal === "detail" && detail && (
                <>
                  <View style={{ flexDirection: "row", gap: 20 }}>
                    <Cover book={detail} c={c} large />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text
                        style={{
                          color: c.ink,
                          fontSize: 24,
                          fontFamily: "serif",
                        }}
                      >
                        {detail.title}
                      </Text>
                      <Text style={{ color: c.muted }}>{detail.author}</Text>
                      <Text style={{ color: c.green }}>
                        {detail.position} / {detail.total} ·{" "}
                        {Math.round((detail.position / detail.total) * 100)}%
                      </Text>
                      {detail.completed && label("Đã hoàn thành", "Finished")}
                    </View>
                  </View>
                  <Button
                    c={c}
                    label={t("Đọc cuốn này", "Read this book")}
                    onPress={() => {
                      if (draft) {
                        setModal(null);
                        setTab("sessions");
                        return;
                      }
                      setSelected(detail.id);
                      setStart(String(detail.position));
                      setModal("start");
                    }}
                  />
                  <Button
                    secondary
                    c={c}
                    label={t(
                      "Sửa sách và cảm nghĩ",
                      "Edit book and reflection",
                    )}
                    onPress={() => openBook(detail)}
                  />
                  {!!detail.reflection &&
                    card(
                      <Text style={{ color: c.ink, lineHeight: 24 }}>
                        {detail.reflection}
                      </Text>,
                    )}
                  {heading("Các phiên đã đọc", "Reading sessions")}
                  {sessions
                    .filter((s) => s.bookId === detail.id)
                    .sort(
                      (a, b) =>
                        b.date.localeCompare(a.date) ||
                        b.createdAt - a.createdAt,
                    )
                    .map(historyRow)}
                  <Button
                    secondary
                    c={c}
                    label={t("Chuyển sách vào Thùng rác", "Move book to Trash")}
                    onPress={() => trashBook(detail)}
                  />
                </>
              )}
              {modal === "trash" && (
                <>
                  {label(
                    "Khôi phục sách sẽ hiển thị lại lịch sử. Phiên đã xóa riêng vẫn ở Thùng rác.",
                    "Restoring a book brings back its history. Individually deleted sessions stay in Trash.",
                  )}
                  {state.books
                    .filter((b) => b.deletedAt)
                    .map((b) => (
                      <View
                        key={b.id}
                        style={[
                          styles.card,
                          { backgroundColor: c.card, borderColor: c.line },
                        ]}
                      >
                        <Text style={{ color: c.ink, fontWeight: "700" }}>
                          {b.title}
                        </Text>
                        <Button
                          secondary
                          c={c}
                          label={t("Khôi phục sách", "Restore book")}
                          onPress={() =>
                            commit({
                              ...ref.current,
                              books: state.books.map((x) =>
                                x.id === b.id
                                  ? { ...x, deletedAt: undefined }
                                  : x,
                              ),
                            })
                          }
                        />
                        <Button
                          secondary
                          c={c}
                          label={t("Xóa vĩnh viễn", "Delete permanently")}
                          onPress={() =>
                            confirm(
                              t(
                                "Xóa vĩnh viễn sách và mọi phiên, ghi chú liên quan?",
                                "Permanently delete this book and all related sessions and notes?",
                              ),
                              () =>
                                commit({
                                  ...ref.current,
                                  books: state.books.filter(
                                    (x) => x.id !== b.id,
                                  ),
                                  sessions: state.sessions.filter(
                                    (x) => x.bookId !== b.id,
                                  ),
                                }),
                            )
                          }
                        />
                      </View>
                    ))}
                  {state.sessions
                    .filter(
                      (s) =>
                        s.deletedAt && books.some((b) => b.id === s.bookId),
                    )
                    .map((s) => (
                      <View
                        key={s.id}
                        style={[
                          styles.card,
                          { backgroundColor: c.card, borderColor: c.line },
                        ]}
                      >
                        <Text style={{ color: c.ink }}>
                          {books.find((b) => b.id === s.bookId)?.title} ·{" "}
                          {s.date}
                        </Text>
                        <Button
                          secondary
                          c={c}
                          label={t("Khôi phục phiên", "Restore session")}
                          onPress={() =>
                            commit({
                              ...ref.current,
                              sessions: state.sessions.map((x) =>
                                x.id === s.id
                                  ? { ...x, deletedAt: undefined }
                                  : x,
                              ),
                            })
                          }
                        />
                        <Button
                          secondary
                          c={c}
                          label={t("Xóa vĩnh viễn", "Delete permanently")}
                          onPress={() =>
                            confirm(
                              t(
                                "Xóa vĩnh viễn phiên và ghi chú?",
                                "Permanently delete this session and its note?",
                              ),
                              () =>
                                commit({
                                  ...ref.current,
                                  sessions: state.sessions.filter(
                                    (x) => x.id !== s.id,
                                  ),
                                }),
                            )
                          }
                        />
                      </View>
                    ))}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </SoundProvider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
