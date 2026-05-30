import { startCamera } from "./camera";
import { classify } from "./gesture";
import { detectHand, initHandTracker } from "./handTracker";
import { Panner } from "./panner";
import { Slides, type SlideMode } from "./slides";
import { frameStatus, setStatus, showError } from "./ui";

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

function loadSlideUrls(): string[] {
  const mods = import.meta.glob<string>(
    "./assets/slides/*.{png,jpg,jpeg,webp,svg}",
    { eager: true, import: "default" },
  );
  return Object.keys(mods)
    .sort()
    .map((k) => mods[k]);
}

async function main(): Promise<void> {
  const video = $<HTMLVideoElement>("video");
  const image = $<HTMLImageElement>("image");
  const status = $<HTMLDivElement>("status");
  const error = $<HTMLDivElement>("error");
  const stage = $<HTMLDivElement>("stage");
  const slidesContainer = $<HTMLDivElement>("slides");

  try {
    await Promise.all([startCamera(video), initHandTracker()]);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to start camera or model.";
    showError(error, `Could not start: ${msg}`);
    return;
  }

  const panner = new Panner(image);
  const slides = new Slides(slidesContainer, loadSlideUrls());
  let mode: SlideMode = slides.count() > 0 ? "slides" : "viewer";
  slides.setActive(mode === "slides");
  stage.hidden = mode !== "viewer";

  setStatus(status, "none");

  const loop = () => {
    const frame = classify(detectHand(video, performance.now()));
    const evt = slides.update(frame, mode);
    if (mode === "slides" && evt === "enter-viewer") {
      mode = "viewer";
      slides.setActive(false);
      stage.hidden = false;
    } else if (mode === "viewer" && evt === "leave-viewer") {
      mode = "slides";
      slides.setActive(true);
      stage.hidden = true;
    } else if (mode === "viewer") {
      panner.update(frame);
    }
    setStatus(status, frameStatus(frame, mode, slides.justSwiped()));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

main();
