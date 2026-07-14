// Client-side image processing: resize + compress + generate thumbnail.

const MAX_MAIN = 1600;
const THUMB_SIZE = 400;
const MAIN_QUALITY = 0.82;
const THUMB_QUALITY = 0.78;

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function drawTo(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  name: string,
  quality: number,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("Falha ao codificar imagem");
  return new File([blob], name, { type: "image/jpeg" });
}

export interface ProcessedImage {
  main: File;
  thumb: File;
}

/**
 * Compress a user-selected image and generate a small thumbnail.
 * SVGs and GIFs are returned unchanged.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const type = file.type.toLowerCase();
  if (type === "image/svg+xml" || type === "image/gif") {
    return { main: file, thumb: file };
  }
  if (!type.startsWith("image/")) {
    throw new Error("Arquivo não é uma imagem");
  }
  const img = await fileToImage(file);
  const mainCanvas = drawTo(img, MAX_MAIN);
  const thumbCanvas = drawTo(img, THUMB_SIZE);
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  const [main, thumb] = await Promise.all([
    canvasToFile(mainCanvas, `${base}.jpg`, MAIN_QUALITY),
    canvasToFile(thumbCanvas, `${base}-thumb.jpg`, THUMB_QUALITY),
  ]);
  return { main, thumb };
}