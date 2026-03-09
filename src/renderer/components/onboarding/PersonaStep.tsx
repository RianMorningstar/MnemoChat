import { useTranslation } from "react-i18next";
import { User } from "lucide-react";

interface PersonaStepProps {
  name: string;
  description: string;
  onChangeName: (name: string) => void;
  onChangeDescription: (description: string) => void;
  onNext?: () => void;
}

export function PersonaStep({
  name,
  description,
  onChangeName,
  onChangeDescription,
  onNext,
}: PersonaStepProps) {
  const { t } = useTranslation('onboarding');
  const canProceed = name.trim().length > 0;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20">
        <User className="h-7 w-7 text-indigo-400" strokeWidth={1.5} />
      </div>

      <h2
        className="mb-2 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        {t('persona.title')}
      </h2>
      <p className="mb-10 max-w-md text-center text-zinc-500">
        {t('persona.subtitle')}
      </p>

      <div className="w-full max-w-md space-y-5">
        <div>
          <label
            htmlFor="persona-name"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            {t('persona.displayName')}
          </label>
          <input
            id="persona-name"
            type="text"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder={t('persona.namePlaceholder')}
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="persona-description"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            {t('persona.description')}{" "}
            <span className="text-zinc-600">{t('persona.descriptionOptional')}</span>
          </label>
          <textarea
            id="persona-description"
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder={t('persona.descriptionPlaceholder')}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`mt-10 rounded-lg px-8 py-3 text-sm font-medium transition-all duration-200 ${
          canProceed
            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            : "cursor-not-allowed bg-zinc-800 text-zinc-600"
        }`}
      >
        {t('persona.continue')}
      </button>
    </div>
  );
}
