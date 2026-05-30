import {
  SWIPE_COOLDOWN_MS,
  SWIPE_DISTANCE_THRESHOLD,
  SWIPE_FLASH_MS,
  SWIPE_TIME_WINDOW_MS,
} from "./config";
import type { GestureFrame, HandKind } from "./gesture";

export type SwipeDirection = "left" | "right" | null;

interface Anchor {
  kind: HandKind;
  startX: number;
  startTime: number;
}

export class SwipeDetector {
  private anchor: Anchor | null = null;
  private cooldownUntil = 0;
  private flashUntil = 0;

  update(frame: GestureFrame): SwipeDirection {
    const now = performance.now();

    const points = frame.hands.filter((h) => h.state === "point");
    if (points.length !== 1) {
      this.anchor = null;
      return null;
    }
    const hand = points[0];

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

    this.cooldownUntil = now + SWIPE_COOLDOWN_MS;
    this.flashUntil = now + SWIPE_FLASH_MS;
    this.anchor = {
      kind: hand.kind,
      startX: hand.position.x,
      startTime: now,
    };
    return dx > 0 ? "right" : "left";
  }

  justSwiped(): boolean {
    return performance.now() < this.flashUntil;
  }
}
