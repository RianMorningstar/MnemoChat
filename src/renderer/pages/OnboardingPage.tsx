import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import type { ContentTier, ConnectionState, OllamaModel, ContentTierOption } from "@shared/types";
import { OnboardingWizard } from "@/components/onboarding";
import { getSetting, setSetting, createConnection, activateConnection } from "@/lib/api";
import { checkOllamaHealth, fetchOllamaModels } from "@/lib/ollama";

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
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedTier, setSelectedTier] = useState<ContentTier | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Check if onboarding already completed
  useEffect(() => {
    getSetting("onboarding_completed").then((setting) => {
      if (setting?.value === "true") {
        navigate("/dashboard", { replace: true });
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [navigate]);

  // Auto-detect Ollama
  const tryConnect = useCallback(async (ep: string) => {
    setConnectionState("unknown");
    setEndpoint(ep);
    const healthy = await checkOllamaHealth(ep);
    if (healthy) {
      setConnectionState("connected");
      const fetched = await fetchOllamaModels(ep);
      setModels(fetched);
    } else {
      setConnectionState("unreachable");
    }
  }, []);

  useEffect(() => {
    tryConnect(DEFAULT_ENDPOINT);
  }, [tryConnect]);

  const handleComplete = async () => {
    const profileId = crypto.randomUUID();
    await createConnection({
      id: profileId,
      name: "Local Ollama",
      endpoint,
      defaultModel: selectedModel || undefined,
      contentTier: selectedTier || undefined,
    });
    await activateConnection(profileId);
    await setSetting("onboarding_completed", "true");
    if (selectedTier) {
      await setSetting("content_tier", selectedTier);
    }
    navigate("/dashboard", { replace: true });
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
      onSelectContentTier={setSelectedTier}
      onConnectOllama={tryConnect}
      onSelectModel={setSelectedModel}
      onCompleteWizard={handleComplete}
    />
  );
}
