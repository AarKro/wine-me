import type {
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  FIST_THRESHOLD_HIGH,
  FIST_THRESHOLD_LOW,
  POINT_CURLED_THRESHOLD,
  POINT_EXTENDED_THRESHOLD,
  POINT_HYSTERESIS,
  SMOOTHING_ALPHA,
} from "./config";

export type HandKind = "Left" | "Right";
export type HandState = "open" | "grab" | "point";

export interface HandObs {
  kind: HandKind;
  state: HandState;
  position: { x: number; y: number };
}

export interface GestureFrame {
  hands: HandObs[];
}

const WRIST = 0;
const MIDDLE_MCP = 9;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

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

function classifyState(
  landmarks: NormalizedLandmark[],
  prev: HandState,
): HandState {
  const wrist = landmarks[WRIST];
  const palmScale = dist(wrist, landmarks[MIDDLE_MCP]);
  if (palmScale === 0) return prev;

  const norm = (idx: number) => dist(landmarks[idx], wrist) / palmScale;
  const index = norm(INDEX_TIP);
  const middle = norm(MIDDLE_TIP);
  const ring = norm(RING_TIP);
  const pinky = norm(PINKY_TIP);
  const avg = (index + middle + ring + pinky) / 4;

  // Fist takes priority. Hysteresis: easier to keep "grab" than to enter it.
  if (prev === "grab") {
    if (avg <= FIST_THRESHOLD_HIGH) return "grab";
  } else if (avg < FIST_THRESHOLD_LOW) {
    return "grab";
  }

  // Two-finger point: index + middle extended, ring + pinky curled.
  // Same hysteresis idea — wider acceptance band while already in `point`.
  const extendedT =
    prev === "point"
      ? POINT_EXTENDED_THRESHOLD - POINT_HYSTERESIS
      : POINT_EXTENDED_THRESHOLD;
  const curledT =
    prev === "point"
      ? POINT_CURLED_THRESHOLD + POINT_HYSTERESIS
      : POINT_CURLED_THRESHOLD;
  if (
    index > extendedT &&
    middle > extendedT &&
    ring < curledT &&
    pinky < curledT
  ) {
    return "point";
  }

  return "open";
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
    const state = classifyState(landmarks, prev?.state ?? "open");

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
