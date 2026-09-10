import React, { createContext, useContext, useEffect, useRef } from "react";
import { Pressable as NativePressable, type PressableProps } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

const SoundContext = createContext<() => void>(() => {});
export function SoundProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const player = useAudioPlayer(require("../assets/tap.wav"));
  const pending = useRef(false);
  const active = useRef(enabled);
  active.current = enabled;
  useEffect(() => {
    player.volume = 0.25;
    void setAudioModeAsync({ interruptionMode: "mixWithOthers", playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  }, [player]);
  const play = () => {
    if (!active.current || pending.current || !player.isLoaded) return;
    pending.current = true;
    void player.seekTo(0).then(() => { if (active.current) player.play(); }).catch(() => {}).finally(() => { pending.current = false; });
  };
  return <SoundContext.Provider value={play}>{children}</SoundContext.Provider>;
}
export function Pressable({ onPress, ...props }: PressableProps) {
  const play = useContext(SoundContext);
  return <NativePressable {...props} android_disableSound onPress={(event) => { play(); onPress?.(event); }} />;
}
