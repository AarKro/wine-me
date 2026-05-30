import type { SwipeDirection } from "./swipe";

export type SlideMode = "slides" | "viewer";
export type SlideEvent =
  | "next"
  | "prev"
  | "enter-viewer"
  | "leave-viewer"
  | null;

export class Slides {
  private container: HTMLDivElement;
  private imgs: HTMLImageElement[] = [];
  private index = 0;

  constructor(container: HTMLDivElement, urls: string[]) {
    this.container = container;
    for (const url of urls) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.draggable = false;
      this.container.appendChild(img);
      this.imgs.push(img);
    }
    if (this.imgs.length > 0) this.imgs[0].classList.add("active");
  }

  count(): number {
    return this.imgs.length;
  }

  setActive(visible: boolean): void {
    this.container.hidden = !visible;
  }

  navigate(dir: Exclude<SwipeDirection, null>, mode: SlideMode): SlideEvent {
    if (this.imgs.length === 0) return null;
    if (mode === "viewer") {
      return dir === "left" ? "leave-viewer" : null;
    }
    if (dir === "right") {
      if (this.index < this.imgs.length - 1) {
        this.setIndex(this.index + 1);
        return "next";
      }
      return "enter-viewer";
    }
    if (this.index > 0) {
      this.setIndex(this.index - 1);
      return "prev";
    }
    return null;
  }

  private setIndex(i: number): void {
    this.imgs[this.index].classList.remove("active");
    this.index = i;
    this.imgs[this.index].classList.add("active");
  }
}
