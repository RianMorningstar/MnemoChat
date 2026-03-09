import { useTranslation } from "react-i18next";
import logoUrl from "@/assets/mnemo-logo.svg?url";

export function TitleBar() {
  const { t } = useTranslation("common");
  const isMac = window.electronAPI?.platform === "darwin";

  return (
    <div
      className="relative flex h-8 w-full shrink-0 items-center bg-zinc-900 border-b border-zinc-800 select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Spacer for macOS traffic lights */}
      {isMac && <div className="w-20" />}

      {/* App title absolutely centered relative to full bar */}
      <span className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-medium text-zinc-500 tracking-wide pointer-events-none">
        <img
          src={logoUrl}
          alt="MnemoChat"
          className="h-3.5 w-3.5 opacity-90"
          draggable={false}
        />
        <span>MnemoChat</span>
      </span>

      {/* Window controls — hidden on macOS (native traffic lights handle it) */}
      {!isMac && (
        <div
          className="ml-auto flex items-center"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={() => window.electronAPI?.minimize()}
            className="flex h-8 w-12 items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
            aria-label={t('titleBar.minimize')}
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
              <rect width="10" height="1" />
            </svg>
          </button>
          <button
            onClick={() => window.electronAPI?.maximize()}
            className="flex h-8 w-12 items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
            aria-label={t('titleBar.maximize')}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            className="flex h-8 w-12 items-center justify-center text-zinc-400 hover:bg-red-600 hover:text-white transition-colors"
            aria-label={t('titleBar.close')}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <line x1="0" y1="0" x2="10" y2="10" />
              <line x1="10" y1="0" x2="0" y2="10" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
