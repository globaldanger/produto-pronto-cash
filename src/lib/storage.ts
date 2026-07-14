import { supabase } from "@/integrations/supabase/client";
import { processImage } from "@/lib/image-processing";

const BUCKET = "product-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

async function signed(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (error || !data) throw error ?? new Error("Falha ao gerar URL");
  return data.signedUrl;
}

export async function uploadImage(file: File, prefix = "products"): Promise<string> {
  let mainFile: File = file;
  let thumbFile: File | null = null;
  try {
    const processed = await processImage(file);
    mainFile = processed.main;
    thumbFile = processed.thumb === processed.main ? null : processed.thumb;
  } catch {
    mainFile = file;
  }
  const ext = mainFile.type === "image/jpeg"
    ? "jpg"
    : (mainFile.name.split(".").pop() || "jpg").toLowerCase();
  const id = crypto.randomUUID();
  const mainPath = `${prefix}/${id}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(mainPath, mainFile, {
    cacheControl: "31536000",
    upsert: false,
    contentType: mainFile.type,
  });
  if (error) throw error;
  if (thumbFile) {
    const thumbPath = `${prefix}/${id}-thumb.jpg`;
    await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, thumbFile, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/jpeg",
      })
      .catch(() => undefined);
  }
  return signed(mainPath);
}

export const uploadProductImage = (f: File) => uploadImage(f, "products");

export async function deleteProductImage(url: string): Promise<void> {
  try {
    const match = url.match(/product-images\/([^?]+)/);
    if (!match) return;
    const mainPath = match[1];
    const thumbPath = mainPath.replace(/(\.[a-z0-9]+)$/i, "-thumb.jpg");
    await supabase.storage.from(BUCKET).remove([mainPath, thumbPath]);
  } catch {
    /* noop */
  }
}

/**
 * Derive the thumbnail URL for a stored image; falls back to the original
 * for older uploads that don't have a matching thumb variant.
 */
export function thumbFor(url: string | null | undefined): string | null {
  if (!url) return null;
  const [pathPart, query] = url.split("?");
  const swapped = pathPart.replace(/(\.[a-z0-9]+)$/i, "-thumb.jpg");
  if (swapped === pathPart) return url;
  return query ? `${swapped}?${query}` : swapped;
}