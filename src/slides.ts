import {
  SWIPE_COOLDOWN_MS,
  SWIPE_DISTANCE_THRESHOLD,
  SWIPE_FLASH_MS,
  SWIPE_TIME_WINDOW_MS,
} from "./config";
import type { GestureFrame, HandKind } from "./gesture";

export type SlideMode = "slides" | "viewer";
export type SlideEvent =
  | "next"
  | "prev"
  | "enter-viewer"
  | "leave-viewer"
  | null;

interface SwipeAnchor {
  kind: HandKind;
  startX: number;
  startTime: number;
}

export class Slides {
  private container: HTMLDivElement;
  private imgs: HTMLImageElement[] = [];
  private index = 0;
  private anchor: SwipeAnchor | null = null;
  private cooldownUntil = 0;
  private flashUntil = 0;

  constructor(container: HTMLDivElement, urls: string[]) {
    this.container = container;
    for (const url of urls) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.draggable = false;
      this.container.appendChild(img);
      this.imgs.push(img);
    }
    if (this.imgs.length > 0) this.imgs[0].classList.add("active");
  }

  count(): number {
    return this.imgs.length;
  }

  setActive(visible: boolean): void {
    this.container.hidden = !visible;
  }

  justSwiped(): boolean {
    return performance.now() < this.flashUntil;
  }

  update(frame: GestureFrame, mode: SlideMode): SlideEvent {
    if (this.imgs.length === 0) return null;
    const now = performance.now();

    const pointHands = frame.hands.filter((h) => h.state === "point");
    if (pointHands.length !== 1) {
      this.anchor = null;
      return null;
    }
    const hand = pointHands[0];

    if (!this.anchor || this.anchor.kind !== hand.kind) {
      this.anchor = {
        kind: hand.kind,
        startX: hand.position.x,
        startTime: now,
      };
      return null;
    }

    if (now < this.cooldownUntil) return null;

    const dt = now - this.anchor.startTime;
    if (dt > SWIPE_TIME_WINDOW_MS) {
      this.anchor = {
        kind: hand.kind,
        startX: hand.position.x,
        startTime: now,
      };
      return null;
    }

    const dx = hand.position.x - this.anchor.startX;
    if (Math.abs(dx) < SWIPE_DISTANCE_THRESHOLD) return null;

    const direction: "next" | "prev" = dx > 0 ? "next" : "prev";
    this.cooldownUntil = now + SWIPE_COOLDOWN_MS;
    this.flashUntil = now + SWIPE_FLASH_MS;
    this.anchor = {
      kind: hand.kind,
      startX: hand.position.x,
      startTime: now,
    };

    return this.navigate(direction, mode);
  }

  private navigate(
    direction: "next" | "prev",
    mode: SlideMode,
  ): SlideEvent {
    if (mode === "viewer") {
      return direction === "prev" ? "leave-viewer" : null;
    }
    if (direction === "next") {
      if (this.index < this.imgs.length - 1) {
        this.setIndex(this.index + 1);
        return "next";
      }
      return "enter-viewer";
    }
    if (this.index > 0) {
      this.setIndex(this.index - 1);
      return "prev";
    }
    return null;
  }

  private setIndex(i: number): void {
    this.imgs[this.index].classList.remove("active");
    this.index = i;
    this.imgs[this.index].classList.add("active");
  }
}
