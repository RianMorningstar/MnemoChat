import { app } from "electron";
import path from "path";
import fs from "fs";

const SUPPORTED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".webm"];

function getTtsBaseDir(): string {
  const base = app.isPackaged
    ? path.join(app.getPath("userData"), "audio")
    : path.join(process.cwd(), "audio");
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

export function getTtsDir(characterId: string): string {
  const dir = path.join(getTtsBaseDir(), characterId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Returns the full file path if cached audio exists, null otherwise */
export function getTtsFilePath(characterId: string, messageId: string): string | null {
  const dir = path.join(getTtsBaseDir(), characterId);
  if (!fs.existsSync(dir)) return null;
  for (const ext of SUPPORTED_AUDIO_EXTENSIONS) {
    const filePath = path.join(dir, `${messageId}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/** Returns the relative path (for DB storage) */
export function getTtsRelativePath(characterId: string, messageId: string, ext = ".mp3"): string {
  return `${characterId}/${messageId}${ext}`;
}

/** Save audio buffer to disk and return the relative path */
export function saveTtsAudio(characterId: string, messageId: string, buffer: Buffer, ext = ".mp3"): string {
  const dir = getTtsDir(characterId);
  // Remove any existing audio for this message (different extensions)
  for (const e of SUPPORTED_AUDIO_EXTENSIONS) {
    const existing = path.join(dir, `${messageId}${e}`);
    if (fs.existsSync(existing)) fs.unlinkSync(existing);
  }
  fs.writeFileSync(path.join(dir, `${messageId}${ext}`), buffer);
  return getTtsRelativePath(characterId, messageId, ext);
}

/** Delete cached audio for a specific message */
export function deleteTtsAudio(characterId: string, messageId: string): boolean {
  const filePath = getTtsFilePath(characterId, messageId);
  if (!filePath) return false;
  fs.unlinkSync(filePath);
  return true;
}

/** Delete all cached audio for a character */
export function deleteAllTtsAudio(characterId: string): void {
  const dir = path.join(getTtsBaseDir(), characterId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
