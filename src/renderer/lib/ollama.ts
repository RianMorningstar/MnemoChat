import type { OllamaModel, ModelTag } from "@shared/types";

export async function checkOllamaHealth(endpoint: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${endpoint}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

interface OllamaApiModel {
  name: string;
  size: number;
  details?: {
    parameter_size?: string;
    family?: string;
    quantization_level?: string;
  };
}

function parseParamCount(paramSize: string): number {
  const match = paramSize.match(/([\d.]+)\s*([BMK])/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "B") return num * 1_000_000_000;
  if (unit === "M") return num * 1_000_000;
  if (unit === "K") return num * 1_000;
  return num;
}

function inferTags(name: string): ModelTag[] {
  const lower = name.toLowerCase();
  const tags: ModelTag[] = [];
  if (/uncensored|abliterat/.test(lower)) tags.push("uncensored");
  if (/llava|vision|moondream/.test(lower)) tags.push("vision");
  if (/code|deepseek-coder|starcoder|codellama/.test(lower)) tags.push("code");
  if (/instruct/.test(lower)) tags.push("instruct");
  if (
    /roleplay|mythomax|noromaid|psyonic|lumimaid/.test(lower) ||
    tags.length === 0
  )
    tags.push("roleplay");
  return tags;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const COMMUNITY_FAVORITES = new Set([
  "llama3",
  "mistral",
  "mixtral",
  "gemma",
  "phi3",
  "qwen2",
  "command-r",
]);

export async function fetchOllamaModels(
  endpoint: string
): Promise<OllamaModel[]> {
  const res = await fetch(`${endpoint}/api/tags`);
  if (!res.ok) return [];
  const data = (await res.json()) as { models?: OllamaApiModel[] };
  if (!data.models) return [];

  return data.models.map((m) => {
    const paramSize = m.details?.parameter_size || "Unknown";
    const baseName = m.name.split(":")[0];
    return {
      name: m.name,
      displayName: m.name.replace(/:latest$/, ""),
      parameterSize: paramSize,
      parameterCount: parseParamCount(paramSize),
      contextWindow: 2048,
      tags: inferTags(m.name),
      isCommunityFavorite: COMMUNITY_FAVORITES.has(baseName),
      sizeOnDisk: formatBytes(m.size),
      family: m.details?.family || "unknown",
    };
  });
}
