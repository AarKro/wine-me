import type { GestureFrame } from "./gesture";

export type Status = "none" | "open" | "pan" | "zoom";

const STATUS_LABEL: Record<Status, string> = {
  none: "NO HAND",
  open: "OPEN",
  pan: "PAN",
  zoom: "ZOOM",
};

export function frameStatus(frame: GestureFrame): Status {
  if (frame.hands.length === 0) return "none";
  const grabbing = frame.hands.filter((h) => h.state === "grab").length;
  if (grabbing >= 2) return "zoom";
  if (grabbing === 1) return "pan";
  return "open";
}

export function setStatus(el: HTMLElement, status: Status): void {
  el.textContent = STATUS_LABEL[status];
  el.dataset.state = status;
}

export function showError(el: HTMLElement, message: string): void {
  el.textContent = message;
  el.hidden = false;
}
