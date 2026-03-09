import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Users, MessageSquare, FolderOpen, LetterText, User } from "lucide-react";
import { getCharacters, getChats, getProjects } from "@/lib/api";
import type { Character, ChatListItem, Project } from "@shared/types";

function useRelativeTime() {
  const { t } = useTranslation("common");
  return function relativeTime(dateStr: string | null): string {
    if (!dateStr) return "";
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return t("time.justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("time.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("time.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t("time.daysAgo", { count: days });
    const months = Math.floor(days / 30);
    return t("time.monthsAgo", { count: months });
  };
}

const statCardStyle =
  "bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3";

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");
  const relativeTime = useRelativeTime();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCharacters().catch(() => [] as Character[]),
      getChats().catch(() => [] as ChatListItem[]),
      getProjects().catch(() => [] as Project[]),
    ]).then(([chars, chatList, projs]) => {
      setCharacters(chars);
      setChats(chatList);
      setProjects(projs);
      setLoading(false);
    });
  }, []);

  const totalWords = chats.reduce((sum, c) => sum + (c.wordCount || 0), 0);

  const recentChats = [...chats]
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const recentCharacters = [...characters]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold text-zinc-100">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {t("subtitle")}
      </p>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={statCardStyle}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">{t("stats.characters")}</p>
            <p className="text-lg font-semibold text-zinc-100">
              {characters.length}
            </p>
          </div>
        </div>
        <div className={statCardStyle}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">{t("stats.chats")}</p>
            <p className="text-lg font-semibold text-zinc-100">
              {chats.length}
            </p>
          </div>
        </div>
        <div className={statCardStyle}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">{t("stats.projects")}</p>
            <p className="text-lg font-semibold text-zinc-100">
              {projects.length}
            </p>
          </div>
        </div>
        <div className={statCardStyle}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <LetterText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">{t("stats.wordsWritten")}</p>
            <p className="text-lg font-semibold text-zinc-100">
              {totalWords.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Recent chats */}
      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-zinc-100">
          {t("recentChats.title")}
        </h2>
        {recentChats.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{t("recentChats.empty")}</p>
        ) : (
          <div className="mt-3 space-y-1">
            {recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-zinc-800/60"
              >
                {chat.characterPortraitUrl ? (
                  <img
                    src={chat.characterPortraitUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {chat.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {chat.characterName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-zinc-500">
                    {relativeTime(chat.lastMessageAt)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {tc("count.msgs", { count: chat.messageCount })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recent characters */}
      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-zinc-100">
          {t("recentCharacters.title")}
        </h2>
        {recentCharacters.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{t("recentCharacters.empty")}</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {recentCharacters.map((char) => (
              <button
                key={char.id}
                onClick={() => navigate(`/characters/${char.id}/edit`)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700 hover:bg-zinc-800/60"
              >
                {char.portraitUrl ? (
                  <img
                    src={char.portraitUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
                    <User className="h-7 w-7" />
                  </div>
                )}
                <p className="w-full truncate text-center text-sm text-zinc-300">
                  {char.name || tc("unnamed")}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
