import type { GestureFrame } from "./gesture";

export type Mode = "slides" | "viewer" | "detail";

export type Status = "none" | "open" | "pan" | "zoom" | "slide" | "swipe";

const STATUS_LABEL: Record<Status, string> = {
  none: "NO HAND",
  open: "OPEN",
  pan: "PAN",
  zoom: "ZOOM",
  slide: "SLIDE",
  swipe: "SWIPE",
};

export function frameStatus(
  frame: GestureFrame,
  mode: Mode,
  justSwiped: boolean,
): Status {
  if (justSwiped) return "swipe";
  if (frame.hands.length === 0) return "none";
  if (frame.hands.some((h) => h.state === "point")) return "slide";
  if (mode !== "viewer") return "open";
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
