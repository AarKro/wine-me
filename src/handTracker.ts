import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  HAND_LANDMARKER_MODEL_URL,
  NUM_HANDS,
  WASM_BASE_URL,
} from "./config";

let landmarker: HandLandmarker | null = null;
let lastVideoTime = -1;
let lastResult: HandLandmarkerResult | null = null;

export async function initHandTracker(): Promise<void> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  try {
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_LANDMARKER_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: NUM_HANDS,
    });
  } catch (gpuErr) {
    console.warn("HandLandmarker GPU init failed, retrying on CPU:", gpuErr);
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_LANDMARKER_MODEL_URL,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numHands: NUM_HANDS,
    });
  }
}

export function detectHand(
  video: HTMLVideoElement,
  timestampMs: number,
): HandLandmarkerResult | null {
  if (!landmarker) return null;
  if (video.currentTime === lastVideoTime) return lastResult;
  lastVideoTime = video.currentTime;
  lastResult = landmarker.detectForVideo(video, timestampMs);
  return lastResult;
}
