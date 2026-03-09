import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, User } from "lucide-react";
import { getPersona, updatePersona } from "@/lib/api";
import type { Persona } from "@shared/library-types";

export function PersonaEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('library');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!id) return;
    getPersona(id)
      .then((p) => {
        setPersona(p);
        setName(p.name);
        setDescription(p.description);
        setAvatarUrl(p.avatarUrl);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) return;
    setSaving(true);
    try {
      await updatePersona(id, {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      navigate("/library");
    } catch (err) {
      console.error("Failed to save persona:", err);
      setSaving(false);
    }
  }, [id, name, description, avatarUrl, navigate]);

  const handleBack = useCallback(() => {
    navigate("/library");
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-400">
          {error || t('personaEditor.notFound')}
        </p>
        <button
          onClick={handleBack}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          {t('personaEditor.backToLibrary')}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="font-heading text-xl font-semibold text-zinc-100">
              {t('personaEditor.title')}
            </h1>
            <p className="text-sm text-zinc-500">
              {t('personaEditor.subtitle')}
            </p>
          </div>
        </div>

        {/* Avatar preview */}
        <div className="mb-8 flex justify-center">
          {avatarUrl.trim() ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-24 w-24 rounded-full object-cover ring-2 ring-zinc-700"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-zinc-700">
              <User className="h-10 w-10 text-zinc-500" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div>
            <label
              htmlFor="persona-name"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              {t('personaEditor.name')}
            </label>
            <input
              id="persona-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="persona-description"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              {t('personaEditor.description')}
            </label>
            <textarea
              id="persona-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="persona-avatar"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              {t('personaEditor.avatarUrl')}
            </label>
            <input
              id="persona-avatar"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleBack}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {t('personaEditor.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t('personaEditor.saving') : t('personaEditor.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
