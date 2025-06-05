import { ConnectionManager } from "@/components/settings/ConnectionManager";

export function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="font-heading text-2xl font-semibold text-zinc-100">
        Settings
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Configure your preferences and manage your account.
      </p>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">
          Connection Profiles
        </h2>
        <ConnectionManager />
      </section>
    </div>
  );
}
