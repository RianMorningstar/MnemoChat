import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ConnectionManager } from "@/components/settings/ConnectionManager";
import { getSetting, setSetting, getTokenStatus, listTtsVoices, listImageGenModels, checkImageGenConnection } from "@/lib/api";
import { Check, Loader2, Eye, EyeOff, ExternalLink, Volume2, ImageIcon, Brain, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGE_OPTIONS } from "@/i18n";
import type { TtsProviderType, TtsVoice } from "@shared/tts-types";
import type { ImageGenProviderType } from "@shared/image-gen-types";
import { IMAGE_GEN_PROVIDER_INFO, IMAGE_GEN_DEFAULTS, IMAGE_RESOLUTIONS } from "@shared/image-gen-types";
import type { EmbeddingProviderType } from "@shared/vector-memory-types";
import { EMBEDDING_PROVIDER_INFO, DEFAULT_VECTOR_MEMORY_SETTINGS } from "@shared/vector-memory-types";

function LanguageSection() {
  const { t, i18n } = useTranslation("settings");
  const [language, setLanguage] = useState(i18n.language);

  async function handleChange(lang: string) {
    setLanguage(lang);
    await i18n.changeLanguage(lang);
    await setSetting("ui_language", lang);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-zinc-400">
          {t("language.label")}
        </label>
        <select
          value={language}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
        >
          {LANGUAGE_OPTIONS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">{t("language.description")}</p>
      </div>
    </div>
  );
}

function MnemoTokenSection() {
  const { t } = useTranslation("settings");
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<{
    hasToken: boolean;
    username?: string | null;
    error?: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const [setting, tokenStatus] = await Promise.all([
        getSetting("mnemoApiToken"),
        getTokenStatus(),
      ]);
      if (setting?.value) {
        setToken(setting.value);
        setSavedToken(setting.value);
      }
      setStatus(tokenStatus);
      setChecking(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    await setSetting("mnemoApiToken", token.trim());
    setSavedToken(token.trim());
    setSaved(true);
    // Re-check status
    const tokenStatus = await getTokenStatus();
    setStatus(tokenStatus);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClear() {
    setSaving(true);
    await setSetting("mnemoApiToken", "");
    setToken("");
    setSavedToken("");
    setStatus({ hasToken: false });
    setSaving(false);
  }

  const isDirty = token.trim() !== savedToken;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          {t("account.tokenLabel")}
        </label>
        <p className="mb-3 text-xs text-zinc-500">
          {t("account.tokenHint", { interpolation: { escapeValue: false } }).split("<link>")[0]}
          <a
            href="https://mnemo.studio/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300"
          >
            {t("account.tokenHint").match(/<link>(.*?)<\/link>/)?.[1] ?? "mnemo.studio settings"}
            <ExternalLink className="h-3 w-3" />
          </a>
          {t("account.tokenHint", { interpolation: { escapeValue: false } }).split("</link>")[1] ?? ""}
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("account.tokenPlaceholder")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-3 pr-10 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
            />
            <button
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty || !token.trim()}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              saved
                ? "bg-green-600/20 text-green-400"
                : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved ? t("common:action.saved") : t("common:action.save")}
          </button>
          {savedToken && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
            >
              {t("common:action.clear")}
            </button>
          )}
        </div>
      </div>

      {!checking && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            status?.hasToken && status?.username
              ? "border-green-800/50 bg-green-900/20 text-green-300"
              : status?.hasToken && status?.error
                ? "border-amber-800/50 bg-amber-900/20 text-amber-300"
                : "border-zinc-700/50 bg-zinc-800/30 text-zinc-400"
          )}
        >
          {status?.hasToken && status?.username ? (
            <>
              {t("account.connectedAs", { username: "" }).split("<bold>")[0]}
              <span className="font-medium text-green-200">{status.username}</span>
            </>
          ) : status?.hasToken && status?.error ? (
            <>{t("account.tokenError", { error: status.error })}</>
          ) : (
            <>{t("account.noToken")}</>
          )}
        </div>
      )}
    </div>
  );
}

function TtsSettingsSection() {
  const { t } = useTranslation("settings");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [emotionEnabled, setEmotionEnabled] = useState(true);
  const [provider, setProvider] = useState<TtsProviderType | "">("");
  const [voice, setVoice] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [en, ap, em, prov, vc, oKey, eKey] = await Promise.all([
        getSetting("tts_enabled"),
        getSetting("tts_auto_play"),
        getSetting("tts_emotion_enabled"),
        getSetting("tts_default_provider"),
        getSetting("tts_default_voice"),
        getSetting("tts_openai_api_key"),
        getSetting("tts_elevenlabs_api_key"),
      ]);
      if (en?.value === "true") setTtsEnabled(true);
      if (ap?.value === "true") setAutoPlay(true);
      if (em?.value === "false") setEmotionEnabled(false);
      if (prov?.value) setProvider(prov.value as TtsProviderType);
      if (vc?.value) setVoice(vc.value);
      if (oKey?.value) setOpenaiKey(oKey.value);
      if (eKey?.value) setElevenlabsKey(eKey.value);
    })();
  }, []);

  // Fetch voices when provider changes
  useEffect(() => {
    if (!provider || provider === "system") {
      setVoices([]);
      return;
    }
    setLoadingVoices(true);
    listTtsVoices(provider as TtsProviderType)
      .then(setVoices)
      .catch(() => setVoices([]))
      .finally(() => setLoadingVoices(false));
  }, [provider]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await Promise.all([
      setSetting("tts_enabled", ttsEnabled ? "true" : "false"),
      setSetting("tts_auto_play", autoPlay ? "true" : "false"),
      setSetting("tts_emotion_enabled", emotionEnabled ? "true" : "false"),
      setSetting("tts_default_provider", provider),
      setSetting("tts_default_voice", voice),
      setSetting("tts_openai_api_key", openaiKey),
      setSetting("tts_elevenlabs_api_key", elevenlabsKey),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [ttsEnabled, autoPlay, emotionEnabled, provider, voice, openaiKey, elevenlabsKey]);

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={ttsEnabled}
          onChange={(e) => setTtsEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
        />
        <span className="text-sm text-zinc-200">{t("tts.enable")}</span>
      </label>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={autoPlay}
          onChange={(e) => setAutoPlay(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
        />
        <span className="text-sm text-zinc-200">{t("tts.autoPlay")}</span>
      </label>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={emotionEnabled}
          onChange={(e) => setEmotionEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
        />
        <span className="text-sm text-zinc-200">{t("tts.emotionAware")}</span>
        <span className="text-[10px] text-indigo-400/70">{t("tts.emotionHint")}</span>
      </label>

      {/* Default provider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">{t("tts.defaultProvider")}</label>
        <select
          value={provider}
          onChange={(e) => { setProvider(e.target.value as TtsProviderType); setVoice(""); }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
        >
          <option value="">{t("common:label.none")}</option>
          <option value="system">{t("tts.systemFree")}</option>
          <option value="openai">OpenAI</option>
          <option value="elevenlabs">ElevenLabs</option>
        </select>
      </div>

      {/* Default voice */}
      {provider && provider !== "system" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">{t("tts.defaultVoice")}</label>
          {loadingVoices ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("tts.loadingVoices")}
            </div>
          ) : (
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
            >
              <option value="">{t("tts.selectVoice")}</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* API Keys */}
      {(provider === "openai" || !provider) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">{t("tts.openaiKey")}</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
          />
          <p className="text-[10px] text-zinc-600">{t("tts.openaiKeyHint")}</p>
        </div>
      )}

      {(provider === "elevenlabs" || !provider) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">{t("tts.elevenlabsKey")}</label>
          <input
            type="password"
            value={elevenlabsKey}
            onChange={(e) => setElevenlabsKey(e.target.value)}
            placeholder={t("tts.elevenlabsPlaceholder")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
          />
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          saved
            ? "bg-green-600/20 text-green-400"
            : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? t("common:action.saved") : t("tts.saveButton")}
      </button>
    </div>
  );
}

const IMAGE_GEN_PROVIDERS = Object.entries(IMAGE_GEN_PROVIDER_INFO) as [ImageGenProviderType, typeof IMAGE_GEN_PROVIDER_INFO[ImageGenProviderType]][];

function ImageGenSettingsSection() {
  const { t } = useTranslation("settings");
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<ImageGenProviderType | "">("");
  const [endpoint, setEndpoint] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [stabilityKey, setStabilityKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [steps, setSteps] = useState(IMAGE_GEN_DEFAULTS.steps);
  const [cfgScale, setCfgScale] = useState(IMAGE_GEN_DEFAULTS.cfgScale);
  const [width, setWidth] = useState(IMAGE_GEN_DEFAULTS.width);
  const [height, setHeight] = useState(IMAGE_GEN_DEFAULTS.height);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const keys = [
        "image_gen_enabled", "image_gen_provider", "image_gen_endpoint",
        "image_gen_api_key_openai", "image_gen_api_key_stability",
        "image_gen_default_model", "image_gen_default_steps", "image_gen_default_cfg",
        "image_gen_default_width", "image_gen_default_height", "image_gen_default_negative_prompt",
      ];
      const results = await Promise.all(keys.map((k) => getSetting(k)));
      if (results[0]?.value === "true") setEnabled(true);
      if (results[1]?.value) setProvider(results[1].value as ImageGenProviderType);
      if (results[2]?.value) setEndpoint(results[2].value);
      if (results[3]?.value) setOpenaiKey(results[3].value);
      if (results[4]?.value) setStabilityKey(results[4].value);
      if (results[5]?.value) setModel(results[5].value);
      if (results[6]?.value) setSteps(parseInt(results[6].value, 10));
      if (results[7]?.value) setCfgScale(parseFloat(results[7].value));
      if (results[8]?.value) setWidth(parseInt(results[8].value, 10));
      if (results[9]?.value) setHeight(parseInt(results[9].value, 10));
      if (results[10]?.value) setNegativePrompt(results[10].value);
    })();
  }, []);

  // Fetch models when provider/endpoint change
  useEffect(() => {
    if (!provider) { setModels([]); return; }
    setLoadingModels(true);
    const ep = endpoint || IMAGE_GEN_PROVIDER_INFO[provider].defaultEndpoint;
    listImageGenModels(provider, ep)
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [provider, endpoint]);

  const handleProviderChange = useCallback((newProvider: ImageGenProviderType | "") => {
    setProvider(newProvider);
    setModel("");
    setConnectionOk(null);
    if (newProvider && IMAGE_GEN_PROVIDER_INFO[newProvider]) {
      setEndpoint(IMAGE_GEN_PROVIDER_INFO[newProvider].defaultEndpoint);
    } else {
      setEndpoint("");
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!provider) return;
    setChecking(true);
    setConnectionOk(null);
    const ep = endpoint || IMAGE_GEN_PROVIDER_INFO[provider].defaultEndpoint;
    const key = provider === "openai" ? openaiKey : provider === "stability" ? stabilityKey : undefined;
    const ok = await checkImageGenConnection(provider, ep, key);
    setConnectionOk(ok);
    setChecking(false);
  }, [provider, endpoint, openaiKey, stabilityKey]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await Promise.all([
      setSetting("image_gen_enabled", enabled ? "true" : "false"),
      setSetting("image_gen_provider", provider),
      setSetting("image_gen_endpoint", endpoint),
      setSetting("image_gen_api_key_openai", openaiKey),
      setSetting("image_gen_api_key_stability", stabilityKey),
      setSetting("image_gen_default_model", model),
      setSetting("image_gen_default_steps", String(steps)),
      setSetting("image_gen_default_cfg", String(cfgScale)),
      setSetting("image_gen_default_width", String(width)),
      setSetting("image_gen_default_height", String(height)),
      setSetting("image_gen_default_negative_prompt", negativePrompt),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [enabled, provider, endpoint, openaiKey, stabilityKey, model, steps, cfgScale, width, height, negativePrompt]);

  const needsApiKey = provider ? IMAGE_GEN_PROVIDER_INFO[provider]?.needsApiKey : false;

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
        />
        <span className="text-sm text-zinc-200">{t("imageGen.enable")}</span>
      </label>

      {/* Provider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">{t("imageGen.provider")}</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as ImageGenProviderType | "")}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
        >
          <option value="">{t("common:label.none")}</option>
          {IMAGE_GEN_PROVIDERS.map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>
      </div>

      {/* Endpoint */}
      {provider && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">{t("imageGen.endpoint")}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={endpoint}
              onChange={(e) => { setEndpoint(e.target.value); setConnectionOk(null); }}
              placeholder={provider ? IMAGE_GEN_PROVIDER_INFO[provider].defaultEndpoint : ""}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
            />
            <button
              onClick={handleTestConnection}
              disabled={checking}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                connectionOk === true
                  ? "bg-green-600/20 text-green-400 border border-green-800/50"
                  : connectionOk === false
                    ? "bg-red-600/20 text-red-400 border border-red-800/50"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              )}
            >
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {connectionOk === true ? t("common:status.connected") : connectionOk === false ? t("common:status.failed") : t("common:action.test")}
            </button>
          </div>
          {provider === "automatic1111" && (
            <p className="text-[10px] text-zinc-600">
              {t("imageGen.a1111Hint")}
            </p>
          )}
        </div>
      )}

      {/* API Keys */}
      {(provider === "openai" || (!provider && needsApiKey)) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">{t("imageGen.openaiKey")}</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
          />
        </div>
      )}

      {provider === "stability" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">{t("imageGen.stabilityKey")}</label>
          <input
            type="password"
            value={stabilityKey}
            onChange={(e) => setStabilityKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
          />
        </div>
      )}

      {/* Model */}
      {provider && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">{t("imageGen.model")}</label>
          {loadingModels ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("imageGen.loadingModels")}
            </div>
          ) : (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
            >
              <option value="">{t("common:label.default")}</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Generation defaults */}
      {provider && (
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-zinc-400">{t("imageGen.defaultParams")}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500">{t("imageGen.steps", { value: steps })}</label>
              <input
                type="range"
                min={1}
                max={150}
                value={steps}
                onChange={(e) => setSteps(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500">{t("imageGen.cfgScale", { value: cfgScale })}</label>
              <input
                type="range"
                min={1}
                max={30}
                step={0.5}
                value={cfgScale}
                onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] text-zinc-500">{t("imageGen.resolution")}</label>
              <select
                value={`${width}x${height}`}
                onChange={(e) => {
                  const res = IMAGE_RESOLUTIONS.find(
                    (r) => `${r.width}x${r.height}` === e.target.value,
                  );
                  if (res) {
                    setWidth(res.width);
                    setHeight(res.height);
                  }
                }}
                className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 outline-none"
              >
                {IMAGE_RESOLUTIONS.map((r) => (
                  <option key={`${r.width}x${r.height}`} value={`${r.width}x${r.height}`}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500">{t("imageGen.negativePrompt")}</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder={t("imageGen.negativePromptPlaceholder")}
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50 resize-none"
            />
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          saved
            ? "bg-green-600/20 text-green-400"
            : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? t("common:action.saved") : t("imageGen.saveButton")}
      </button>
    </div>
  );
}

function VectorMemorySettingsSection() {
  const { t } = useTranslation("settings");
  const defaults = DEFAULT_VECTOR_MEMORY_SETTINGS;
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<EmbeddingProviderType>(defaults.provider);
  const [model, setModel] = useState(defaults.model);
  const [openaiKey, setOpenaiKey] = useState("");
  const [insertCount, setInsertCount] = useState(defaults.insertCount);
  const [scoreThreshold, setScoreThreshold] = useState(defaults.scoreThreshold);
  const [protectCount, setProtectCount] = useState(defaults.protectCount);
  const [queryDepth, setQueryDepth] = useState(defaults.queryDepth);
  const [chunkSize, setChunkSize] = useState(defaults.chunkSize);
  const [template, setTemplate] = useState(defaults.template);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const keys = [
        "vector_memory_enabled", "vector_memory_provider", "vector_memory_model",
        "vector_memory_openai_api_key", "vector_memory_insert_count",
        "vector_memory_score_threshold", "vector_memory_protect_count",
        "vector_memory_query_depth", "vector_memory_chunk_size", "vector_memory_template",
      ];
      const results = await Promise.all(keys.map((k) => getSetting(k)));
      if (results[0]?.value === "true") setEnabled(true);
      if (results[1]?.value) setProvider(results[1].value as EmbeddingProviderType);
      if (results[2]?.value) setModel(results[2].value);
      if (results[3]?.value) setOpenaiKey(results[3].value);
      if (results[4]?.value) setInsertCount(parseInt(results[4].value, 10));
      if (results[5]?.value) setScoreThreshold(parseFloat(results[5].value));
      if (results[6]?.value) setProtectCount(parseInt(results[6].value, 10));
      if (results[7]?.value) setQueryDepth(parseInt(results[7].value, 10));
      if (results[8]?.value) setChunkSize(parseInt(results[8].value, 10));
      if (results[9]?.value) setTemplate(results[9].value);
    })();
  }, []);

  const handleProviderChange = useCallback((newProvider: EmbeddingProviderType) => {
    setProvider(newProvider);
    setModel(EMBEDDING_PROVIDER_INFO[newProvider].defaultModel);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await Promise.all([
      setSetting("vector_memory_enabled", enabled ? "true" : "false"),
      setSetting("vector_memory_provider", provider),
      setSetting("vector_memory_model", model),
      setSetting("vector_memory_openai_api_key", openaiKey),
      setSetting("vector_memory_insert_count", String(insertCount)),
      setSetting("vector_memory_score_threshold", String(scoreThreshold)),
      setSetting("vector_memory_protect_count", String(protectCount)),
      setSetting("vector_memory_query_depth", String(queryDepth)),
      setSetting("vector_memory_chunk_size", String(chunkSize)),
      setSetting("vector_memory_template", template),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [enabled, provider, model, openaiKey, insertCount, scoreThreshold, protectCount, queryDepth, chunkSize, template]);

  const providerInfo = EMBEDDING_PROVIDER_INFO[provider];

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
        />
        <span className="text-sm text-zinc-200">{t("vectorMemory.enable")}</span>
      </label>

      <p className="text-xs text-zinc-500">
        {t("vectorMemory.description")}
      </p>

      {/* Provider selector */}
      <div>
        <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.provider")}</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as EmbeddingProviderType)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
        >
          {(Object.keys(EMBEDDING_PROVIDER_INFO) as EmbeddingProviderType[]).map((p) => (
            <option key={p} value={p}>{EMBEDDING_PROVIDER_INFO[p].label}</option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.model")}</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={providerInfo.defaultModel}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
        />
      </div>

      {/* OpenAI API key */}
      {provider === "openai" && (
        <div>
          <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.openaiKey")}</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">{t("vectorMemory.openaiKeyHint")}</p>
        </div>
      )}

      {/* Retrieval settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.insertCount", { count: insertCount })}</label>
          <input
            type="range"
            min={1} max={10} step={1}
            value={insertCount}
            onChange={(e) => setInsertCount(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.scoreThreshold", { value: scoreThreshold.toFixed(2) })}</label>
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={scoreThreshold}
            onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.protectCount", { count: protectCount })}</label>
          <input
            type="range"
            min={0} max={20} step={1}
            value={protectCount}
            onChange={(e) => setProtectCount(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.queryDepth", { count: queryDepth })}</label>
          <input
            type="range"
            min={1} max={5} step={1}
            value={queryDepth}
            onChange={(e) => setQueryDepth(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>

      {/* Chunk size */}
      <div>
        <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.chunkSize", { count: chunkSize })}</label>
        <input
          type="range"
          min={100} max={1000} step={50}
          value={chunkSize}
          onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Template */}
      <div>
        <label className="mb-1 block text-sm text-zinc-400">{t("vectorMemory.template")}</label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={3}
          placeholder={defaults.template}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 font-mono"
        />
        <p className="mt-1 text-xs text-zinc-500">{t("vectorMemory.templateHint")}</p>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          saved
            ? "bg-green-600/20 text-green-400"
            : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? t("common:action.saved") : t("vectorMemory.saveButton")}
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="p-8">
      <h1 className="font-heading text-2xl font-semibold text-zinc-100">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {t("subtitle")}
      </p>

      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-200">
          <Globe className="h-5 w-5 text-indigo-400" />
          {t("language.title")}
        </h2>
        <LanguageSection />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">
          {t("account.title")}
        </h2>
        <MnemoTokenSection />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">
          {t("connections.title")}
        </h2>
        <ConnectionManager />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-200">
          <Volume2 className="h-5 w-5 text-indigo-400" />
          {t("tts.title")}
        </h2>
        <TtsSettingsSection />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-200">
          <ImageIcon className="h-5 w-5 text-indigo-400" />
          {t("imageGen.title")}
        </h2>
        <ImageGenSettingsSection />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-200">
          <Brain className="h-5 w-5 text-indigo-400" />
          {t("vectorMemory.title")}
        </h2>
        <VectorMemorySettingsSection />
      </section>
    </div>
  );
}
