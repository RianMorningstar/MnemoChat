import { API_BASE } from "@/env";
import type { OllamaModel, ModelTag, ProviderType } from "@shared/types";

export async function checkProviderHealth(
  endpoint: string,
  type: ProviderType = "ollama",
  apiKey?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/ollama/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, type, apiKey }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok: boolean };
    return data.ok;
  } catch {
    return false;
  }
}

/** @deprecated Use checkProviderHealth instead */
export async function checkOllamaHealth(endpoint: string): Promise<boolean> {
  return checkProviderHealth(endpoint, "ollama");
}

interface RawModel {
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
  if (bytes === 0) return "Cloud";
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

function mapRawModel(m: RawModel): OllamaModel {
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
}

export async function fetchProviderModels(
  endpoint: string,
  type: ProviderType = "ollama",
  apiKey?: string
): Promise<OllamaModel[]> {
  const res = await fetch(`${API_BASE}/api/ollama/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, type, apiKey }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { models?: RawModel[] };
  if (!data.models) return [];
  return data.models.map(mapRawModel);
}

/** @deprecated Use fetchProviderModels instead */
export async function fetchOllamaModels(endpoint: string): Promise<OllamaModel[]> {
  return fetchProviderModels(endpoint, "ollama");
}
