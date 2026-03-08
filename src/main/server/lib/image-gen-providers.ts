import type { ImageGenProviderType, ImageGenSettings } from "../../../shared/image-gen-types";
import { IMAGE_GEN_DEFAULTS } from "../../../shared/image-gen-types";

// ── Types ────────────────────────────────────────────────

export interface CallImageGenOptions {
  provider: ImageGenProviderType;
  prompt: string;
  negativePrompt?: string;
  settings?: ImageGenSettings;
  apiKey?: string;
  endpoint?: string;
}

export interface ImageGenResponse {
  buffer: Buffer;
  seed?: number;
  width: number;
  height: number;
  ext: string;
}

// ── AUTOMATIC1111 ────────────────────────────────────────

async function callAutomatic1111(opts: CallImageGenOptions): Promise<ImageGenResponse> {
  const endpoint = opts.endpoint || "http://127.0.0.1:7860";
  const s = opts.settings || {};
  const width = s.width || IMAGE_GEN_DEFAULTS.width;
  const height = s.height || IMAGE_GEN_DEFAULTS.height;

  const body: Record<string, unknown> = {
    prompt: opts.prompt,
    negative_prompt: opts.negativePrompt || s.negativePrompt || "",
    steps: s.steps || IMAGE_GEN_DEFAULTS.steps,
    cfg_scale: s.cfgScale || IMAGE_GEN_DEFAULTS.cfgScale,
    width,
    height,
    seed: s.seed ?? IMAGE_GEN_DEFAULTS.seed,
  };
  if (s.sampler) body.sampler_name = s.sampler;
  if (s.clipSkip) body.override_settings = { CLIP_stop_at_last_layers: s.clipSkip };

  const res = await fetch(`${endpoint}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`A1111 error ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as {
    images: string[];
    parameters: Record<string, unknown>;
    info: string;
  };
  if (!data.images?.length) throw new Error("A1111 returned no images");

  let seed: number | undefined;
  try {
    const info = JSON.parse(data.info);
    seed = info.seed;
  } catch { /* ignore */ }

  return {
    buffer: Buffer.from(data.images[0], "base64"),
    seed,
    width,
    height,
    ext: ".png",
  };
}

async function listAutomatic1111Models(endpoint: string): Promise<string[]> {
  const res = await fetch(`${endpoint}/sdapi/v1/sd-models`);
  if (!res.ok) throw new Error(`A1111 models error ${res.status}`);
  const data = (await res.json()) as Array<{ title: string; model_name: string }>;
  return data.map((m) => m.title);
}

async function listAutomatic1111Samplers(endpoint: string): Promise<string[]> {
  const res = await fetch(`${endpoint}/sdapi/v1/samplers`);
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ name: string }>;
  return data.map((s) => s.name);
}

// ── ComfyUI ──────────────────────────────────────────────

function buildComfyWorkflow(opts: CallImageGenOptions): Record<string, unknown> {
  const s = opts.settings || {};
  const width = s.width || IMAGE_GEN_DEFAULTS.width;
  const height = s.height || IMAGE_GEN_DEFAULTS.height;
  const seed = s.seed ?? IMAGE_GEN_DEFAULTS.seed;
  const actualSeed = seed === -1 ? Math.floor(Math.random() * 2 ** 32) : seed;

  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: actualSeed,
        steps: s.steps || IMAGE_GEN_DEFAULTS.steps,
        cfg: s.cfgScale || IMAGE_GEN_DEFAULTS.cfgScale,
        sampler_name: s.sampler || "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: s.model || "v1-5-pruned-emaonly.safetensors" },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: opts.prompt, clip: ["4", 1] },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: opts.negativePrompt || s.negativePrompt || "", clip: ["4", 1] },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "MnemoChat", images: ["8", 0] },
    },
  };
}

async function callComfyUI(opts: CallImageGenOptions): Promise<ImageGenResponse> {
  const endpoint = opts.endpoint || "http://127.0.0.1:8188";
  const s = opts.settings || {};
  const width = s.width || IMAGE_GEN_DEFAULTS.width;
  const height = s.height || IMAGE_GEN_DEFAULTS.height;

  const workflow = buildComfyWorkflow(opts);
  const clientId = crypto.randomUUID();

  // Queue the prompt
  const queueRes = await fetch(`${endpoint}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!queueRes.ok) {
    const errText = await queueRes.text();
    throw new Error(`ComfyUI queue error ${queueRes.status}: ${errText}`);
  }
  const { prompt_id } = (await queueRes.json()) as { prompt_id: string };

  // Poll for completion
  const maxWait = 300_000; // 5 minutes
  const pollInterval = 1_000;
  const start = Date.now();
  let outputImages: Array<{ filename: string; subfolder: string; type: string }> = [];

  while (Date.now() - start < maxWait) {
    const histRes = await fetch(`${endpoint}/history/${prompt_id}`);
    if (histRes.ok) {
      const history = (await histRes.json()) as Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }> }>;
      const entry = history[prompt_id];
      if (entry?.outputs) {
        // Find the SaveImage node output
        for (const nodeOutput of Object.values(entry.outputs)) {
          if (nodeOutput.images?.length) {
            outputImages = nodeOutput.images;
            break;
          }
        }
        if (outputImages.length) break;
      }
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  if (!outputImages.length) throw new Error("ComfyUI generation timed out or returned no images");

  const img = outputImages[0];
  const viewRes = await fetch(
    `${endpoint}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`,
  );
  if (!viewRes.ok) throw new Error(`ComfyUI view error ${viewRes.status}`);

  const arrayBuffer = await viewRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    width,
    height,
    ext: ".png",
  };
}

async function listComfyUIModels(endpoint: string): Promise<string[]> {
  try {
    const res = await fetch(`${endpoint}/object_info/CheckpointLoaderSimple`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      CheckpointLoaderSimple?: { input?: { required?: { ckpt_name?: [string[]] } } };
    };
    return data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
  } catch {
    return [];
  }
}

// ── OpenAI DALL-E ────────────────────────────────────────

async function callOpenAI(opts: CallImageGenOptions): Promise<ImageGenResponse> {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("OpenAI API key is required");

  const s = opts.settings || {};
  const model = s.model || "dall-e-3";
  const width = s.width || 1024;
  const height = s.height || 1024;

  // DALL-E only supports specific sizes
  const size = resolveDalleSize(model, width, height);

  const body: Record<string, unknown> = {
    model,
    prompt: opts.prompt,
    n: 1,
    size,
    response_format: "b64_json",
  };

  const endpoint = opts.endpoint || "https://api.openai.com";
  const res = await fetch(`${endpoint}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI image error ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as { data: Array<{ b64_json: string }> };
  if (!data.data?.length) throw new Error("OpenAI returned no images");

  const [w, h] = size.split("x").map(Number);
  return {
    buffer: Buffer.from(data.data[0].b64_json, "base64"),
    width: w,
    height: h,
    ext: ".png",
  };
}

function resolveDalleSize(model: string, width: number, height: number): string {
  if (model === "dall-e-2") {
    if (width <= 256 && height <= 256) return "256x256";
    if (width <= 512 && height <= 512) return "512x512";
    return "1024x1024";
  }
  // dall-e-3 and gpt-image-1
  if (width > height) return "1792x1024";
  if (height > width) return "1024x1792";
  return "1024x1024";
}

// ── Stability AI ─────────────────────────────────────────

async function callStabilityAI(opts: CallImageGenOptions): Promise<ImageGenResponse> {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("Stability AI API key is required");

  const s = opts.settings || {};
  const model = s.model || "stable-diffusion-xl-1024-v1-0";
  const width = s.width || IMAGE_GEN_DEFAULTS.width;
  const height = s.height || IMAGE_GEN_DEFAULTS.height;
  const endpoint = opts.endpoint || "https://api.stability.ai";

  const body = {
    text_prompts: [
      { text: opts.prompt, weight: 1 },
      ...(opts.negativePrompt || s.negativePrompt
        ? [{ text: opts.negativePrompt || s.negativePrompt || "", weight: -1 }]
        : []),
    ],
    cfg_scale: s.cfgScale || IMAGE_GEN_DEFAULTS.cfgScale,
    width,
    height,
    steps: s.steps || IMAGE_GEN_DEFAULTS.steps,
    samples: 1,
    seed: (s.seed ?? IMAGE_GEN_DEFAULTS.seed) === -1 ? 0 : (s.seed ?? 0),
  };

  const res = await fetch(`${endpoint}/v1/generation/${model}/text-to-image`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Stability AI error ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as {
    artifacts: Array<{ base64: string; seed: number; finishReason: string }>;
  };
  if (!data.artifacts?.length) throw new Error("Stability AI returned no images");

  return {
    buffer: Buffer.from(data.artifacts[0].base64, "base64"),
    seed: data.artifacts[0].seed,
    width,
    height,
    ext: ".png",
  };
}

// ── Pollinations.ai ──────────────────────────────────────

async function callPollinations(opts: CallImageGenOptions): Promise<ImageGenResponse> {
  const s = opts.settings || {};
  const width = s.width || IMAGE_GEN_DEFAULTS.width;
  const height = s.height || IMAGE_GEN_DEFAULTS.height;
  const seed = s.seed ?? IMAGE_GEN_DEFAULTS.seed;

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: "true",
  });
  if (seed !== -1) params.set("seed", String(seed));
  if (s.model) params.set("model", s.model);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(opts.prompt)}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Pollinations error ${res.status}: ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? ".jpg" : ".png";
  const arrayBuffer = await res.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    width,
    height,
    ext,
  };
}

// ── Public API ───────────────────────────────────────────

/** Call an image generation provider and return the raw image buffer */
export async function callImageGenProvider(opts: CallImageGenOptions): Promise<ImageGenResponse> {
  switch (opts.provider) {
    case "automatic1111":
      return callAutomatic1111(opts);
    case "comfyui":
      return callComfyUI(opts);
    case "openai":
      return callOpenAI(opts);
    case "stability":
      return callStabilityAI(opts);
    case "pollinations":
      return callPollinations(opts);
    default:
      throw new Error(`Unknown image generation provider: ${opts.provider}`);
  }
}

/** List available models for a provider */
export async function listImageGenModels(
  provider: ImageGenProviderType,
  endpoint?: string,
  apiKey?: string,
): Promise<string[]> {
  switch (provider) {
    case "automatic1111":
      return listAutomatic1111Models(endpoint || "http://127.0.0.1:7860");
    case "comfyui":
      return listComfyUIModels(endpoint || "http://127.0.0.1:8188");
    case "openai":
      return ["dall-e-2", "dall-e-3", "gpt-image-1"];
    case "stability":
      return ["stable-diffusion-xl-1024-v1-0", "sd3-medium", "sd3-large"];
    case "pollinations":
      return ["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"];
    default:
      return [];
  }
}

/** List available samplers for a provider (only A1111 supports dynamic list) */
export async function listImageGenSamplers(
  provider: ImageGenProviderType,
  endpoint?: string,
): Promise<string[]> {
  if (provider === "automatic1111") {
    return listAutomatic1111Samplers(endpoint || "http://127.0.0.1:7860");
  }
  return [];
}

/** Check if a provider endpoint is reachable */
export async function checkImageGenConnection(
  provider: ImageGenProviderType,
  endpoint: string,
  apiKey?: string,
): Promise<boolean> {
  try {
    switch (provider) {
      case "automatic1111": {
        const res = await fetch(`${endpoint}/sdapi/v1/sd-models`, { signal: AbortSignal.timeout(5000) });
        return res.ok;
      }
      case "comfyui": {
        const res = await fetch(`${endpoint}/system_stats`, { signal: AbortSignal.timeout(5000) });
        return res.ok;
      }
      case "openai": {
        // Just verify the key format — actual validation would cost money
        return !!apiKey && apiKey.startsWith("sk-");
      }
      case "stability": {
        const res = await fetch(`${endpoint}/v1/engines/list`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      }
      case "pollinations": {
        const res = await fetch("https://image.pollinations.ai/prompt/test?width=64&height=64&nologo=true", {
          signal: AbortSignal.timeout(10000),
        });
        return res.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}
