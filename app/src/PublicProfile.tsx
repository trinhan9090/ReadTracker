import React, { useEffect, useState } from "react";
import { BackHandler, Image, Pressable, Text, View } from "react-native";
import { backend } from "./backend";
import { Button, type Palette } from "./ui";
import { type Profile, type PublicBook, type PublicReading } from "./online";

type Props = { profile: Profile; c: Palette; t: (vi: string, en: string) => string; onNavigate: () => void };
export function PublicProfile({ profile, c, t, onNavigate }: Props) {
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [selected, setSelected] = useState<PublicBook | null>(null);
  useEffect(() => { onNavigate(); }, [selected?.id]);
  useEffect(() => {
    if (!selected) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { setSelected(null); return true; });
    return () => listener.remove();
  }, [selected]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    void Promise.all([
      backend!.from("rs_books").select("*").eq("owner", profile.id),
      backend!.from("rs_reading_totals").select("seconds").eq("owner", profile.id).maybeSingle(),
    ]).then(([b, s]) => {
      if (!active) return;
      if (b.error || s.error) throw b.error ?? s.error;
      setBooks(b.data ?? []); setSeconds(Number(s.data?.seconds ?? 0));
    }).catch(() => { if (active) setError(t("Không tải được hồ sơ.", "Could not load profile.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile.id, attempt]);
  if (selected) return <PublicBookDetail book={selected} c={c} t={t} back={() => setSelected(null)} />;
  const covers = (items: PublicBook[]) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
    {items.map((book) => <Pressable key={book.id} android_disableSound accessibilityRole="button" accessibilityLabel={book.title} onPress={() => setSelected(book)} style={{ width: "30%", minWidth: 80 }}>
      {book.cover ? <Image source={{ uri: book.cover }} style={{ width: "100%", aspectRatio: 0.68, borderRadius: 8 }} resizeMode="cover" /> : <View style={{ aspectRatio: 0.68, backgroundColor: c.soft, borderRadius: 8, padding: 10, justifyContent: "center" }}><Text style={{ color: c.ink, textAlign: "center" }}>{book.title}</Text></View>}
    </Pressable>)}
  </View>;
  const featured = profile.featured.map(id => books.find(b => b.id === id)).filter((b): b is PublicBook => !!b);
  const shelf = books.filter(b => !profile.featured.includes(b.id));
  return <View style={{ gap: 18 }}>
    <Text style={{ color: c.ink, fontSize: 26, fontWeight: "700" }}>{profile.name}</Text>
    {seconds !== null && <Text style={{ color: c.muted }}>{t("Tổng thời gian đọc", "Total reading time")}: {(seconds / 3600).toFixed(1)} {t("giờ", "hours")}</Text>}
    {loading && <Text style={{ color: c.muted }}>{t("Đang tải…", "Loading…")}</Text>}
    {!!error && <><Text style={{ color: c.danger }}>{error}</Text><Button c={c} label={t("Thử lại", "Retry")} onPress={() => setAttempt(x => x + 1)} /></>}
    {!!featured.length && <><Text style={{ color: c.ink, fontSize: 18 }}>{t("3 cuốn sách nói về tôi", "3 books that tell my story")}</Text>{covers(featured)}</>}
    {!!shelf.length && <><Text style={{ color: c.ink, fontSize: 18 }}>{t("Tủ sách public", "Public bookshelf")}</Text>{covers(shelf)}</>}
    {!loading && !error && !books.length && <Text style={{ color: c.muted }}>{t("Chưa có sách public.", "No public books yet.")}</Text>}
  </View>;
}
function PublicBookDetail({ book, c, t, back }: { book: PublicBook; c: Palette; t: Props["t"]; back: () => void }) {
  const [sessions, setSessions] = useState<PublicReading[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setError(""); setLoading(true);
    void backend!.from("rs_public_sessions").select("*").eq("owner", book.owner).eq("book_id", book.id).order("date", { ascending: false })
      .then(({ data, error }) => { if (!active) return; setLoading(false); if (error) setError(t("Không tải được phiên đọc.", "Could not load sessions.")); else setSessions(data ?? []); });
    return () => { active = false; };
  }, [book.owner, book.id, attempt]);
  return <View style={{ gap: 14 }}>
    <Button c={c} secondary label={t("← Hồ sơ", "← Profile")} onPress={back} />
    {book.cover && <Image source={{ uri: book.cover }} style={{ width: 130, height: 190, borderRadius: 8, alignSelf: "center" }} />}
    <Text style={{ color: c.ink, fontSize: 23, fontWeight: "700" }}>{book.title}</Text>
    <Text style={{ color: c.muted }}>{book.author} · {book.position}/{book.total}</Text>
    {!!book.reflection && <><Text style={{ color: c.ink, fontSize: 18 }}>{t("Cảm nhận", "Reflection")}</Text><Text style={{ color: c.ink }}>{book.reflection}</Text></>}
    <Text style={{ color: c.ink, fontSize: 18 }}>{t("Phiên đọc", "Reading sessions")}</Text>
    {loading && <Text style={{ color: c.muted }}>{t("Đang tải…", "Loading…")}</Text>}
    {!!error && <><Text style={{ color: c.danger }}>{error}</Text><Button c={c} label={t("Thử lại", "Retry")} onPress={() => setAttempt(x => x + 1)} /></>}
    {!loading && !error && !sessions.length && <Text style={{ color: c.muted }}>{t("Chưa có phiên đọc.", "No reading sessions yet.")}</Text>}
    {sessions.map(s => <View key={s.id} style={{ padding: 14, borderRadius: 12, backgroundColor: c.card, gap: 8 }}>
      <Text style={{ color: c.ink }}>{s.date} · {Math.floor(s.seconds / 60)} {t("phút", "min")} · {s.start_page} → {s.end_page}</Text>
      {!!s.note && <Text style={{ color: c.muted }}>{s.note}</Text>}
    </View>)}
  </View>;
}
