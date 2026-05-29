import { startCamera } from "./camera";
import { classify } from "./gesture";
import { detectHand, initHandTracker } from "./handTracker";
import { Panner } from "./panner";
import { frameStatus, setStatus, showError } from "./ui";

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

async function main(): Promise<void> {
  const video = $<HTMLVideoElement>("video");
  const image = $<HTMLImageElement>("image");
  const status = $<HTMLDivElement>("status");
  const error = $<HTMLDivElement>("error");

  try {
    await Promise.all([startCamera(video), initHandTracker()]);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to start camera or model.";
    showError(error, `Could not start: ${msg}`);
    return;
  }

  const panner = new Panner(image);
  setStatus(status, "none");

  const loop = () => {
    const result = detectHand(video, performance.now());
    const frame = classify(result);
    panner.update(frame);
    setStatus(status, frameStatus(frame));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

main();
