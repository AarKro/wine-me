import { MAX_SCALE, PAN_SENSITIVITY_X, PAN_SENSITIVITY_Y } from "./config";
import type { GestureFrame, HandObs } from "./gesture";

type Mode = "idle" | "pan" | "zoom";

interface PanAnchor {
  hand: { x: number; y: number };
  offset: { x: number; y: number };
}

interface ZoomAnchor {
  distance: number;
  scale: number;
  imgPoint: { x: number; y: number };
}

export class Panner {
  private img: HTMLImageElement;
  private extraTargets: (HTMLElement | SVGElement)[];
  private offset = { x: 0, y: 0 };
  private scale = 1;
  private mode: Mode = "idle";
  private panAnchor: PanAnchor | null = null;
  private zoomAnchor: ZoomAnchor | null = null;

  constructor(
    img: HTMLImageElement,
    extraTargets: (HTMLElement | SVGElement)[] = [],
  ) {
    this.img = img;
    this.extraTargets = extraTargets;
    this.img.style.transformOrigin = "0 0";
    for (const el of this.extraTargets) {
      (el as HTMLElement).style.transformOrigin = "0 0";
    }
    this.initialize();
    window.addEventListener("resize", () => this.applyClampAndTransform());
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offset.x, y: this.offset.y };
  }

  getScale(): number {
    return this.scale;
  }

  private initialize(): void {
    const apply = () => {
      const imgW = this.img.naturalWidth;
      const imgH = this.img.naturalHeight;
      if (imgW === 0 || imgH === 0) return;
      this.scale = Math.max(1, this.minScale());
      this.offset = {
        x: (window.innerWidth - imgW * this.scale) / 2,
        y: (window.innerHeight - imgH * this.scale) / 2,
      };
      this.applyClampAndTransform();
    };
    if (this.img.complete && this.img.naturalWidth > 0) {
      apply();
    } else {
      this.img.addEventListener("load", apply, { once: true });
    }
  }

  private minScale(): number {
    const imgW = this.img.naturalWidth;
    const imgH = this.img.naturalHeight;
    if (imgW === 0 || imgH === 0) return 1;
    return Math.max(window.innerWidth / imgW, window.innerHeight / imgH);
  }

  update(frame: GestureFrame): void {
    const grabbing = frame.hands.filter((h) => h.state === "grab");

    if (grabbing.length === 0) {
      this.mode = "idle";
      this.panAnchor = null;
      this.zoomAnchor = null;
      return;
    }

    if (grabbing.length === 1) {
      if (this.mode !== "pan") {
        this.mode = "pan";
        this.zoomAnchor = null;
        this.panAnchor = null;
      }
      this.handlePan(grabbing[0]);
      return;
    }

    // 2 hands grabbing.
    if (this.mode !== "zoom") {
      this.mode = "zoom";
      this.panAnchor = null;
      this.zoomAnchor = null;
    }
    this.handleZoom(grabbing[0], grabbing[1]);
  }

  private handlePan(hand: HandObs): void {
    if (!this.panAnchor) {
      this.panAnchor = {
        hand: { ...hand.position },
        offset: { ...this.offset },
      };
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx =
      (hand.position.x - this.panAnchor.hand.x) * vw * PAN_SENSITIVITY_X;
    const dy =
      (hand.position.y - this.panAnchor.hand.y) * vh * PAN_SENSITIVITY_Y;
    this.offset = {
      x: this.panAnchor.offset.x + dx,
      y: this.panAnchor.offset.y + dy,
    };
    this.applyClampAndTransform();
  }

  private handleZoom(a: HandObs, b: HandObs): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aPx = { x: a.position.x * vw, y: a.position.y * vh };
    const bPx = { x: b.position.x * vw, y: b.position.y * vh };
    const dist = Math.hypot(aPx.x - bPx.x, aPx.y - bPx.y);
    const mid = { x: (aPx.x + bPx.x) / 2, y: (aPx.y + bPx.y) / 2 };

    if (!this.zoomAnchor || dist < 1) {
      this.zoomAnchor = {
        distance: Math.max(dist, 1),
        scale: this.scale,
        imgPoint: {
          x: (mid.x - this.offset.x) / this.scale,
          y: (mid.y - this.offset.y) / this.scale,
        },
      };
      return;
    }

    const ratio = dist / this.zoomAnchor.distance;
    const minS = this.minScale();
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(minS, this.zoomAnchor.scale * ratio),
    );
    this.scale = newScale;
    this.offset = {
      x: mid.x - this.zoomAnchor.imgPoint.x * newScale,
      y: mid.y - this.zoomAnchor.imgPoint.y * newScale,
    };
    this.applyClampAndTransform();
  }

  private applyClampAndTransform(): void {
    const imgW = this.img.naturalWidth;
    const imgH = this.img.naturalHeight;
    if (imgW === 0 || imgH === 0) return;

    const minS = this.minScale();
    this.scale = Math.min(MAX_SCALE, Math.max(minS, this.scale));

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaledW = imgW * this.scale;
    const scaledH = imgH * this.scale;

    if (scaledW <= vw) {
      this.offset.x = (vw - scaledW) / 2;
    } else {
      this.offset.x = Math.min(0, Math.max(vw - scaledW, this.offset.x));
    }
    if (scaledH <= vh) {
      this.offset.y = (vh - scaledH) / 2;
    } else {
      this.offset.y = Math.min(0, Math.max(vh - scaledH, this.offset.y));
    }

    const t = `translate3d(${this.offset.x}px, ${this.offset.y}px, 0) scale(${this.scale})`;
    this.img.style.transform = t;
    for (const el of this.extraTargets) {
      (el as HTMLElement).style.transform = t;
    }
  }
}
