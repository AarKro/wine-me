import { startCamera } from "./camera";
import { POI_LIST } from "./config";
import { Detail } from "./detail";
import { classify } from "./gesture";
import { detectHand, initHandTracker } from "./handTracker";
import { Panner } from "./panner";
import { PoiManager } from "./poi";
import { Slides } from "./slides";
import { SwipeDetector } from "./swipe";
import { type Mode, frameStatus, setStatus, showError } from "./ui";

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

function $svg<T extends SVGElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as unknown as T;
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

function loadDetailUrls(): Record<string, string> {
  const mods = import.meta.glob<string>(
    "./assets/details/*.{png,jpg,jpeg,webp,svg}",
    { eager: true, import: "default" },
  );
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(mods)) {
    const file = path.split("/").pop() ?? "";
    const id = file.replace(/\.[^.]+$/, "");
    out[id] = url;
  }
  return out;
}

async function main(): Promise<void> {
  const video = $<HTMLVideoElement>("video");
  const image = $<HTMLImageElement>("image");
  const status = $<HTMLDivElement>("status");
  const error = $<HTMLDivElement>("error");
  const stage = $<HTMLDivElement>("stage");
  const slidesContainer = $<HTMLDivElement>("slides");
  const detailContainer = $<HTMLDivElement>("detail");
  const cursor = $<HTMLDivElement>("cursor");
  const markersSvg = $svg<SVGSVGElement>("markers");
  const cursorRing = cursor.querySelector<SVGCircleElement>(".ring-progress");
  if (!cursorRing) throw new Error("Missing #cursor .ring-progress");

  try {
    await Promise.all([startCamera(video), initHandTracker()]);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to start camera or model.";
    showError(error, `Could not start: ${msg}`);
    return;
  }

  const panner = new Panner(image, [markersSvg]);
  const slides = new Slides(slidesContainer, loadSlideUrls());
  const detail = new Detail(detailContainer, loadDetailUrls());
  const poi = new PoiManager(markersSvg, cursor, cursorRing, panner, POI_LIST);
  const swipe = new SwipeDetector();

  for (const p of POI_LIST) {
    if (!detail.has(p.id)) {
      console.warn(
        `[poi] No detail asset for "${p.id}" — activation will be ignored.`,
      );
    }
  }

  let mode: Mode = slides.count() > 0 ? "slides" : "viewer";
  slides.setActive(mode === "slides");
  stage.hidden = mode !== "viewer";
  poi.setActive(mode === "viewer");

  setStatus(status, "none");

  const loop = () => {
    const frame = classify(detectHand(video, performance.now()));
    const dir = swipe.update(frame);

    if (mode === "slides") {
      if (dir) {
        const evt = slides.navigate(dir, "slides");
        if (evt === "enter-viewer") {
          mode = "viewer";
          slides.setActive(false);
          stage.hidden = false;
          poi.setActive(true);
        }
      }
    } else if (mode === "viewer") {
      if (dir === "left") {
        const evt = slides.navigate("left", "viewer");
        if (evt === "leave-viewer") {
          mode = "slides";
          slides.setActive(true);
          stage.hidden = true;
          poi.setActive(false);
        }
      } else {
        panner.update(frame);
        const activated = poi.update(frame);
        if (activated && detail.has(activated)) {
          mode = "detail";
          poi.setActive(false);
          detail.show(activated);
        }
      }
    } else {
      if (dir) {
        mode = "viewer";
        detail.hide();
        poi.setActive(true);
        poi.resetDwell();
      }
    }

    setStatus(status, frameStatus(frame, mode, swipe.justSwiped()));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

main();
