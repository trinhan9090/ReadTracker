import React, { useEffect, useRef, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Field, type Palette } from "./ui";
import { lookupIsbn, normalizeIsbn, type IsbnBook } from "./isbn";
import { lookupVietnameseIsbn } from "./catalog";
import { BookSearch } from "./BookSearch";
import { backend } from "./backend";

export function IsbnTools({ value, onChange, onFound, c, t }: {
  value: string; onChange: (code: string) => void; onFound: (book: IsbnBook) => void;
  c: Palette; t: (vi: string, en: string) => string;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  const scanned = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => { if (state !== "active") setScanning(false); });
    return () => { request.current?.abort(); request.current = null; sub.remove(); };
  }, []);
  async function lookup(input: string) {
    const isbn = normalizeIsbn(input);
    if (!isbn) { setStatus(t("ISBN không hợp lệ. Hãy nhập 10 hoặc 13 ký tự của ISBN sách.", "Invalid book ISBN. Enter a valid 10 or 13 character ISBN.")); return; }
    onChange(isbn);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setStatus(t("Đang tra cứu…", "Looking up…"));
    const timeout = setTimeout(() => controller.abort(), 40000);
    try {
      let book: IsbnBook | null = null;
      if (backend) {
        try {
          const { data } = await backend.from("rs_books").select("title,author,total").eq("isbn", isbn).limit(1).abortSignal(controller.signal);
          if (data?.[0]) book = { ...data[0], total: String(data[0].total) };
        } catch { /* Other catalogs can still work when the demo server is unavailable. */ }
      }
      if (!book) {
        const [international, vietnamese] = await Promise.allSettled([lookupIsbn(isbn, controller.signal), lookupVietnameseIsbn(isbn, controller.signal)]);
        book = (vietnamese.status === "fulfilled" ? vietnamese.value : null) ?? (international.status === "fulfilled" ? international.value : null);
        if (!book && international.status === "rejected") throw new Error("Lookup unavailable");
      }
      if (request.current !== controller) return;
      if (book) onFound(book);
      setStatus(book ? t("Đã điền các ô trống. Kiểm tra lại ấn bản và số trang trước khi lưu.", "Empty fields filled. Verify your edition and page count before saving.") : t("Không tìm thấy. ISBN đã giữ lại; bạn có thể nhập thông tin sách bằng tay.", "No match. ISBN kept; enter the book details manually."));
    } catch {
      if (request.current === controller) setStatus(t("Không tra cứu được. Kiểm tra mạng hoặc nhập thông tin bằng tay.", "Lookup unavailable. Check your connection or enter details manually."));
    } finally { clearTimeout(timeout); if (request.current === controller) { setBusy(false); request.current = null; } }
  }
  return <View style={{ gap: 10 }}>
    <Field c={c} label={t("ISBN (không bắt buộc)", "ISBN (optional)")} value={value} onChange={(code) => {
      request.current?.abort(); request.current = null; setBusy(false); setStatus(""); onChange(code);
    }} placeholder="978…" />
    <Text style={{ color: c.muted }}>{t("Tra cứu ISBN trong kho public của nhóm, Nhã Nam, NXB Trẻ, Open Library và Google Books. Chỉ điền khi khớp mã. Nếu thiếu dữ liệu, dùng tìm theo tên bên dưới hoặc nhập tay.", "Search public group books, Nhã Nam, NXB Trẻ, Open Library and Google Books for an exact ISBN. Missing editions can be searched by title below or entered manually.")}</Text>
    <Button c={c} secondary disabled={busy || scanning} label={t("Tra cứu ISBN", "Look up ISBN")} onPress={() => { void lookup(value); }} />
    <Text style={{ color: c.muted }}>{t("Bạn luôn có thể để trống ISBN và tự nhập tên, tác giả, số trang bên dưới để lưu sách.", "You can always leave ISBN blank and enter a title, author and page count below to save a book.")}</Text>
    <BookSearch isbn={value} c={c} t={t} onFound={onFound} />
    {!!status && <Text accessibilityLiveRegion="polite" style={{ color: c.muted }}>{status}</Text>}
  </View>;
}
