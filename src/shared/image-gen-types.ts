/** Image generation provider identifiers */
export type ImageGenProviderType =
  | "automatic1111"
  | "comfyui"
  | "openai"
  | "stability"
  | "pollinations";

/** Generation settings — per-preset or per-character overrides */
export interface ImageGenSettings {
  steps?: number;
  cfgScale?: number;
  width?: number;
  height?: number;
  sampler?: string;
  model?: string;
  negativePrompt?: string;
  seed?: number;
  clipSkip?: number;
}

/** Request body for POST /api/image-gen/generate */
export interface ImageGenRequest {
  prompt: string;
  negativePrompt?: string;
  characterId?: string;
  chatId?: string;
  messageId?: string;
  settings?: ImageGenSettings;
  provider?: ImageGenProviderType;
  endpoint?: string;
  apiKey?: string;
}

/** Result returned from generation or gallery queries */
export interface ImageGenResult {
  id: string;
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  provider: ImageGenProviderType;
  settings: ImageGenSettings;
  characterId?: string;
  chatId?: string;
  messageId?: string;
  width: number;
  height: number;
  seed?: number;
  createdAt: string;
}

/** Provider metadata for UI display and config */
export interface ImageGenProviderInfo {
  label: string;
  needsApiKey: boolean;
  defaultEndpoint: string;
}

export const IMAGE_GEN_PROVIDER_INFO: Record<ImageGenProviderType, ImageGenProviderInfo> = {
  automatic1111: {
    label: "Stable Diffusion WebUI (A1111)",
    needsApiKey: false,
    defaultEndpoint: "http://127.0.0.1:7860",
  },
  comfyui: {
    label: "ComfyUI",
    needsApiKey: false,
    defaultEndpoint: "http://127.0.0.1:8188",
  },
  openai: {
    label: "OpenAI DALL-E",
    needsApiKey: true,
    defaultEndpoint: "https://api.openai.com",
  },
  stability: {
    label: "Stability AI",
    needsApiKey: true,
    defaultEndpoint: "https://api.stability.ai",
  },
  pollinations: {
    label: "Pollinations.ai (Free)",
    needsApiKey: false,
    defaultEndpoint: "https://image.pollinations.ai",
  },
};

/** OpenAI image models */
export const OPENAI_IMAGE_MODELS = ["dall-e-2", "dall-e-3", "gpt-image-1"] as const;
export type OpenAiImageModel = (typeof OPENAI_IMAGE_MODELS)[number];

/** Stability AI models */
export const STABILITY_MODELS = [
  "stable-diffusion-xl-1024-v1-0",
  "sd3-medium",
  "sd3-large",
] as const;
export type StabilityModel = (typeof STABILITY_MODELS)[number];

/** Common resolution presets */
export const IMAGE_RESOLUTIONS = [
  { label: "512 × 512", width: 512, height: 512 },
  { label: "512 × 768", width: 512, height: 768 },
  { label: "768 × 512", width: 768, height: 512 },
  { label: "768 × 768", width: 768, height: 768 },
  { label: "1024 × 1024", width: 1024, height: 1024 },
  { label: "1024 × 768", width: 1024, height: 768 },
  { label: "768 × 1024", width: 768, height: 1024 },
  { label: "1536 × 1024", width: 1536, height: 1024 },
  { label: "1024 × 1536", width: 1024, height: 1536 },
] as const;

/** Default settings for new configurations */
export const IMAGE_GEN_DEFAULTS: Required<
  Pick<ImageGenSettings, "steps" | "cfgScale" | "width" | "height" | "seed">
> = {
  steps: 20,
  cfgScale: 7,
  width: 512,
  height: 512,
  seed: -1,
};
