export const NUM_HANDS = 2;

export const FIST_THRESHOLD_LOW = 1.1;
export const FIST_THRESHOLD_HIGH = 1.5;

export const SMOOTHING_ALPHA = 0.4;

export const PAN_SENSITIVITY_X = 2.5;
export const PAN_SENSITIVITY_Y = 2.5;

export const MAX_SCALE = 8;

// Two-finger point (index + middle extended, ring + pinky curled) thresholds.
// Same wrist-normalized tip distance scale as FIST_THRESHOLD_*.
export const POINT_EXTENDED_THRESHOLD = 1.6;
export const POINT_CURLED_THRESHOLD = 1.1;
export const POINT_HYSTERESIS = 0.15;

// Swipe detector (active while a hand is in `point` state).
export const SWIPE_DISTANCE_THRESHOLD = 0.18;
export const SWIPE_TIME_WINDOW_MS = 600;
export const SWIPE_COOLDOWN_MS = 700;
export const SWIPE_FLASH_MS = 300;

// POI dwell-to-activate.
export const DWELL_DURATION_MS = 800;
// Viewport-pixel offset of the cursor ring from the hand position.
// Negative X = left of hand (avoids the user's hand shadow on the projection).
export const CURSOR_OFFSET_X = -60;
export const CURSOR_OFFSET_Y = 0;

export interface PointOfInterest {
  id: string;
  x: number; // image-space px
  y: number;
  radius: number; // image-space px hit radius
  label: string;
}

// Coordinates target the bundled 2560x1600 world map (public/image.png).
export const POI_LIST: PointOfInterest[] = [
  { id: "europe", x: 1340, y: 560, radius: 90, label: "Europe" },
  { id: "americas", x: 720, y: 640, radius: 90, label: "Americas" },
  { id: "asia", x: 2010, y: 660, radius: 90, label: "Asia" },
];

export const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

export const HAND_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
