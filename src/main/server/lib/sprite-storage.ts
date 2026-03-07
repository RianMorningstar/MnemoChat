import { app } from "electron";
import path from "path";
import fs from "fs";
import type { SpriteInfo } from "../../../shared/expression-types";

const SUPPORTED_EXTENSIONS = [".png", ".webp", ".gif", ".jpg", ".jpeg"];

function getSpritesBaseDir(): string {
  const base = app.isPackaged
    ? path.join(app.getPath("userData"), "sprites")
    : path.join(process.cwd(), "sprites");
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

export function getSpritesDir(characterId: string): string {
  const dir = path.join(getSpritesBaseDir(), characterId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSpriteFilePath(characterId: string, expression: string): string | null {
  const dir = path.join(getSpritesBaseDir(), characterId);
  if (!fs.existsSync(dir)) return null;
  for (const ext of SUPPORTED_EXTENSIONS) {
    const filePath = path.join(dir, `${expression}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

export function listSprites(characterId: string): SpriteInfo[] {
  const dir = path.join(getSpritesBaseDir(), characterId);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const sprites: SpriteInfo[] = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;
    const expression = path.basename(file, ext).toLowerCase();
    sprites.push({
      expression,
      filename: file,
      url: `/api/sprites/${characterId}/${expression}`,
    });
  }
  return sprites;
}

export function saveSprite(characterId: string, expression: string, buffer: Buffer, ext = ".png"): void {
  const dir = getSpritesDir(characterId);
  // Remove any existing sprite for this expression (different extensions)
  for (const e of SUPPORTED_EXTENSIONS) {
    const existing = path.join(dir, `${expression}${e}`);
    if (fs.existsSync(existing)) fs.unlinkSync(existing);
  }
  fs.writeFileSync(path.join(dir, `${expression}${ext}`), buffer);
}

export function deleteSprite(characterId: string, expression: string): boolean {
  const filePath = getSpriteFilePath(characterId, expression);
  if (!filePath) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function deleteAllSprites(characterId: string): void {
  const dir = path.join(getSpritesBaseDir(), characterId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

export function extractZipSprites(characterId: string, zipBuffer: Buffer): string[] {
  // Dynamic import to avoid requiring adm-zip when not used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AdmZip = require("adm-zip");
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const imported: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const filename = path.basename(entry.entryName);
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;
    const expression = path.basename(filename, ext).toLowerCase();
    const data = entry.getData();
    saveSprite(characterId, expression, data, ext);
    imported.push(expression);
  }

  return imported;
}
