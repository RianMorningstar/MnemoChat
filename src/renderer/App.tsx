import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Outlet, Navigate, useNavigate } from "react-router";
import { AppShell } from "@/components/shell";
import {
  DashboardPage,
  ChatPage,
  CharactersPage,
  CharacterEditorPage,
  PersonaEditorPage,
  LibraryPage,
  StoryPage,
  ProjectDetailPage,
  SceneEditorPage,
  SettingsPage,
  OnboardingPage,
} from "@/pages";
import { getSetting, getConnections } from "@/lib/api";

function AppShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RootRedirect() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([
      getSetting("onboarding_completed").catch(() => null),
      getConnections().catch(() => []),
    ])
      .then(([setting, connections]) => {
        if (setting?.value === "true" || connections.length > 0) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return null;
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<AppShellLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:chatId" element={<ChatPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/characters/:id/edit" element={<CharacterEditorPage />} />
          <Route path="/personas/:id/edit" element={<PersonaEditorPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/story" element={<StoryPage />} />
          <Route path="/story/:projectId" element={<ProjectDetailPage />} />
          <Route path="/story/:projectId/scene/:sceneId" element={<SceneEditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </HashRouter>
  );
}
