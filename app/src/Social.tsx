import React, { useEffect, useState } from "react";
import { Alert, BackHandler, Image, Text, View } from "react-native";
import type { Session as LoginSession } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import { backend } from "./backend";
import { Button, Field, type Palette } from "./ui";
import { liveSessions, type State } from "./model";
import { thumbnail, type Profile, type Friend } from "./online";
import { PublicProfile } from "./PublicProfile";

type Props = { account: LoginSession | null; state: State; commit: (s: State | ((current: State) => State)) => boolean; c: Palette; t: (vi: string, en: string) => string; openBooks: () => void; openSync: () => void; onNavigate: () => void };
function errorText(error: unknown) {
  const message = (error as { message?: string })?.message ?? "";
  if (message.includes("Invalid login")) return "Email hoặc mật khẩu không đúng / Incorrect email or password.";
  return "Không kết nối được. Kiểm tra mạng rồi thử lại / Could not connect. Please retry.";
}
export function Social({ account, state, commit, c, t, openBooks, openSync, onNavigate }: Props) {
  const [page, setPage] = useState<"home" | "edit" | "friends">("home");
  const [me, setMe] = useState<Profile | null>(null);
  const [view, setView] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { onNavigate(); }, [page, view?.id]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (view) { setView(null); return true; }
      if (page !== "home") { setPage("home"); return true; }
      return false;
    });
    return () => listener.remove();
  }, [page, view]);
  const uid = account?.user.id;
  async function refresh() {
    if (!uid || !backend) return;
    const { data, error } = await backend.from("rs_profiles").select("*").eq("id", uid).maybeSingle();
    if (error) setError(errorText(error)); else { setMe(data ?? { id: uid, name: "Reader", avatar: null, featured: [] }); setError(""); }
  }
  useEffect(() => { void refresh(); }, [uid]);
  const hours = (liveSessions(state).reduce((sum, s) => sum + s.seconds, 0) / 3600).toFixed(1);
  if (view) return <View style={{ gap: 14 }}><Button c={c} secondary label={t("← Quay lại", "← Back")} onPress={() => setView(null)} /><PublicProfile key={view.id} profile={view} c={c} t={t} onNavigate={onNavigate} /></View>;
  if (page === "friends" && uid) return <Friends uid={uid} c={c} t={t} view={setView} back={() => setPage("home")} />;
  if (page === "edit" && me) return <ProfileEditor profile={me} state={state} commit={commit} c={c} t={t} back={() => setPage("home")} saved={(p) => { setMe(p); setPage("home"); }} />;
  return <View style={{ gap: 16 }}>
    <Text style={{ color: c.ink, fontSize: 25, fontWeight: "700" }}>{account ? me?.name ?? t("Cá nhân", "Profile") : t("Hồ sơ trên máy", "Local profile")}</Text>
    {!!me?.avatar && <Image source={{ uri: me.avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />}
    <View style={{ padding: 20, backgroundColor: c.card, borderRadius: 16, gap: 6 }}><Text style={{ color: c.muted }}>{t("Tổng thời gian đọc", "Total reading time")}</Text><Text style={{ color: c.ink, fontSize: 30 }}>{hours} {t("giờ", "hours")}</Text></View>
    <Button c={c} secondary label={t("Sách của tôi →", "My books →")} onPress={openBooks} />
    {account ? <>
      <Button c={c} secondary disabled={!me} label={t("Chỉnh sửa hồ sơ →", "Edit profile →")} onPress={() => setPage("edit")} />
      <Button c={c} secondary label={t("Bạn bè →", "Friends →")} onPress={() => setPage("friends")} />
      <Button c={c} secondary disabled={!me} label={t("Xem hồ sơ public →", "View public profile →")} onPress={() => { if (me) setView(me); }} />
      <Text style={{ color: c.muted }}>{t("Quản lý tài khoản và đồng bộ trong Cài đặt.", "Manage your account and sync in Settings.")}</Text>
    </> : <><Text style={{ color: c.muted }}>{t("Bạn đang dùng local. Đăng nhập để lưu online và dùng hồ sơ public, bạn bè.", "Using local storage. Sign in for online storage, public profiles and friends.")}</Text><Button c={c} label={t("Đăng nhập →", "Sign in →")} onPress={openSync} /></>}
    {!!error && <><Text style={{ color: c.danger }}>{error}</Text><Button c={c} label={t("Thử lại", "Retry")} onPress={refresh} /></>}
  </View>;
}
function ProfileEditor({ profile, state, commit, c, t, back, saved }: { profile: Profile; state: State; commit: Props["commit"]; c: Palette; t: Props["t"]; back: () => void; saved: (p: Profile) => void }) {
  const [name, setName] = useState(profile.name), [avatar, setAvatar] = useState(profile.avatar);
  const [featured, setFeatured] = useState<(string | null)[]>(Array.from({ length: 3 }, (_, i) => profile.featured[i] ?? null));
  const [dropdown, setDropdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const books = state.books.filter(b => !b.deletedAt).sort((a, b) => Number(b.completed) - Number(a.completed) || a.title.localeCompare(b.title));
  function choose(index: number, id: string | null) {
    const apply = () => { setFeatured(current => current.map((value, i) => i === index ? id : value)); setDropdown(null); };
    const book = books.find(b => b.id === id);
    if (book && !book.completed) Alert.alert(t("Sách chưa đánh dấu đã xong", "Book is not marked finished"), t("Bạn vẫn muốn dùng cuốn này để giới thiệu bản thân? Trạng thái đọc của sách được giữ nguyên.", "Use this book to introduce yourself? Its reading status will stay unchanged."), [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Vẫn chọn", "Choose anyway"), onPress: apply }]);
    else apply();
  }
  async function save() {
    if (!name.trim()) { setError(t("Hãy nhập tên.", "Enter a name.")); return; }
    const ids = featured.filter((id): id is string => !!id && books.some(b => b.id === id));
    const run = async () => {
      setBusy(true); setError("");
      try {
        const next = { ...profile, name: name.trim().slice(0, 80), avatar, featured: ids };
        const { error } = await backend!.from("rs_profiles").upsert(next);
        if (error) throw error;
        if (!commit(current => ({ ...current, books: current.books.map(b => ids.includes(b.id) ? { ...b, visibility: "public" } : b) }))) {
          setError(t("Hồ sơ đã lưu, nhưng chưa lưu được sách trên máy. Hãy thử lại.", "Profile saved, but local books could not be saved. Retry.")); return;
        }
        saved(next);
      } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
    };
    if (books.some(b => ids.includes(b.id) && b.visibility !== "public")) Alert.alert("ReadSession", t("Sách được chọn sẽ chuyển thành public, gồm thông tin các phiên đọc. Nội dung ghi chú private vẫn được giữ riêng.", "Selected books become public, including session details. Private note text stays private."), [{ text: t("Hủy", "Cancel"), style: "cancel" }, { text: t("Lưu và công khai", "Save and publish"), onPress: () => { void run(); } }]);
    else await run();
  }
  return <View style={{ gap: 14 }}>
    <Button c={c} secondary disabled={busy} label={t("← Cá nhân", "← Profile")} onPress={back} />
    <Text style={{ color: c.ink, fontSize: 22 }}>{t("Chỉnh sửa hồ sơ", "Edit profile")}</Text>
    <Field c={c} label={t("Tên", "Name")} value={name} onChange={setName} />
    {avatar && <Image source={{ uri: avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />}
    <Button c={c} secondary disabled={busy} label={t("Chọn ảnh đại diện", "Choose avatar")} onPress={async () => {
      try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 }); if (!result.canceled) setAvatar(await thumbnail(result.assets[0].uri)); }
      catch { setError(t("Không mở được ảnh.", "Could not open image.")); }
    }} />
    {avatar && <Button c={c} secondary disabled={busy} label={t("Bỏ ảnh", "Remove avatar")} onPress={() => setAvatar(null)} />}
    <Text style={{ color: c.ink, fontSize: 19 }}>{t("3 cuốn sách nói về tôi", "3 books that tell my story")}</Text>
    <Text style={{ color: c.muted }}>{t("Sách đã xong nằm đầu danh sách. Chọn tối đa 3 cuốn khác nhau; bạn có thể để trống.", "Finished books appear first. Choose up to 3 different books; empty slots are allowed.")}</Text>
    {featured.map((id, index) => <View key={index} style={{ gap: 8 }}>
      <Button c={c} secondary disabled={busy} label={`${index + 1}. ${books.find(b => b.id === id)?.title ?? t("Chọn sách", "Choose book")} ${dropdown === index ? "▴" : "▾"}`} onPress={() => setDropdown(dropdown === index ? null : index)} />
      {dropdown === index && <View style={{ gap: 6, padding: 12, backgroundColor: c.card, borderRadius: 12 }}>
        <Button c={c} secondary label={t("Để trống", "Leave empty")} onPress={() => choose(index, null)} />
        {books.filter(b => !featured.includes(b.id) || b.id === id).map(b => <Button key={b.id} c={c} secondary label={`${b.completed ? "✓ " : ""}${b.title} · ${b.completed ? t("Đã xong", "Finished") : b.position ? t("Đang đọc", "Reading") : t("Chưa đọc", "Unread")}`} onPress={() => choose(index, b.id)} />)}
      </View>}
    </View>)}
    {!!error && <Text style={{ color: c.danger }}>{error}</Text>}
    <Button c={c} disabled={busy || !!state.draft} label={t("Lưu hồ sơ", "Save profile")} onPress={save} />
    {!!state.draft && <Text style={{ color: c.muted }}>{t("Lưu phiên đang đọc trước khi thay đổi hồ sơ.", "Save your reading session before editing your profile.")}</Text>}
  </View>;
}
function Friends({ uid, c, t, view, back }: { uid: string; c: Palette; t: Props["t"]; view: (p: Profile) => void; back: () => void }) {
  const [friends, setFriends] = useState<Friend[]>([]), [profiles, setProfiles] = useState<Profile[]>([]);
  const [results, setResults] = useState<Profile[]>([]), [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function refresh() {
    const { data, error } = await backend!.from("rs_friends").select("*");
    if (error) throw error;
    const relations = data ?? []; setFriends(relations);
    const ids = relations.map(f => f.sender === uid ? f.recipient : f.sender);
    if (!ids.length) { setProfiles([]); return; }
    const p = await backend!.from("rs_profiles").select("*").in("id", ids).order("name");
    if (p.error) throw p.error; setProfiles(p.data ?? []);
  }
  async function action(job: () => PromiseLike<unknown>) {
    setBusy(true); setError("");
    try { await job(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  useEffect(() => { void action(refresh); }, [uid]);
  async function change(job: () => PromiseLike<{ error: unknown }>) { const result = await job(); if (result.error) throw result.error; await refresh(); }
  const row = (p: Profile) => {
    const f = friends.find(f => f.sender === p.id || f.recipient === p.id);
    return <View key={p.id} style={{ padding: 14, borderRadius: 14, backgroundColor: c.card, gap: 10 }}>
      <Text style={{ color: c.ink, fontSize: 18 }}>{p.name}</Text>
      <Button c={c} secondary label={t("Xem hồ sơ →", "View profile →")} onPress={() => view(p)} />
      {!f && <Button c={c} disabled={busy} label={t("Kết bạn", "Add friend")} onPress={() => action(() => change(() => backend!.from("rs_friends").insert({ sender: uid, recipient: p.id })))} />}
      {f && !f.accepted && f.recipient === uid && <Button c={c} disabled={busy} label={t("Chấp nhận", "Accept")} onPress={() => action(() => change(() => backend!.from("rs_friends").update({ accepted: true }).eq("sender", p.id).eq("recipient", uid)))} />}
      {f && !f.accepted && f.sender === uid && <Text style={{ color: c.muted }}>{t("Đã gửi lời mời", "Request sent")}</Text>}
      {f && <Button c={c} secondary disabled={busy} label={f.accepted ? t("Hủy kết bạn", "Remove friend") : t("Hủy / từ chối", "Cancel / decline")} onPress={() => action(() => change(() => backend!.from("rs_friends").delete().eq("sender", f.sender).eq("recipient", f.recipient)))} />}
    </View>;
  };
  return <View style={{ gap: 14 }}>
    <Button c={c} secondary label={t("← Cá nhân", "← Profile")} onPress={back} />
    <Text style={{ color: c.ink, fontSize: 22 }}>{t("Bạn bè", "Friends")}</Text>
    <Button c={c} secondary disabled={busy} label={t("Tải lại", "Refresh")} onPress={() => action(refresh)} />
    {profiles.filter(p => friends.some(f => f.accepted && (f.sender === p.id || f.recipient === p.id))).map(row)}
    {!busy && !friends.some(f => f.accepted) && <Text style={{ color: c.muted }}>{t("Chưa có bạn bè.", "No friends yet.")}</Text>}
    {friends.some(f => !f.accepted) && <Text style={{ color: c.ink, fontSize: 18 }}>{t("Lời mời", "Requests")}</Text>}
    {profiles.filter(p => friends.some(f => !f.accepted && (f.sender === p.id || f.recipient === p.id))).map(row)}
    <Field c={c} label={t("Tìm bạn theo tên", "Find friends by name")} value={query} onChange={value => { setQuery(value); setResults([]); setSearched(false); }} />
    <Button c={c} secondary disabled={busy || !query.trim()} label={t("Tìm", "Search")} onPress={() => action(async () => {
      const escaped = query.trim().slice(0, 80).replace(/[\\%_]/g, "\\$&");
      const result = await backend!.from("rs_profiles").select("*").ilike("name", `%${escaped}%`).neq("id", uid).limit(30);
      if (result.error) throw result.error; setResults(result.data ?? []); setSearched(true);
    })} />
    {searched && !results.length && <Text style={{ color: c.muted }}>{t("Không tìm thấy.", "No matches.")}</Text>}
    {results.filter(p => !profiles.some(f => f.id === p.id)).map(row)}
    {!!error && <Text style={{ color: c.danger }}>{error}</Text>}
  </View>;
}
