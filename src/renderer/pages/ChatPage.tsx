import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { ChatView } from "@/components/chat";
import {
  getChat,
  getChats,
  createChat,
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage as apiDeleteMessage,
  getChatBookmarks,
  createBookmark,
  deleteBookmark,
  getSceneDirection,
  updateSceneDirection as apiUpdateSceneDirection,
  getTokenBudget,
  getPresets,
  createPreset,
  updatePreset as apiUpdatePreset,
  deletePreset as apiDeletePreset,
  getAvailableModels,
  getConnections,
  updateChat,
  deleteChat as apiDeleteChat,
  renameChat as apiRenameChat,
} from "@/lib/api";
import type {
  Chat,
  ChatListItem,
  Message,
  Bookmark,
  SceneDirection,
  TokenBudget,
  GenerationPreset,
  AvailableModel,
  InputMode,
  BookmarkColor,
  ExportScope,
  ExportFormat,
} from "@shared/types";

const defaultBudget: TokenBudget = {
  contextMax: 4096,
  systemPrompt: 0,
  characterCard: 0,
  chatHistory: 0,
  sceneDirection: 0,
  available: 4096,
  scrollingOutSoon: false,
};

const defaultScene: SceneDirection = {
  text: "",
  injectionDepth: 4,
  enabled: false,
  tokenCount: 0,
};

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [sceneDirection, setSceneDirection] = useState<SceneDirection>(defaultScene);
  const [tokenBudget, setTokenBudget] = useState<TokenBudget>(defaultBudget);
  const [presets, setPresets] = useState<GenerationPreset[]>([]);
  const [activePreset, setActivePreset] = useState<GenerationPreset | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>("in_character");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChatData = useCallback(async (id: string) => {
    try {
      const [chatData, msgs, bms, scene, budget] = await Promise.all([
        getChat(id),
        getMessages(id),
        getChatBookmarks(id),
        getSceneDirection(id),
        getTokenBudget(id),
      ]);
      setChat(chatData);
      setMessages(msgs);
      setBookmarks(bms);
      setSceneDirection(scene);
      setTokenBudget(budget);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setChat(null);
      setMessages([]);
      try {
        // Load presets, models, chat list, and active connection in parallel
        const [presetsData, models, chats, connections] = await Promise.all([
          getPresets(),
          getAvailableModels(),
          getChats(),
          getConnections().catch(() => []),
        ]);

        if (cancelled) return;

        setPresets(presetsData);
        setActivePreset(presetsData[0] || null);
        setAvailableModels(models);
        setChatList(chats);

        const characterId = searchParams.get("character");

        if (characterId) {
          // Use the active connection's default model, falling back to first available
          const activeConnection = connections.find((c) => c.isActive);
          const defaultModelId = activeConnection?.defaultModel;
          const model =
            (defaultModelId && models.find((m) => m.id === defaultModelId)) ||
            models[0];
          const newChat = await createChat({
            characterId,
            modelId: model?.id || "unknown",
            modelName: model?.name || "Unknown Model",
          });
          if (cancelled) return;
          navigate(`/chat/${newChat.id}`, { replace: true });
          return;
        }

        if (chatId) {
          await loadChatData(chatId);
        } else if (chats.length > 0) {
          // Load most recent chat
          navigate(`/chat/${chats[0].id}`, { replace: true });
          return;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to initialize");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [chatId, searchParams, navigate, loadChatData]);

  const refreshMessages = useCallback(async () => {
    if (!chat) return;
    const [msgs, bms, budget, chats] = await Promise.all([
      getMessages(chat.id),
      getChatBookmarks(chat.id),
      getTokenBudget(chat.id),
      getChats(),
    ]);
    setMessages(msgs);
    setBookmarks(bms);
    setTokenBudget(budget);
    setChatList(chats);
    // Refresh chat stats
    const updated = await getChat(chat.id);
    setChat(updated);
  }, [chat]);

  // Callbacks
  const onSendMessage = useCallback(async (content: string, mode: InputMode) => {
    if (!chat) return;
    const role = mode === "narrate" ? "system" : "user";
    await createMessage(chat.id, {
      role,
      content,
      isSystemMessage: mode === "narrate",
    });
    await refreshMessages();
  }, [chat, refreshMessages]);

  const onEditMessage = useCallback(async (messageId: string, newContent: string) => {
    await updateMessage(messageId, newContent);
    await refreshMessages();
  }, [refreshMessages]);

  const onDeleteMessage = useCallback(async (messageId: string) => {
    await apiDeleteMessage(messageId);
    await refreshMessages();
  }, [refreshMessages]);

  const onRegenerate = useCallback((messageId: string) => {
    console.log("onRegenerate stub:", messageId);
  }, []);

  const onSwipeNavigate = useCallback((_messageId: string, _direction: "left" | "right") => {
    console.log("onSwipeNavigate stub:", _messageId, _direction);
  }, []);

  const onSwipeGenerate = useCallback((messageId: string) => {
    console.log("onSwipeGenerate stub:", messageId);
  }, []);

  const onBookmark = useCallback(async (messageId: string, label: string, color: BookmarkColor) => {
    await createBookmark(messageId, { label, color });
    await refreshMessages();
  }, [refreshMessages]);

  const onRemoveBookmark = useCallback(async (bookmarkId: string) => {
    await deleteBookmark(bookmarkId);
    await refreshMessages();
  }, [refreshMessages]);

  const onJumpToBookmark = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const onUpdateSceneDirection = useCallback(async (text: string) => {
    if (!chat) return;
    const updated = await apiUpdateSceneDirection(chat.id, { text });
    setSceneDirection(updated);
  }, [chat]);

  const onSetInjectionDepth = useCallback(async (depth: number) => {
    if (!chat) return;
    const updated = await apiUpdateSceneDirection(chat.id, { injectionDepth: depth });
    setSceneDirection(updated);
  }, [chat]);

  const onToggleSceneDirection = useCallback(async (enabled: boolean) => {
    if (!chat) return;
    const updated = await apiUpdateSceneDirection(chat.id, { enabled });
    setSceneDirection(updated);
  }, [chat]);

  const onUpdatePreset = useCallback(async (updates: Partial<GenerationPreset>) => {
    if (!activePreset) return;
    const updated = await apiUpdatePreset(activePreset.id, updates);
    setActivePreset(updated);
    setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, [activePreset]);

  const onSavePreset = useCallback(async (name: string) => {
    if (!activePreset) return;
    const newPreset = await createPreset({ ...activePreset, name, id: undefined as unknown as string });
    setPresets((prev) => [...prev, newPreset]);
    setActivePreset(newPreset);
  }, [activePreset]);

  const onLoadPreset = useCallback((presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) setActivePreset(preset);
  }, [presets]);

  const onDeletePreset = useCallback(async (presetId: string) => {
    await apiDeletePreset(presetId);
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (activePreset?.id === presetId) {
      setActivePreset(presets.find((p) => p.id !== presetId) || null);
    }
  }, [activePreset, presets]);

  const onSwitchModel = useCallback(async (modelId: string) => {
    if (!chat) return;
    const model = availableModels.find((m) => m.id === modelId);
    if (!model) return;
    await updateChat(chat.id, { modelId: model.id, modelName: model.name });
    setChat((prev) => prev ? { ...prev, modelId: model.id, modelName: model.name } : prev);
  }, [chat, availableModels]);

  const onOpenChat = useCallback((id: string) => {
    navigate(`/chat/${id}`);
  }, [navigate]);

  const onDeleteChat = useCallback(async (id: string) => {
    await apiDeleteChat(id);
    const updatedList = chatList.filter((c) => c.id !== id);
    setChatList(updatedList);
    if (id === chatId) {
      setChat(null);
      setMessages([]);
      setBookmarks([]);
      setSceneDirection(defaultScene);
      setTokenBudget(defaultBudget);
      if (updatedList.length > 0) {
        navigate(`/chat/${updatedList[0].id}`, { replace: true });
      } else {
        navigate("/chat", { replace: true });
      }
    }
  }, [chatList, chatId, navigate]);

  const onNewChat = useCallback(() => {
    if (!chat) return;
    navigate(`/chat?character=${chat.characterId}`);
  }, [chat, navigate]);

  const onRenameChat = useCallback(async (id: string, title: string) => {
    await apiRenameChat(id, title);
    setChat((prev) => prev ? { ...prev, title } : prev);
    setChatList((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const onOpenCharacterEditor = useCallback((characterId: string) => {
    navigate(`/characters/${characterId}/edit`);
  }, [navigate]);

  const onExportChat = useCallback((_chatId: string, scope: ExportScope, format: ExportFormat) => {
    const filteredMessages = scope === "bookmarks"
      ? messages.filter((m) => m.bookmark)
      : messages;

    let content: string;
    if (format === "json" || scope === "raw") {
      content = JSON.stringify(scope === "raw" ? messages : filteredMessages, null, 2);
    } else if (format === "md") {
      content = filteredMessages
        .map((m) => `**${m.role === "assistant" ? (chat?.characterName || "AI") : "You"}**\n\n${m.content}`)
        .join("\n\n---\n\n");
    } else {
      content = filteredMessages
        .map((m) => `[${m.role === "assistant" ? (chat?.characterName || "AI") : "You"}]\n${m.content}`)
        .join("\n\n");
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chat?.title || "chat"}-${scope}.${format === "json" || scope === "raw" ? "json" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, chat]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => navigate("/characters")}
            className="mt-3 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            Back to Characters
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-200">No chats yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pick a character from the library to start a conversation.
          </p>
          <button
            onClick={() => navigate("/characters")}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Browse Characters
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatView
      chat={chat}
      messages={messages}
      swipeAlternatives={{}}
      sceneDirection={sceneDirection}
      tokenBudget={tokenBudget}
      activePreset={activePreset || presets[0] || {
        id: "", name: "Default", temperature: 1, repetitionPenalty: 1.1,
        topP: 0.95, topPEnabled: true, topK: 40, topKEnabled: false,
        maxNewTokens: 512, stopSequences: [],
      }}
      presets={presets}
      chatList={chatList}
      bookmarks={bookmarks}
      inputMode={inputMode}
      availableModels={availableModels}
      onSendMessage={onSendMessage}
      onEditMessage={onEditMessage}
      onDeleteMessage={onDeleteMessage}
      onRegenerate={onRegenerate}
      onSwipeNavigate={onSwipeNavigate}
      onSwipeGenerate={onSwipeGenerate}
      onBookmark={onBookmark}
      onRemoveBookmark={onRemoveBookmark}
      onJumpToBookmark={onJumpToBookmark}
      onUpdateSceneDirection={onUpdateSceneDirection}
      onSetInjectionDepth={onSetInjectionDepth}
      onToggleSceneDirection={onToggleSceneDirection}
      onChangeInputMode={setInputMode}
      onUpdatePreset={onUpdatePreset}
      onSavePreset={onSavePreset}
      onLoadPreset={onLoadPreset}
      onDeletePreset={onDeletePreset}
      onSwitchModel={onSwitchModel}
      onOpenChat={onOpenChat}
      onDeleteChat={onDeleteChat}
      onNewChat={onNewChat}
      onRenameChat={onRenameChat}
      onOpenCharacterEditor={onOpenCharacterEditor}
      onExportChat={onExportChat}
    />
  );
}
