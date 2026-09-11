import type { AlertButton } from "react-native";
export const Alert = { alert(title: string, message = "", buttons?: AlertButton[]) {
  const text = title + "\n\n" + message;
  if (!buttons?.length) { window.alert(text); return; }
  const choices = buttons.filter(b => b.style !== "cancel");
  if (choices.length === 1) {
    if (window.confirm(text + "\n\n" + choices[0].text)) choices[0].onPress?.();
    else buttons.find(b => b.style === "cancel")?.onPress?.();
  } else {
    const answer = window.prompt(text + "\n\n" + choices.map((b,i) => (i+1) + ". " + b.text).join("\n"));
    const index = Number(answer) - 1;
    if (answer && Number.isInteger(index) && choices[index]) choices[index].onPress?.();
  }
} };
