import React, { useEffect, useRef, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Field, type Palette } from "./ui";
import { lookupIsbn, normalizeIsbn, type IsbnBook } from "./isbn";

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
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const book = await lookupIsbn(isbn, controller.signal);
      if (request.current !== controller) return;
      if (book) onFound(book);
      setStatus(book ? t("Đã điền các ô trống. Kiểm tra lại ấn bản và số trang trước khi lưu.", "Empty fields filled. Verify your edition and page count before saving.") : t("Không tìm thấy. ISBN đã giữ lại; bạn có thể nhập thông tin sách bằng tay.", "No match. ISBN kept; enter the book details manually."));
    } catch {
      if (request.current === controller) setStatus(t("Không tra cứu được. Kiểm tra mạng hoặc nhập thông tin bằng tay.", "Lookup unavailable. Check your connection or enter details manually."));
    } finally { clearTimeout(timeout); if (request.current === controller) { setBusy(false); request.current = null; } }
  }
  async function scan() {
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (!result.granted) { setStatus(t("Cần quyền camera để quét. Bạn vẫn có thể nhập ISBN bên dưới.", "Camera permission is required to scan. You can enter ISBN below.")); return; }
      scanned.current = false; setStatus(""); setScanning(true);
    } catch { setStatus(t("Không mở được camera.", "Could not open camera.")); }
  }
  return <View style={{ gap: 10 }}>
    <Field c={c} label="ISBN" value={value} onChange={(code) => {
      request.current?.abort(); request.current = null; setBusy(false); setStatus(""); onChange(code);
    }} placeholder="978…" />
    <Text style={{ color: c.muted }}>{t("Quét barcode ISBN trên sách hoặc nhập tay. Tra cứu gửi ISBN đến Open Library qua Internet; không gửi ảnh hay ghi chú.", "Scan a book ISBN barcode or enter it manually. Lookup sends ISBN to Open Library online, without photos or notes.")}</Text>
    {scanning ? <>
      <CameraView style={{ height: 230, width: "100%" }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["ean13"] }}
        onMountError={() => { setScanning(false); setStatus(t("Không mở được camera. Thử lại hoặc nhập ISBN.", "Camera unavailable. Retry or enter ISBN.")); }}
        onBarcodeScanned={({ data }) => {
          if (scanned.current) return;
          if (!normalizeIsbn(data)) { setStatus(t("Mã này không phải ISBN sách hợp lệ.", "This is not a valid book ISBN.")); return; }
          scanned.current = true; setScanning(false); void lookup(data);
        }} />
      <Button c={c} secondary label={t("Đóng camera", "Close camera")} onPress={() => setScanning(false)} />
    </> : <Button c={c} secondary disabled={busy} label={t("Quét barcode / ISBN", "Scan barcode / ISBN")} onPress={scan} />}
    {permission && !permission.granted && !permission.canAskAgain && <Button c={c} secondary label={t("Mở quyền ứng dụng", "Open app permissions")} onPress={() => { void Linking.openSettings(); }} />}
    <Button c={c} secondary disabled={busy || scanning} label={t("Tra cứu ISBN", "Look up ISBN")} onPress={() => { void lookup(value); }} />
    {!!status && <Text accessibilityLiveRegion="polite" style={{ color: c.muted }}>{status}</Text>}
  </View>;
}
