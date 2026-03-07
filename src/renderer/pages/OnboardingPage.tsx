import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import type { ContentTier, ConnectionState, OllamaModel, ContentTierOption, ProviderType } from "@shared/types";
import { OnboardingWizard } from "@/components/onboarding";
import { getSetting, setSetting, createConnection, activateConnection, getConnections, createPersona, setDefaultPersona } from "@/lib/api";
import { checkProviderHealth, fetchProviderModels } from "@/lib/ollama";

const CONTENT_TIER_OPTIONS: ContentTierOption[] = [
  {
    id: "sfw",
    label: "Safe for Work",
    description:
      "Family-friendly content only. All NSFW content, characters, and prompts are hidden.",
    requiresAgeConfirmation: false,
  },
  {
    id: "nsfw",
    label: "Unrestricted",
    description:
      "Full access to all content types including mature themes and characters.",
    requiresAgeConfirmation: true,
  },
];

const DEFAULT_ENDPOINT = "http://localhost:11434";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>("unknown");
  const [endpoint, setEndpoint] = useState<string>(DEFAULT_ENDPOINT);
  const [providerType, setProviderType] = useState<ProviderType>("ollama");
  const [providerApiKey, setProviderApiKey] = useState<string | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedTier, setSelectedTier] = useState<ContentTier | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [personaName, setPersonaName] = useState("");
  const [personaDescription, setPersonaDescription] = useState("");

  // Check if onboarding already completed or a connection already exists
  useEffect(() => {
    Promise.all([
      getSetting("onboarding_completed").catch(() => null),
      getConnections().catch(() => []),
    ]).then(([setting, connections]) => {
      if (setting?.value === "true" || connections.length > 0) {
        navigate("/characters", { replace: true });
      } else {
        setLoading(false);
      }
    });
  }, [navigate]);

  // Auto-detect Ollama on startup
  const tryConnect = useCallback(
    async (ep: string, type: ProviderType = "ollama", apiKey: string | null = null) => {
      setConnectionState("unknown");
      setEndpoint(ep);
      setProviderType(type);
      setProviderApiKey(apiKey);
      const healthy = await checkProviderHealth(ep, type, apiKey ?? undefined);
      if (healthy) {
        setConnectionState("connected");
        const fetched = await fetchProviderModels(ep, type, apiKey ?? undefined);
        setModels(fetched);
      } else {
        setConnectionState("unreachable");
        setModels([]);
      }
    },
    []
  );

  useEffect(() => {
    tryConnect(DEFAULT_ENDPOINT, "ollama", null);
  }, [tryConnect]);

  const handleComplete = async () => {
    try {
      const profileId = crypto.randomUUID();
      const cleanEndpoint = endpoint.replace(/\/+$/, "");
      await createConnection({
        id: profileId,
        name: `${providerType === "ollama" ? "Local Ollama" : providerType.charAt(0).toUpperCase() + providerType.slice(1)}`,
        type: providerType,
        endpoint: cleanEndpoint,
        defaultModel: selectedModel || undefined,
        contentTier: selectedTier || undefined,
        apiKey: providerApiKey || undefined,
      });
      await activateConnection(profileId);

      // Create default persona
      if (personaName.trim()) {
        const persona = await createPersona({
          name: personaName.trim(),
          description: personaDescription.trim(),
        });
        await setDefaultPersona(persona.id);
      }

      await setSetting("onboarding_completed", "true");
      if (selectedTier) {
        await setSetting("content_tier", selectedTier);
      }
      navigate("/characters", { replace: true });
    } catch (err) {
      console.error("Onboarding completion failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <OnboardingWizard
      contentTierOptions={CONTENT_TIER_OPTIONS}
      ollamaModels={models}
      connectionState={connectionState}
      detectedEndpoint={endpoint}
      personaName={personaName}
      personaDescription={personaDescription}
      onChangePersonaName={setPersonaName}
      onChangePersonaDescription={setPersonaDescription}
      onSelectContentTier={setSelectedTier}
      onConnectProvider={tryConnect}
      onSelectModel={setSelectedModel}
      onCompleteWizard={handleComplete}
    />
  );
}
