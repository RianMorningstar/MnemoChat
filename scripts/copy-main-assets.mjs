import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");

const fromDir = path.join(projectRoot, "build-resources");
const toDir = path.join(projectRoot, "dist", "main", "main", "assets");

await mkdir(toDir, { recursive: true });
await copyFile(path.join(fromDir, "icon.ico"), path.join(toDir, "icon.ico"));
await copyFile(path.join(fromDir, "icon.png"), path.join(toDir, "icon.png"));

console.log(`Copied icons to ${path.relative(projectRoot, toDir)}`);
