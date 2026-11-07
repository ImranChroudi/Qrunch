/**
 * Client-side image optimisation shared by every upload surface (menu items,
 * categories, logos and covers).
 *
 * It resizes oversized images, re-encodes them as WebP and returns a smaller
 * `File`. When decoding or encoding is unavailable, or when the result would
 * not be smaller, the original file is returned unchanged so uploads never
 * fail because of optimisation.
 */

export type OptimizeImageOptions = {
  /** Longest edge, in pixels, after resizing. Defaults to 1600. */
  maxDimension?: number;
  /** WebP quality, 0–1. Defaults to 0.82. */
  quality?: number;
};

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;

function renameToWebp(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}.webp`;
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> decoder below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not decode image"));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob && blob.type === "image/webp" ? blob : null), "image/webp", quality);
  });
}

/**
 * Resizes and compresses an image, converting it to WebP when possible.
 *
 * ```ts
 * const optimised = await optimizeImage(file);
 * ```
 */
export async function optimizeImage(file: File, options: OptimizeImageOptions = {}): Promise<File> {
  if (typeof document === "undefined" || typeof HTMLCanvasElement === "undefined") {
    return file;
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  let decoded: Decoded;
  try {
    decoded = await decode(file);
  } catch {
    return file;
  }

  try {
    const { width, height } = decoded;
    if (!width || !height) return file;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const resized = targetWidth !== width || targetHeight !== height;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);

    const blob = await encode(canvas, quality);
    if (!blob) return file;

    // Skip re-uploading when the original is already smaller and untouched.
    if (!resized && blob.size >= file.size) return file;

    return new File([blob], renameToWebp(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    decoded.release();
  }
}