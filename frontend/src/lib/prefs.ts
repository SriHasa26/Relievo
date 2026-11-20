// Large-text accessibility preference: persisted in localStorage, applied as a class on <html>.
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const read = () => {
  try { return localStorage.getItem("rr-large-text") === "1"; } catch { return false; }
};

export function setLargeText(on: boolean) {
  try { localStorage.setItem("rr-large-text", on ? "1" : "0"); } catch { /* storage blocked: still apply for this page */ }
  document.documentElement.classList.toggle("large-text", on);
  listeners.forEach((l) => l());
}

document.documentElement.classList.toggle("large-text", read());

export function useLargeText() {
  const on = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, read);
  return [on, setLargeText] as const;
}
