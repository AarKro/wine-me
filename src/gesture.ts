import type {
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  FIST_THRESHOLD_HIGH,
  FIST_THRESHOLD_LOW,
  SMOOTHING_ALPHA,
} from "./config";

export type HandKind = "Left" | "Right";
export type HandState = "open" | "grab";

export interface HandObs {
  kind: HandKind;
  state: HandState;
  position: { x: number; y: number };
}

export interface GestureFrame {
  hands: HandObs[];
}

const FINGERTIPS = [8, 12, 16, 20] as const;
const WRIST = 0;
const MIDDLE_MCP = 9;

interface PerHandState {
  state: HandState;
  smoothed: { x: number; y: number };
}

const trackers = new Map<HandKind, PerHandState>();

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function classifyOpenness(
  landmarks: NormalizedLandmark[],
  prev: HandState,
): HandState {
  const wrist = landmarks[WRIST];
  const palmScale = dist(wrist, landmarks[MIDDLE_MCP]);
  if (palmScale === 0) return prev;

  let sum = 0;
  for (const tip of FINGERTIPS) {
    sum += dist(landmarks[tip], wrist) / palmScale;
  }
  const avg = sum / FINGERTIPS.length;

  if (prev === "grab") {
    return avg > FIST_THRESHOLD_HIGH ? "open" : "grab";
  }
  return avg < FIST_THRESHOLD_LOW ? "grab" : "open";
}

export function classify(result: HandLandmarkerResult | null): GestureFrame {
  if (!result || result.landmarks.length === 0) {
    trackers.clear();
    return { hands: [] };
  }

  const seen = new Set<HandKind>();
  const out: HandObs[] = [];

  for (let i = 0; i < result.landmarks.length; i++) {
    const landmarks = result.landmarks[i];
    // Handedness is reported relative to the camera frame; because the
    // displayed video is mirrored (selfie view), swap left/right so the
    // label matches what the user perceives.
    const rawKind = result.handednesses[i]?.[0]?.categoryName ?? "Right";
    const kind: HandKind = rawKind === "Left" ? "Right" : "Left";
    if (seen.has(kind)) continue;
    seen.add(kind);

    const prev = trackers.get(kind);
    const state = classifyOpenness(landmarks, prev?.state ?? "open");

    const handMarker = landmarks[MIDDLE_MCP];
    const raw = { x: 1 - handMarker.x, y: handMarker.y };
    const smoothed = prev
      ? {
          x: prev.smoothed.x + (raw.x - prev.smoothed.x) * SMOOTHING_ALPHA,
          y: prev.smoothed.y + (raw.y - prev.smoothed.y) * SMOOTHING_ALPHA,
        }
      : raw;

    trackers.set(kind, { state, smoothed });
    out.push({ kind, state, position: { ...smoothed } });
  }

  for (const key of trackers.keys()) {
    if (!seen.has(key)) trackers.delete(key);
  }

  return { hands: out };
}
