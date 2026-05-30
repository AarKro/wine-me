export class Detail {
  private container: HTMLDivElement;
  private imgs: Map<string, HTMLImageElement> = new Map();
  private activeId: string | null = null;

  constructor(container: HTMLDivElement, urlsById: Record<string, string>) {
    this.container = container;
    for (const [id, url] of Object.entries(urlsById)) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.draggable = false;
      img.className = "detail-img";
      img.dataset.poiId = id;
      this.container.appendChild(img);
      this.imgs.set(id, img);
    }
  }

  has(poiId: string): boolean {
    return this.imgs.has(poiId);
  }

  show(poiId: string): void {
    const img = this.imgs.get(poiId);
    if (!img) return;
    if (this.activeId) {
      this.imgs.get(this.activeId)?.classList.remove("active");
    }
    img.classList.add("active");
    this.activeId = poiId;
    this.container.hidden = false;
  }

  hide(): void {
    if (this.activeId) {
      this.imgs.get(this.activeId)?.classList.remove("active");
      this.activeId = null;
    }
    this.container.hidden = true;
  }
}
