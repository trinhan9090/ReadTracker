import React, { createContext, useContext, useEffect, useRef } from "react";
import { Pressable as NativePressable, Text, type PressableProps } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

const SoundContext = createContext<() => void>(() => {});
const SoundStatus = createContext(false);
export function SoundProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const player = useAudioPlayer(require("../assets/tap.wav"), { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const lastTap = useRef(0);
  const active = useRef(enabled);
  active.current = enabled;
  useEffect(() => {
    player.volume = 0.7;
    void setAudioModeAsync({ interruptionMode: "mixWithOthers", playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  }, [player]);
  const play = () => {
    if (!active.current || !player.isLoaded || Date.now() - lastTap.current < 100) return;
    lastTap.current = Date.now();
    // A paused Android player may not resolve seek until playback starts.
    // Do not gate play() behind the seek promise.
    try { void player.seekTo(0).catch(() => {}); player.play(); } catch {}
  };
  return <SoundContext.Provider value={play}><SoundStatus.Provider value={status.isLoaded}>{children}</SoundStatus.Provider></SoundContext.Provider>;
}
export function SoundTest({ color, language }: { color: string; language: string }) {
  const play = useContext(SoundContext), loaded = useContext(SoundStatus);
  return <NativePressable accessibilityRole="button" onPress={play} style={{ padding: 14 }}><Text style={{ color }}>{loaded ? (language === "vi" ? "▶ Thử âm thanh (bật âm thanh trước)" : "▶ Test sound (enable sounds first)") : (language === "vi" ? "Đang tải âm thanh…" : "Loading sound…")}</Text></NativePressable>;
}
export function Pressable({ onPress, ...props }: PressableProps) {
  const play = useContext(SoundContext);
  return <NativePressable {...props} android_disableSound onPress={(event) => { play(); onPress?.(event); }} />;
}
