import { useState, useEffect } from "react";
import { X, Search, MessageSquare, Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChats, getChatBookmarks, getMessages } from "@/lib/api";
import type { ChatListItem, Bookmark as BookmarkType, Message } from "@shared/types";

interface BookmarkPickerModalProps {
  onConfirm: (data: {
    title: string;
    sourceChatId: string;
    contentBlocks: Array<{
      bookmarkLabel: string;
      speaker: string;
      sourceMessageId: string;
      text: string;
    }>;
  }) => void;
  onClose: () => void;
}

export function BookmarkPickerModal({ onConfirm, onClose }: BookmarkPickerModalProps) {
  const [step, setStep] = useState<"chat" | "bookmarks">("chat");
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(new Set());
  const [sceneTitle, setSceneTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChats().then((c) => {
      setChats(c);
      setLoading(false);
    });
  }, []);

  async function handleSelectChat(chat: ChatListItem) {
    setSelectedChat(chat);
    setStep("bookmarks");
    setLoading(true);
    const [bm, msgs] = await Promise.all([
      getChatBookmarks(chat.id),
      getMessages(chat.id),
    ]);
    setBookmarks(bm);
    setMessages(msgs);
    setSceneTitle(chat.title || "Untitled Scene");
    setLoading(false);
  }

  function toggleBookmark(id: string) {
    setSelectedBookmarkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (!selectedChat || selectedBookmarkIds.size === 0) return;

    const selectedBookmarks = bookmarks.filter((b) => selectedBookmarkIds.has(b.id));
    const contentBlocks = selectedBookmarks.map((bm) => {
      const msg = messages.find((m) => m.id === bm.messageId);
      return {
        bookmarkLabel: bm.label || "Bookmark",
        speaker: msg?.role === "assistant" ? (selectedChat.characterName ?? "") : "You",
        sourceMessageId: bm.messageId,
        text: msg?.content ?? "",
      };
    });

    onConfirm({
      title: sceneTitle,
      sourceChatId: selectedChat.id,
      contentBlocks,
    });
  }

  const filteredChats = chats.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.title?.toLowerCase().includes(q)) ||
      (c.characterName?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-[70vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h3
            className="text-base font-bold text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {step === "chat" ? "Select Chat" : "Select Bookmarks"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
            </div>
          ) : step === "chat" ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-zinc-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-zinc-200">
                        {chat.title || "Untitled Chat"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-500">
                        {chat.characterName} &middot; {chat.bookmarkCount ?? 0} bookmarks
                      </div>
                    </div>
                  </button>
                ))}
                {filteredChats.length === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">No chats found.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                  Scene Title
                </label>
                <input
                  type="text"
                  value={sceneTitle}
                  onChange={(e) => setSceneTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500/50"
                />
              </div>

              <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                Bookmarks ({selectedBookmarkIds.size} selected)
              </label>

              {bookmarks.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  This chat has no bookmarks.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {bookmarks.map((bm) => {
                    const msg = messages.find((m) => m.id === bm.messageId);
                    const selected = selectedBookmarkIds.has(bm.id);
                    return (
                      <button
                        key={bm.id}
                        onClick={() => toggleBookmark(bm.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-indigo-500/50 bg-indigo-500/10"
                            : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-zinc-600"
                          )}
                        >
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Bookmark className="h-3 w-3 text-indigo-400" />
                            <span className="text-xs font-medium text-zinc-300">
                              {bm.label || "Bookmark"}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                            {msg?.content?.slice(0, 150) ?? "..."}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-3">
          {step === "bookmarks" ? (
            <>
              <button
                onClick={() => {
                  setStep("chat");
                  setSelectedChat(null);
                  setSelectedBookmarkIds(new Set());
                }}
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedBookmarkIds.size === 0}
                className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-500"
              >
                Create Scene ({selectedBookmarkIds.size})
              </button>
            </>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
