import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  LayoutDashboard,
  MessageSquare,
  UserCircle,
  Grid3X3,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MainNav, type NavItem } from "./MainNav";
import { UserMenu } from "./UserMenu";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { TitleBar } from "./TitleBar";
import { getPersonas, setDefaultPersona as apiSetDefaultPersona, createPersona } from "@/lib/api";
import type { Persona } from "@shared/library-types";
import logoUrl from "@/assets/mnemo-logo.svg?url";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");

  const navigationItems: NavItem[] = useMemo(() => [
    { label: t("nav.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.chat"), href: "/chat", icon: MessageSquare },
    { label: t("nav.characters"), href: "/characters", icon: UserCircle },
    { label: t("nav.library"), href: "/library", icon: Grid3X3 },
    { label: t("nav.story"), href: "/story", icon: BookOpen },
    { label: t("nav.settings"), href: "/settings", icon: Settings },
  ], [t]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [defaultPersona, setDefaultPersona] = useState<Persona | undefined>();

  const fetchPersonas = useCallback(async () => {
    try {
      const all = await getPersonas();
      setPersonas(all);
      setDefaultPersona(all.find((p) => p.isDefault) || all[0]);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas, location.pathname]);

  const handleSwitchPersona = useCallback(async (id: string) => {
    try {
      await apiSetDefaultPersona(id);
      await fetchPersonas();
    } catch (err) {
      console.error("Failed to switch persona:", err);
    }
  }, [fetchPersonas]);

  const handleCreatePersona = useCallback(async () => {
    try {
      const persona = await createPersona({ name: "New Persona" });
      navigate(`/personas/${persona.id}/edit`);
    } catch (err) {
      console.error("Failed to create persona:", err);
    }
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen font-sans bg-zinc-950">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-200",
          "hidden md:flex",
          collapsed ? "w-16" : "w-60",
          mobileOpen &&
            "fixed inset-y-0 left-0 z-50 flex w-60 shadow-2xl md:relative md:shadow-none",
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-3">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <img
              src={logoUrl}
              alt="MnemoChat"
              className="h-5 w-5 opacity-95"
              draggable={false}
            />
            {!collapsed && (
              <span className="font-heading text-base font-semibold tracking-tight text-zinc-100">
                MnemoChat
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setCollapsed((c) => !c);
              setMobileOpen(false);
            }}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <MainNav items={navigationItems} collapsed={collapsed} />
        </div>

        {/* Connection indicator */}
        <div className="border-t border-zinc-800">
          <ConnectionIndicator collapsed={collapsed} />
        </div>

        {/* User menu */}
        <div className="border-t border-zinc-800 pt-2">
          <UserMenu
            persona={defaultPersona ? { name: defaultPersona.name, avatarUrl: defaultPersona.avatarUrl || undefined } : undefined}
            personas={personas}
            collapsed={collapsed}
            onSwitchPersona={handleSwitchPersona}
            onCreatePersona={handleCreatePersona}
          />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 md:hidden">
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>
          <div className="flex items-center gap-2">
            <img
              src={logoUrl}
              alt="MnemoChat"
              className="h-5 w-5 opacity-95"
              draggable={false}
            />
            <span className="font-heading text-base font-semibold tracking-tight text-zinc-100">
              MnemoChat
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}
