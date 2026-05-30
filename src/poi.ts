import {
  CURSOR_OFFSET_X,
  CURSOR_OFFSET_Y,
  DWELL_DURATION_MS,
  type PointOfInterest,
} from "./config";
import type { GestureFrame } from "./gesture";
import type { Panner } from "./panner";

const SVG_NS = "http://www.w3.org/2000/svg";

interface DwellAnchor {
  id: string;
  startTime: number;
}

export class PoiManager {
  private markersSvg: SVGSVGElement;
  private cursorEl: HTMLDivElement;
  private cursorRingEl: SVGCircleElement;
  private panner: Panner;
  private points: PointOfInterest[];
  private markers: Map<string, SVGCircleElement> = new Map();
  private dwell: DwellAnchor | null = null;
  private visible = false;

  constructor(
    markersSvg: SVGSVGElement,
    cursorEl: HTMLDivElement,
    cursorRingEl: SVGCircleElement,
    panner: Panner,
    points: PointOfInterest[],
  ) {
    this.markersSvg = markersSvg;
    this.cursorEl = cursorEl;
    this.cursorRingEl = cursorRingEl;
    this.panner = panner;
    this.points = points;

    for (const p of this.points) {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.setAttribute("r", String(p.radius));
      c.classList.add("poi");
      c.dataset.poiId = p.id;
      this.markersSvg.appendChild(c);
      this.markers.set(p.id, c);
    }
    this.setProgress(0);
  }

  setActive(visible: boolean): void {
    this.visible = visible;
    this.markersSvg.style.display = visible ? "" : "none";
    if (!visible) {
      this.cursorEl.hidden = true;
      this.clearGlow();
      this.dwell = null;
      this.setProgress(0);
    }
  }

  resetDwell(): void {
    this.dwell = null;
    this.setProgress(0);
    this.clearGlow();
  }

  update(frame: GestureFrame): string | null {
    if (!this.visible) return null;

    const open = frame.hands.find((h) => h.state === "open");
    if (!open) {
      this.cursorEl.hidden = true;
      this.clearGlow();
      this.dwell = null;
      this.setProgress(0);
      return null;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const handVx = open.position.x * vw;
    const handVy = open.position.y * vh;
    this.cursorEl.style.left = `${handVx + CURSOR_OFFSET_X}px`;
    this.cursorEl.style.top = `${handVy + CURSOR_OFFSET_Y}px`;
    this.cursorEl.hidden = false;

    const off = this.panner.getOffset();
    const s = this.panner.getScale();
    const ix = (handVx - off.x) / s;
    const iy = (handVy - off.y) / s;

    const hit = this.points.find(
      (p) => Math.hypot(p.x - ix, p.y - iy) < p.radius,
    );

    if (!hit) {
      this.clearGlow();
      this.dwell = null;
      this.setProgress(0);
      return null;
    }

    this.glow(hit.id);
    const now = performance.now();
    if (!this.dwell || this.dwell.id !== hit.id) {
      this.dwell = { id: hit.id, startTime: now };
    }
    const elapsed = now - this.dwell.startTime;
    this.setProgress(Math.min(1, elapsed / DWELL_DURATION_MS));

    if (elapsed >= DWELL_DURATION_MS) {
      const id = hit.id;
      this.dwell = null;
      this.setProgress(0);
      return id;
    }
    return null;
  }

  private glow(id: string): void {
    for (const [pid, el] of this.markers) {
      el.classList.toggle("glow", pid === id);
    }
  }

  private clearGlow(): void {
    for (const el of this.markers.values()) el.classList.remove("glow");
  }

  private setProgress(p: number): void {
    // pathLength=100 in the SVG, so dashoffset 0..100 maps to full..empty.
    this.cursorRingEl.style.strokeDashoffset = String(100 - p * 100);
  }
}
