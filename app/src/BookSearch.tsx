import { Alert } from "./dialogs";
import React, { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Button, Field, type Palette } from "./ui";
import { loadVietnameseBook, searchVietnameseBooks, type CatalogResult, type VietnameseSource } from "./catalog";
import type { IsbnBook } from "./isbn";
export function BookSearch({ isbn, c, t, onFound }: { isbn: string; c: Palette; t: (vi: string, en: string) => string; onFound: (b: IsbnBook) => void }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState("");
  const [source, setSource] = useState<VietnameseSource>("nhanam");
  const [results, setResults] = useState<CatalogResult[]>([]), [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  function cancel() { request.current?.abort(); request.current = null; setBusy(false); setStatus(""); setResults([]); }
  async function search() {
    cancel(); const controller = new AbortController(); request.current = controller; setBusy(true);
    try {
      const matches = await searchVietnameseBooks(query, source, controller.signal);
      if (request.current !== controller) return;
      setResults(matches); setStatus(matches.length ? t("Chọn sách để xem và kiểm tra thông tin.", "Choose a book to review its metadata.") : t("Chưa có kết quả. Thử từ khóa ngắn, kiểm tra cách viết hoặc đổi nguồn.", "No matches. Try a shorter term, check spelling, or change source."));
    } catch { if (request.current === controller) setStatus(t("Nguồn sách chưa phản hồi hoặc đã thay đổi. Thử lại hoặc nhập tay.", "Catalog unavailable or changed. Retry or enter details manually.")); }
    finally { if (request.current === controller) { setBusy(false); request.current = null; } }
  }
  async function choose(result: CatalogResult) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true);
    try {
      const book = await loadVietnameseBook(result, controller.signal);
      if (request.current !== controller) return;
      Alert.alert(book.title, `${book.author}\n${book.total || "?"} ${t("trang", "pages")}\n${t("ISBN nguồn", "Source ISBN")}: ${book.isbn ?? t("Không cung cấp", "Not supplied")}\n\n${t("Kiểm tra ấn bản trước khi dùng. Chỉ điền ô trống; ISBN bạn nhập vẫn giữ nguyên", "Verify the edition. Only empty fields will be filled; your entered ISBN stays unchanged")}${isbn ? ` (${isbn})` : ""}.`, [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Dùng thông tin", "Use details"), onPress: () => { onFound(book); setStatus(t("Đã điền ô trống. Kiểm tra ISBN và số trang của cuốn trên tay trước khi lưu.", "Empty fields filled. Verify your physical book's ISBN and page count before saving.")); } }]);
    } catch { if (request.current === controller) setStatus(t("Không tải được thông tin. Thử mở trang nguồn hoặc nhập tay.", "Could not load metadata. Open the source or enter details manually.")); }
    finally { if (request.current === controller) { setBusy(false); request.current = null; } }
  }
  return <View style={{ gap: 10 }}>
    <Button c={c} secondary label={t("Tìm sách Việt theo tên", "Find Vietnamese books by title") + (open ? " ▴" : " ▾")} onPress={() => { cancel(); setOpen(!open); }} />
    {open && <>
      <Text style={{ color: c.muted }}>{t("Nguồn Nhã Nam hoặc NXB Trẻ. Gửi từ khóa bạn nhập đến website nguồn; không gửi ghi chú. Kết quả có thể thuộc ấn bản khác.", "Search Nhã Nam or NXB Trẻ. Only your search term is sent to the source, not notes. Results may be different editions.")}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>{(["nhanam", "tre"] as const).map(s => <Button key={s} c={c} secondary label={(source === s ? "✓ " : "") + (s === "nhanam" ? "Nhã Nam" : "NXB Trẻ")} onPress={() => { cancel(); setSource(s); }} />)}</View>
      <Field c={c} label={t("Tên sách hoặc từ khóa", "Title or keyword")} value={query} placeholder={t("Ví dụ: Sisyphus", "For example: Sisyphus")} onChange={value => { cancel(); setQuery(value); }} />
      <Button c={c} secondary disabled={busy || query.trim().length < 2} label={busy ? t("Đang tải…", "Loading…") : t("Tìm theo tên", "Search by title")} onPress={search} />
      {results.map(result => <View key={result.url} style={{ padding: 12, borderRadius: 12, backgroundColor: c.card, gap: 8 }}>
        <Text style={{ color: c.ink }}>{result.title}</Text>
        <Button c={c} secondary disabled={busy} label={t("Xem và chọn", "Review and choose")} onPress={() => choose(result)} />
        <Button c={c} secondary label={t("Mở trang nguồn", "Open source")} onPress={() => { void Linking.openURL(result.url).catch(() => setStatus(t("Không mở được trình duyệt.", "Could not open browser."))); }} />
      </View>)}
      {!!status && <Text style={{ color: c.muted }}>{status}</Text>}
    </>}
  </View>;
}
