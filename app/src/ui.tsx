import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Book } from "./model";
export const light = {
  bg: "#F4F6F1",
  card: "#FFFFFF",
  ink: "#183C2D",
  muted: "#718075",
  line: "#DFE7DC",
  green: "#246B47",
  soft: "#E5EFDE",
  danger: "#B64B40",
};
export const dark = {
  bg: "#121D17",
  card: "#1D2D23",
  ink: "#EAF2E7",
  muted: "#A7B6A8",
  line: "#35463A",
  green: "#94CE9E",
  soft: "#2C4331",
  danger: "#F19C90",
};
export type Palette = typeof light;
export function Button({
  label,
  onPress,
  c,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  c: Palette;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? c.soft : c.green,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: secondary ? c.ink : c === dark ? "#122319" : "#FFF",
          fontWeight: "700",
          textAlign: "center",
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  c,
  numeric = false,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  c: Palette;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 7, marginBottom: 12 }}>
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "number-pad" : "default"}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        style={[
          styles.input,
          { color: c.ink, borderColor: c.line, backgroundColor: c.bg },
          multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Cover({
  book,
  c,
  large = false,
}: {
  book: Book;
  c: Palette;
  large?: boolean;
}) {
  return book.cover ? (
    <Image
      source={{ uri: book.cover }}
      style={{
        width: large ? 88 : 52,
        height: large ? 124 : 74,
        borderRadius: 7,
      }}
    />
  ) : (
    <View
      style={{
        width: large ? 88 : 52,
        height: large ? 124 : 74,
        backgroundColor: c.soft,
        borderRadius: 7,
        borderLeftWidth: 5,
        borderLeftColor: c.green,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: c.green,
          fontFamily: "serif",
          fontSize: large ? 40 : 25,
        }}
      >
        {book.title.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 15,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: { padding: 20, borderRadius: 22, borderWidth: 1, gap: 13 },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    minHeight: 48,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontSize: 16,
    minHeight: 48,
  },
  heading: { fontSize: 21, fontFamily: "serif" },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20 },
  stat: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 5,
    alignItems: "center",
    gap: 4,
  },
  history: { paddingVertical: 14, gap: 8, borderBottomWidth: 1 },
  tabs: { flexDirection: "row", borderTopWidth: 1, padding: 8, gap: 6 },
  tab: { flex: 1, alignItems: "center", padding: 9, borderRadius: 15, gap: 3 },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
