import React from "react";
import { Pressable as NativePressable, type PressableProps } from "react-native";
// Audio is temporarily disabled, including for previously enabled settings.
export function SoundProvider({ children }: { enabled: boolean; children: React.ReactNode }) { return <>{children}</>; }
export function Pressable(props: PressableProps) { return <NativePressable {...props} android_disableSound />; }
