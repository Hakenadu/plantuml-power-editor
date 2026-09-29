import { Injectable } from '@angular/core';

export interface PngOptions {
  scale: number;
  background: string | null;
}

/** Export helpers for the rendered SVG (download as SVG / PNG, clipboard). */
@Injectable({ providedIn: 'root' })
export class ExportService {
  /** Serializes an SVG string to a standalone, well-formed document. */
  normalizeSvg(svg: string): string {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
      new XMLSerializer().serializeToString(root)
    );
  }

  downloadSvg(svg: string, name: string): void {
    this.download(
      new Blob([this.normalizeSvg(svg)], { type: 'image/svg+xml;charset=utf-8' }),
      `${sanitize(name)}.svg`,
    );
  }

  async downloadPng(svg: string, name: string, opts: PngOptions): Promise<void> {
    const blob = await this.toPng(svg, opts);
    this.download(blob, `${sanitize(name)}${opts.scale !== 1 ? `@${opts.scale}x` : ''}.png`);
  }

  async copyPng(svg: string, opts: PngOptions): Promise<void> {
    // Safari requires the promise to be passed directly into ClipboardItem.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': this.toPng(svg, opts) })]);
  }

  async copySvg(svg: string): Promise<void> {
    await navigator.clipboard.writeText(this.normalizeSvg(svg));
  }

  async copyText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  }

  downloadText(text: string, name: string): void {
    this.download(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${sanitize(name)}.puml`);
  }

  svgSize(svg: string): { width: number; height: number } {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    const vb = root
      .getAttribute('viewBox')
      ?.split(/[\s,]+/)
      .map(Number);
    const width = parseFloat(root.getAttribute('width') ?? '') || vb?.[2] || 800;
    const height = parseFloat(root.getAttribute('height') ?? '') || vb?.[3] || 600;
    return { width, height };
  }

  async toPng(svg: string, { scale, background }: PngOptions): Promise<Blob> {
    const { width, height } = this.svgSize(svg);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    root.setAttribute('width', String(width));
    root.setAttribute('height', String(height));
    if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(root)], {
        type: 'image/svg+xml;charset=utf-8',
      }),
    );
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG konnte nicht in ein Bild umgewandelt werden'));
        img.src = url;
      });
      // Browsers cap canvas size; keep within ~16k px per side.
      const maxSide = 16_000;
      const s = Math.min(scale, maxSide / width, maxSide / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * s);
      canvas.height = Math.ceil(height * s);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas nicht verfügbar');
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('PNG-Erzeugung fehlgeschlagen'))),
          'image/png',
        ),
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function sanitize(name: string): string {
  return (
    (name || 'diagramm')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .trim()
      .slice(0, 120) || 'diagramm'
  );
}
