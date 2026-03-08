import { app } from "electron";
import path from "path";
import fs from "fs";

const SUPPORTED_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];

function getImageGenBaseDir(): string {
  const base = app.isPackaged
    ? path.join(app.getPath("userData"), "generated-images")
    : path.join(process.cwd(), "generated-images");
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

export function getImageGenDir(characterId: string): string {
  const dir = path.join(getImageGenBaseDir(), characterId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Returns the full file path if a generated image exists, null otherwise */
export function getImageGenFilePath(characterId: string, imageId: string): string | null {
  const dir = path.join(getImageGenBaseDir(), characterId);
  if (!fs.existsSync(dir)) return null;
  for (const ext of SUPPORTED_EXTENSIONS) {
    const filePath = path.join(dir, `${imageId}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/** Returns the relative path (for DB storage) */
export function getImageGenRelativePath(characterId: string, imageId: string, ext = ".png"): string {
  return `${characterId}/${imageId}${ext}`;
}

/** Save image buffer to disk and return the relative path */
export function saveGeneratedImage(characterId: string, imageId: string, buffer: Buffer, ext = ".png"): string {
  const dir = getImageGenDir(characterId);
  // Remove any existing image with a different extension
  for (const e of SUPPORTED_EXTENSIONS) {
    const existing = path.join(dir, `${imageId}${e}`);
    if (fs.existsSync(existing)) fs.unlinkSync(existing);
  }
  fs.writeFileSync(path.join(dir, `${imageId}${ext}`), buffer);
  return getImageGenRelativePath(characterId, imageId, ext);
}

/** Delete a specific generated image */
export function deleteGeneratedImageFile(characterId: string, imageId: string): boolean {
  const filePath = getImageGenFilePath(characterId, imageId);
  if (!filePath) return false;
  fs.unlinkSync(filePath);
  return true;
}

/** Delete all generated images for a character */
export function deleteAllGeneratedImages(characterId: string): void {
  const dir = path.join(getImageGenBaseDir(), characterId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
