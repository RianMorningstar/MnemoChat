import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");

const svgPath = path.join(projectRoot, "src", "renderer", "assets", "mnemo-logo.svg");
const outDir = path.join(projectRoot, "build-resources");

const svg = await readFile(svgPath, "utf8");

function renderPng(size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });
  return resvg.render().asPng();
}

await mkdir(outDir, { recursive: true });

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoPngs = icoSizes.map((s) => renderPng(s));
const ico = await pngToIco(icoPngs);

await writeFile(path.join(outDir, "icon.ico"), ico);
await writeFile(path.join(outDir, "icon.png"), renderPng(512));

console.log(`Generated icons in ${path.relative(projectRoot, outDir)}`);
