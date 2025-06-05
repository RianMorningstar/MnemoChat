import type { WizardStep } from "@shared/types";

interface StepIndicatorProps {
  currentStep: WizardStep;
  totalSteps: number;
}

const stepLabels = ["Content", "Connect", "Model"];

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = (i + 1) as WizardStep;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 transition-colors duration-300 ${
                  isCompleted ? "bg-indigo-500" : "bg-zinc-700"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : isCompleted
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  isActive ? "text-zinc-200" : "text-zinc-500"
                }`}
              >
                {stepLabels[i]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
