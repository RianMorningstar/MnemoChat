import { useState } from "react";
import type {
  ContentTier,
  ContentTierOption,
  ConnectionState,
  OllamaModel,
  ProviderType,
  WizardStep,
} from "@shared/types";
import { StepIndicator } from "./StepIndicator";
import { ContentTierStep } from "./ContentTierStep";
import { PersonaStep } from "./PersonaStep";
import { ConnectOllamaStep } from "./ConnectOllamaStep";
import { ModelPickerStep } from "./ModelPickerStep";
import { TitleBar } from "@/components/shell/TitleBar";

interface OnboardingWizardProps {
  contentTierOptions: ContentTierOption[];
  ollamaModels: OllamaModel[];
  connectionState: ConnectionState;
  detectedEndpoint: string | null;
  personaName: string;
  personaDescription: string;
  onChangePersonaName: (name: string) => void;
  onChangePersonaDescription: (description: string) => void;
  onSelectContentTier?: (tier: ContentTier) => void;
  onConfirmAge?: () => void;
  onConnectProvider?: (endpoint: string, type: ProviderType, apiKey: string | null) => void;
  onSelectModel?: (modelName: string) => void;
  onCompleteWizard?: () => void;
}

export function OnboardingWizard({
  contentTierOptions,
  ollamaModels,
  connectionState,
  detectedEndpoint,
  personaName,
  personaDescription,
  onChangePersonaName,
  onChangePersonaDescription,
  onSelectContentTier,
  onConfirmAge,
  onConnectProvider,
  onSelectModel,
  onCompleteWizard,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTier, setSelectedTier] = useState<ContentTier | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const handleNext = () => {
    setStep((s) => Math.min(s + 1, 4) as WizardStep);
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-zinc-950"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <TitleBar />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.05),transparent_60%)]" />

      <header className="relative z-10 flex justify-center px-6 pt-8">
        <StepIndicator currentStep={step} totalSteps={4} />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        {step === 1 && (
          <ContentTierStep
            options={contentTierOptions}
            selectedTier={selectedTier}
            onSelectTier={(tier) => {
              setSelectedTier(tier);
              onSelectContentTier?.(tier);
            }}
            onConfirmAge={onConfirmAge}
            onNext={handleNext}
          />
        )}

        {step === 2 && (
          <PersonaStep
            name={personaName}
            description={personaDescription}
            onChangeName={onChangePersonaName}
            onChangeDescription={onChangePersonaDescription}
            onNext={handleNext}
          />
        )}

        {step === 3 && (
          <ConnectOllamaStep
            connectionState={connectionState}
            detectedEndpoint={detectedEndpoint}
            modelCount={ollamaModels.length}
            onConnect={onConnectProvider}
            onNext={handleNext}
          />
        )}

        {step === 4 && (
          <ModelPickerStep
            models={ollamaModels}
            selectedModel={selectedModel}
            contentTier={selectedTier}
            onSelectModel={(name) => {
              setSelectedModel(name);
              onSelectModel?.(name);
            }}
            onComplete={onCompleteWizard}
          />
        )}
      </main>
    </div>
  );
}
