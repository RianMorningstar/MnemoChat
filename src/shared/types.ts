// Shared TypeScript types between main and renderer processes
export * from "./character-types";
export * from "./chat-types";
export * from "./library-types";
export type {
  ProjectStatus,
  SceneStatus,
  PdfStyle,
  SegmentType,
  Project,
  CharacterRef,
  Scene,
  ContentBlock,
  ExportOptions,
  ExportSegment,
  ExportBlock,
  StoryStructureProps,
} from "./story-types";

/** Content tier selection — gates UI, prompts, and content visibility app-wide */
export type ContentTier = "sfw" | "nsfw";

/** Connection health state */
export type ConnectionState = "connected" | "unreachable" | "unknown";

/** Provider backend type */
export type ProviderType = "ollama" | "openai" | "anthropic" | "lm-studio" | "groq";

/** Default endpoint URL per provider */
export const PROVIDER_DEFAULT_ENDPOINTS: Record<ProviderType, string> = {
  ollama: "http://localhost:11434",
  "lm-studio": "http://localhost:1234",
  openai: "https://api.openai.com",
  groq: "https://api.groq.com/openai",
  anthropic: "https://api.anthropic.com",
};

/** Whether a provider requires an API key */
export const PROVIDER_REQUIRES_API_KEY: Record<ProviderType, boolean> = {
  ollama: false,
  "lm-studio": false,
  openai: true,
  groq: true,
  anthropic: true,
};

/** Human-readable provider labels */
export const PROVIDER_LABELS: Record<ProviderType, string> = {
  ollama: "Ollama",
  "lm-studio": "LM Studio",
  openai: "OpenAI",
  groq: "Groq",
  anthropic: "Anthropic",
};

/** Auto-derived model capability tags */
export type ModelTag = "roleplay" | "instruct" | "uncensored" | "vision" | "code";

/** Wizard step indices */
export type WizardStep = 1 | 2 | 3 | 4;

export interface ContentTierOption {
  id: ContentTier;
  label: string;
  description: string;
  requiresAgeConfirmation: boolean;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  isActive: boolean;
  defaultModel: string | null;
  contentTier: string | null;
  apiKey: string | null;
  createdAt: string;
  lastUsed: string | null;
}

export interface OllamaModel {
  name: string;
  displayName: string;
  parameterSize: string;
  parameterCount: number;
  contextWindow: number;
  tags: ModelTag[];
  isCommunityFavorite: boolean;
  sizeOnDisk: string;
  family: string;
}

export interface ConnectionStatus {
  profileId: string;
  profileName: string;
  state: ConnectionState;
  endpoint: string;
  defaultModel: string;
}

export interface WizardState {
  currentStep: WizardStep;
  totalSteps: number;
  completedSteps: WizardStep[];
  contentTier: ContentTier | null;
  connectionProfileId: string | null;
  selectedModelName: string | null;
}
