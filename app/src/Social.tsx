import React, { useEffect, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import type { Session as LoginSession } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import { backend } from "./backend";
import { Button, Field, type Palette } from "./ui";
import { guestLibrary } from "./storage";
import { privateImport, type State } from "./model";
import { thumbnail, type Profile, type PublicBook, type PublicNote, type Friend } from "./online";

function errorText(error: unknown) {
  const message = (error as { message?: string })?.message ?? "";
  if (message.includes("Invalid login")) return "Email hoặc mật khẩu không đúng / Incorrect email or password.";
  if (message.includes("Email not confirmed")) return "Tài khoản chưa xác nhận / Account not confirmed.";
  return "Không kết nối được. Kiểm tra mạng rồi thử lại / Could not connect. Please retry.";
}
function Avatar({ profile, c }: { profile: Profile; c: Palette }) {
  return profile.avatar ? <Image source={{ uri: profile.avatar }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.green, fontSize: 30 }}>{profile.name[0]?.toUpperCase()}</Text></View>;
}
function PublicProfile({ profile, c, t }: { profile: Profile; c: Palette; t: (a: string, b: string) => string }) {
  const [books, setBooks] = useState<PublicBook[]>([]), [notes, setNotes] = useState<PublicNote[]>([]), [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    setStatus(t("Đang tải…", "Loading…"));
    void Promise.all([
      backend!.from("rs_books").select("*").eq("owner", profile.id),
      backend!.from("rs_notes").select("*").eq("owner", profile.id),
    ]).then(([b, n]) => {
      if (!active) return;
      if (b.error || n.error) { setStatus(t("Không tải được hồ sơ. Quay lại và thử lại.", "Could not load profile. Go back and retry.")); return; }
      setBooks(b.data ?? []); setNotes(n.data ?? []); setStatus("");
    }).catch(() => { if (active) setStatus(t("Không kết nối được.", "Connection unavailable.")); });
    return () => { active = false; };
  }, [profile.id]);
  const row = (b: PublicBook) => <View key={b.id} style={{ padding: 14, gap: 8, borderRadius: 14, backgroundColor: c.card }}>
    {b.cover && <Image source={{ uri: b.cover }} style={{ width: 60, height: 85, borderRadius: 6 }} />}
    <Text style={{ color: c.ink, fontSize: 18, fontWeight: "700" }}>{b.title}</Text>
    <Text style={{ color: c.muted }}>{b.author} · {b.position}/{b.total}</Text>
    {!!b.reflection && <Text style={{ color: c.ink }}>{b.reflection}</Text>}
    {notes.filter((n) => n.book_id === b.id && n.note).map((n) => <Text key={n.id} style={{ color: c.muted }}>{n.date} · {n.note}</Text>)}
  </View>;
  return <View style={{ gap: 14 }}>
    <Avatar profile={profile} c={c} /><Text style={{ color: c.ink, fontSize: 25 }}>{profile.name}</Text>
    {!!status && <Text style={{ color: c.muted }}>{status}</Text>}
    <Text style={{ color: c.ink, fontSize: 19 }}>{t("3 cuốn sách này sẽ nói về tôi", "These 3 books tell my story")}</Text>
    {profile.featured.map((id) => books.find((b) => b.id === id)).filter((b): b is PublicBook => !!b).map(row)}
    <Text style={{ color: c.ink, fontSize: 19 }}>{t("Tủ sách public", "Public bookshelf")} · {books.length}</Text>
    {books.map(row)}
    {!books.length && !status && <Text style={{ color: c.muted }}>{t("Chưa có sách công khai.", "No public books yet.")}</Text>}
  </View>;
}

export function Social({ account, state, commit, c, t, syncStatus, sync, pull }: {
  account: LoginSession | null; state: State; commit: (s: State) => boolean; c: Palette;
  t: (a: string, b: string) => string; syncStatus: string; sync: () => void; pull: () => void;
}) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]), [friends, setFriends] = useState<Friend[]>([]);
  const [name, setName] = useState(""), [avatar, setAvatar] = useState<string | null>(null), [featured, setFeatured] = useState<string[]>([]);
  const [view, setView] = useState<Profile | null>(null), [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const uid = account?.user.id;
  async function refresh() {
    if (!uid || !backend) return;
    setBusy(true);
    try {
      const [p, f] = await Promise.all([backend.from("rs_profiles").select("*").order("name").limit(100), backend.from("rs_friends").select("*")]);
      if (p.error || f.error) throw p.error ?? f.error;
      setProfiles(p.data ?? []); setFriends(f.data ?? []);
      const me = p.data?.find((p) => p.id === uid);
      if (me) { setName(me.name); setAvatar(me.avatar); setFeatured(me.featured); }
      setStatus("");
    } catch (e) { setStatus(errorText(e)); } finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [uid]);
  async function action(job: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    try { const result = await job(); if (result.error) throw result.error; await refresh(); }
    catch (e) { setStatus(errorText(e)); } finally { setBusy(false); }
  }
  if (!backend) return <Text style={{ color: c.muted }}>{t("Bản build chưa được cấu hình server.", "Server is not configured in this build.")}</Text>;
  if (!account) return <View style={{ gap: 14 }}>
    <Text style={{ color: c.ink, fontSize: 22 }}>{t("Đăng nhập ReadSession", "Sign in to ReadSession")}</Text>
    <Text style={{ color: c.muted }}>{t("Dùng tài khoản demo do chủ dự án cấp. Khi đăng nhập, sách được lưu riêng theo tài khoản; phần public được chia sẻ với thành viên đã đăng nhập.", "Use a demo account supplied by the project owner. Libraries are separate per account; public content is visible to signed-in members.")}</Text>
    <Field c={c} label="Email" value={email} onChange={setEmail} />
    <Field c={c} label={t("Mật khẩu", "Password")} secret value={password} onChange={setPassword} />
    <Button c={c} disabled={busy || !!state.draft} label={t("Đăng nhập", "Sign in")} onPress={async () => {
      if (!email.trim() || !password) return;
      setBusy(true);
      try { const { error } = await backend!.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; setPassword(""); }
      catch (e) { setStatus(errorText(e)); } finally { setBusy(false); }
    }} />
    {!!state.draft && <Text style={{ color: c.muted }}>{t("Lưu phiên hiện tại trước khi đổi tài khoản.", "Save the current session before switching accounts.")}</Text>}
    {!!status && <Text style={{ color: c.danger }}>{status}</Text>}
  </View>;
  if (view) return <View style={{ gap: 14 }}><Button c={c} secondary label={t("← Quay lại", "← Back")} onPress={() => setView(null)} /><PublicProfile key={view.id} profile={view} c={c} t={t} /></View>;
  async function saveProfile() {
    if (!name.trim()) { setStatus(t("Nhập tên hiển thị.", "Enter a display name.")); return; }
    const selected = featured.filter((id) => state.books.some((b) => b.id === id && !b.deletedAt));
    const save = async () => {
      if (!commit({ ...state, books: state.books.map((b) => selected.includes(b.id) ? { ...b, visibility: "public" } : b) })) return;
      await action(() => backend!.from("rs_profiles").upsert({ id: uid, name: name.trim().slice(0, 80), avatar, featured: selected }));
    };
    if (state.books.some((b) => selected.includes(b.id) && b.visibility !== "public")) {
      Alert.alert("ReadSession", t("Các sách giới thiệu đang private sẽ chuyển thành public. Ghi chú riêng tư vẫn giữ riêng tư.", "Featured private books will become public. Private notes stay private."), [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Lưu và công khai sách", "Save and publish books"), onPress: () => { void save(); } }]);
    } else await save();
  }
  return <View style={{ gap: 14 }}>
    <Text style={{ color: c.ink, fontSize: 22 }}>{t("Hồ sơ của tôi", "My profile")}</Text>
    <Text style={{ color: c.muted }}>{account.user.email}</Text>
    <Text style={{ color: state.cloudDirty ? c.danger : c.muted }}>{syncStatus}</Text>
    <Button c={c} secondary label={t("Đồng bộ ngay", "Sync now")} disabled={!!state.draft} onPress={sync} />
    <Button c={c} secondary label={t("Tải bản cloud về máy", "Load cloud copy")} disabled={!!state.draft} onPress={() => Alert.alert("ReadSession", t("Thay dữ liệu tài khoản trên máy bằng bản cloud? Thay đổi chưa đồng bộ trên máy sẽ mất.", "Replace this account's local data with the cloud copy? Unsynced edits will be lost."), [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Tải về", "Load"), onPress: pull }])} />
    {!state.books.length && <Button c={c} secondary label={t("Nhập tủ sách ngoại tuyến trên máy", "Import this device's offline library")} onPress={() => {
      Alert.alert("ReadSession", t("Sao chép tủ sách ngoại tuyến vào tài khoản này và đồng bộ lên cloud? Tất cả sẽ bắt đầu ở private.", "Copy this device's offline library into this account and sync it to the cloud? Everything starts private."), [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Nhập", "Import"), onPress: () => commit({ ...privateImport(guestLibrary()), cloudRevision: state.cloudRevision ?? 0 }) }]);
    }} />}
    {avatar && <Image source={{ uri: avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />}
    <Field c={c} label={t("Tên hiển thị", "Display name")} value={name} onChange={setName} />
    <Button c={c} secondary label={t("Chọn ảnh đại diện", "Choose avatar")} onPress={async () => {
      try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 }); if (!result.canceled) setAvatar(await thumbnail(result.assets[0].uri)); }
      catch { setStatus(t("Không mở được ảnh.", "Could not open image.")); }
    }} />
    {avatar && <Button c={c} secondary label={t("Bỏ ảnh đại diện", "Remove avatar")} onPress={() => setAvatar(null)} />}
    <Text style={{ color: c.ink, fontSize: 18 }}>{t("3 cuốn sách này sẽ nói về tôi", "These 3 books tell my story")} · {featured.length}/3</Text>
    <Text style={{ color: c.muted }}>{t("Chọn tối đa 3 cuốn. Sách được giới thiệu sẽ là public; có thể bỏ chọn bất kỳ lúc nào.", "Choose up to 3 books. Featured books become public; you can deselect them anytime.")}</Text>
    {state.books.filter((b) => !b.deletedAt).map((b) => <Button key={b.id} c={c} secondary label={(featured.includes(b.id) ? "✓ " : "") + b.title} onPress={() => {
      if (featured.includes(b.id)) setFeatured(featured.filter((id) => id !== b.id));
      else if (featured.length < 3) setFeatured([...featured, b.id]);
      else setStatus(t("Chỉ chọn tối đa 3 cuốn.", "Choose up to 3 books."));
    }} />)}
    <Button c={c} disabled={busy || !!state.draft} label={t("Lưu hồ sơ", "Save profile")} onPress={saveProfile} />
    <Button c={c} secondary label={t("Xem hồ sơ public của tôi", "Preview my public profile")} onPress={() => { const p = profiles.find((p) => p.id === uid); if (p) setView(p); else setStatus(t("Lưu hồ sơ rồi tải lại trước.", "Save your profile and refresh first.")); }} />
    <Text style={{ color: c.ink, fontSize: 22 }}>{t("Bạn bè & thành viên", "Friends & members")}</Text>
    <Button c={c} secondary disabled={busy} label={t("Tải lại danh sách", "Refresh members")} onPress={refresh} />
    <Field c={c} label={t("Tìm tên thành viên", "Find member by name")} value={search} onChange={setSearch} />
    {profiles.filter((p) => p.id !== uid && p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((p) => {
      const relation = friends.find((f) => f.sender === p.id || f.recipient === p.id);
      return <View key={p.id} style={{ padding: 14, backgroundColor: c.card, gap: 8, borderRadius: 14 }}>
        <Avatar c={c} profile={p} /><Text style={{ color: c.ink, fontSize: 18 }}>{p.name}</Text>
        <Text style={{ color: c.muted }}>{relation?.accepted ? t("Bạn bè", "Friends") : relation ? t("Lời mời đang chờ", "Request pending") : ""}</Text>
        <Button c={c} secondary label={t("Xem trang cá nhân", "View profile")} onPress={() => setView(p)} />
        {!relation && <Button c={c} disabled={busy} label={t("Kết bạn", "Add friend")} onPress={() => action(() => backend!.from("rs_friends").insert({ sender: uid, recipient: p.id }))} />}
        {relation && !relation.accepted && relation.recipient === uid && <Button c={c} disabled={busy} label={t("Chấp nhận", "Accept")} onPress={() => action(() => backend!.from("rs_friends").update({ accepted: true }).eq("sender", p.id).eq("recipient", uid!))} />}
        {relation && <Button c={c} secondary disabled={busy} label={relation.accepted ? t("Hủy kết bạn", "Remove friend") : t("Hủy / từ chối lời mời", "Cancel / decline request")} onPress={() => action(() => backend!.from("rs_friends").delete().eq("sender", relation.sender).eq("recipient", relation.recipient))} />}
      </View>;
    })}
    {!!status && <Text style={{ color: c.danger }}>{status}</Text>}
    <Button c={c} secondary disabled={busy || !!state.draft} label={t("Đăng xuất", "Sign out")} onPress={() => action(() => backend!.auth.signOut({ scope: "local" }))} />
  </View>;
}
