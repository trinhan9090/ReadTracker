import { resolveConflict, record, type RecordValue } from "./sync";
import { Alert } from "./dialogs";
import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import type { Session as LoginSession } from "@supabase/supabase-js";
import { backend } from "./backend";
import { guestLibrary } from "./storage";
import { privateImport, clock, type State } from "./model";
import { Button, Field, type Palette } from "./ui";

type Props = { account: LoginSession | null; state: State; commit: (s: State | ((current: State) => State)) => boolean; c: Palette; t: (vi: string, en: string) => string; error: string; sync: () => Promise<void>; pull: () => Promise<void>; back: () => void; exportJson: () => void };
export function SyncPanel({ account, state, commit, c, t, error, sync, pull, back, exportJson }: Props) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState("");
  async function action(job: () => Promise<void>) {
    setBusy(true); setProblem("");
    try { await job(); } catch (e) {
      const message = (e as { message?: string }).message ?? "";
      setProblem(message.includes("Invalid login") ? t("Email hoặc mật khẩu không đúng.", "Incorrect email or password.") : t("Không kết nối được. Hãy thử lại.", "Connection failed. Please retry."));
    } finally { setBusy(false); }
  }
  const describe = (value: RecordValue) => {
    if (!value) return t("Đã xóa", "Deleted");
    if ("title" in value) return [value.title, value.author, value.position + " / " + value.total + t(" trang", " pages"), value.completed ? t("Đã xong", "Finished") : t("Chưa xong", "Unfinished"), value.visibility ?? "private", value.reflection, value.deletedAt ? t("Trong thùng rác", "In trash") : ""].filter(Boolean).join("\n");
    if ("seconds" in value) return [state.books.find(b => b.id === value.bookId)?.title, value.date, clock(value.seconds), value.start + " → " + value.end, value.visibility ?? "private", value.note, value.deletedAt ? t("Trong thùng rác", "In trash") : ""].filter(Boolean).join("\n");
    return t("Mục tiêu ngày: ", "Daily goal: ") + (value.dailyGoalMinutes ?? 5) + t(" phút", " min") + "\n" + value.language + " · " + value.theme;
  };
  return <View style={{ gap: 16 }}>
    <Button c={c} secondary disabled={busy} label={t("← Cài đặt", "← Settings")} onPress={back} />
    <Text style={{ color: c.ink, fontSize: 24 }}>{t("Tài khoản & đồng bộ", "Account & sync")}</Text>
    <Text style={{ color: c.ink }}>{account ? account.user.email : t("Đang dùng local", "Using local storage")}</Text>
    <Text style={{ color: c.muted }}>{t("Local là dữ liệu lưu trong ứng dụng trên điện thoại. Không cần tài khoản hay Internet. Gỡ ứng dụng hoặc xóa dữ liệu ứng dụng sẽ mất bản local; bạn có thể xuất JSON để giữ bản sao.", "Local data is stored inside this app on your phone. No account or Internet is needed. Uninstalling or clearing app data removes it; export JSON to keep a copy.")}</Text>
    <Text style={{ color: c.muted }}>{t("Khi đăng nhập, ứng dụng dùng tủ sách riêng của tài khoản và vẫn lưu một bản trên máy. Khi app đang mở, các thay đổi được tự đẩy lên cloud sau khi lưu xong phiên đọc. Mất mạng vẫn đọc được; app thử lại khi trở về ứng dụng hoặc định kỳ lúc đang mở. Đóng app không bảo đảm đồng bộ tiếp.", "Signing in opens a separate account library with a local copy. While the app is open, changes upload automatically after the reading session is saved. Reading works offline; sync retries when returning to the app and periodically while open. Closing the app does not guarantee further sync.")}</Text>
    <Text style={{ color: c.muted }}>{t("Tủ sách local và từng tài khoản được tách riêng. Đăng nhập không tự nhập sách local; đăng xuất không xóa dữ liệu. Trên thiết bị khác, đăng nhập cùng tài khoản để tải bản đã đồng bộ.", "The local library and each account are separate. Signing in does not import local books automatically; signing out does not delete data. Sign in on another device to load the synced copy.")}</Text>
    <Text style={{ color: c.muted }}>{t("Từ 0.5, sách và phiên đọc được gộp theo từng thay đổi. Cùng sửa một mục sẽ cần bạn chọn bản giữ lại. App tự kiểm tra cloud mỗi 10 giây khi đang mở và không nhập liệu. Timer chưa kết thúc chỉ nằm trên thiết bị đang đọc. Cloud không phải lịch sử sao lưu nhiều phiên bản.", "Version 0.5 merges individual records. Conflicting edits require a choice. Cloud refreshes every 10 seconds while open and not editing. An unfinished timer stays on its device. Cloud is not versioned backup history.")}</Text>
    {Platform.OS === "web" && <Text style={{color:c.muted}}>{t("Trên web, tủ sách được tải từ cloud sau đăng nhập. Tab chỉ giữ tạm thay đổi chưa đồng bộ và timer. Đóng tab hoặc xóa dữ liệu trình duyệt có thể mất phần chưa gửi; hãy xuất JSON nếu đang gặp lỗi mạng.", "Web loads the cloud library after sign-in. This tab temporarily keeps unsynced changes and the timer. Closing the tab or clearing browser data can lose pending work; export JSON when offline.")}</Text>}
    {account ? <>
      {(state.syncConflicts ?? []).map(conflict => {
        const local = record(state, conflict.kind, conflict.id);
        const title = local && "title" in local ? local.title : conflict.kind === "settings" ? t("Cài đặt", "Settings") : t("Phiên đọc", "Reading session");
        return <View key={conflict.kind + conflict.id} style={{gap:10,padding:14,borderWidth:1,borderColor:c.danger,borderRadius:14}}>
          <Text style={{color:c.ink,fontWeight:"700"}}>{title} · {t("Có hai thay đổi", "Conflicting changes")}</Text>
          <Text selectable style={{color:c.muted}}>{t("Trên thiết bị", "On this device")}: {describe(local)}</Text>
          <Text selectable style={{color:c.muted}}>{t("Trên cloud", "On cloud")}: {describe(conflict.remote)}</Text>
          <Button c={c} secondary label={t("Giữ bản trên thiết bị", "Keep device version")} onPress={() => commit(current => resolveConflict(current,conflict,true))}/>
          <Button c={c} secondary label={t("Dùng bản cloud", "Use cloud version")} onPress={() => Alert.alert("ReadSession", t("Dùng bản cloud sẽ thay nội dung trên thiết bị của mục này. Nếu sách đã xóa trên cloud, các phiên thuộc sách trên thiết bị cũng bị bỏ. Xuất JSON nếu bạn muốn giữ bản sao.", "Use cloud replaces this item locally. If the book was deleted on cloud, its local sessions are also removed. Export JSON to keep a copy."), [{text:t("Hủy","Cancel"),style:"cancel"},{text:t("Dùng bản cloud","Use cloud"),onPress:()=>commit(current=>resolveConflict(current,conflict,false))}])}/>
        </View>;
      })}

      {!!error && <Text style={{ color: c.danger }}>{error}</Text>}
      <Button c={c} secondary disabled={busy || !!state.draft} label={t("Thử đồng bộ ngay", "Sync now")} onPress={() => action(sync)} />
      <Button c={c} secondary disabled={busy} label={t("Xuất bản sao JSON", "Export JSON copy")} onPress={exportJson} />
      <Button c={c} secondary disabled={busy || !!state.draft} label={t("Tải bản cloud về máy", "Load cloud copy")} onPress={() => Alert.alert("ReadSession", t("Thay thư viện tài khoản trên máy bằng bản cloud? Những thay đổi chưa đồng bộ sẽ bị thay thế. Hãy xuất JSON trước nếu cần giữ chúng.", "Replace this account's local library with the cloud copy? Unsynced edits will be replaced. Export JSON first if you need to keep them."), [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Tải và thay thế", "Load and replace"), onPress: () => { void action(pull); } }])} />
      {Platform.OS !== "web" && !state.books.length && <Button c={c} secondary disabled={busy || !!state.draft} label={t("Sao chép tủ sách local vào tài khoản", "Copy local library into account")} onPress={() => Alert.alert("ReadSession", t("Sao chép tủ sách local vào tài khoản và đồng bộ? Sách và ghi chú bắt đầu ở private. Bản local vẫn còn.", "Copy the local library into this account and sync it? Books and notes start private. The local library remains."), [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Sao chép", "Copy"), onPress: () => commit(current => current.books.length ? current : { ...privateImport(guestLibrary()), syncBase: current.syncBase, syncOutbox: current.syncOutbox, cloudRevision: current.cloudRevision ?? 0 }) }])} />}
      <Button c={c} secondary disabled={busy || !!state.draft} label={Platform.OS === "web" ? t("Đăng xuất", "Sign out") : t("Đăng xuất, dùng local", "Sign out and use local")} onPress={() => {
        const leave = () => action(async () => { const { error } = await backend!.auth.signOut({ scope: "local" }); if (error) throw error; });
        if (state.cloudDirty) Alert.alert("ReadSession", t("Có thay đổi chưa lên cloud. Dữ liệu vẫn nằm trên máy trong tài khoản này. Đăng xuất?", "Some edits have not synced. They remain on this device under this account. Sign out?"), [{ text: t("Ở lại", "Stay"), style: "cancel" }, { text: t("Đăng xuất", "Sign out"), onPress: () => { void leave(); } }]);
        else void leave();
      }} />
    </> : <>
      <Text style={{ color: c.ink, fontSize: 20 }}>{t("Đăng nhập để lưu online", "Sign in for online storage")}</Text>
      <Text style={{ color: c.muted }}>{t("Bản demo dùng tài khoản do chủ dự án cấp.", "Use a demo account provided by the project owner.")}</Text>
      <Field c={c} label="Email" value={email} onChange={setEmail} />
      <Field c={c} label={t("Mật khẩu", "Password")} secret value={password} onChange={setPassword} />
      <Button c={c} disabled={!backend || busy || !!state.draft || !email.trim() || !password} label={t("Đăng nhập", "Sign in")} onPress={() => action(async () => {
        const { error } = await backend!.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; setPassword("");
      })} />
      <Button c={c} secondary disabled={busy} label={t("Tiếp tục dùng local", "Continue locally")} onPress={back} />
      {!backend && <Text style={{ color: c.muted }}>{t("Bản cài đặt chưa có cấu hình cloud.", "Cloud is not configured in this build.")}</Text>}
    </>}
    {!!state.draft && <Text style={{ color: c.muted }}>{t("Kết thúc và lưu phiên đọc để đồng bộ hoặc đổi tài khoản.", "Finish and save your reading session to sync or switch accounts.")}</Text>}
    {!!problem && <Text style={{ color: c.danger }}>{problem}</Text>}
  </View>;
}
