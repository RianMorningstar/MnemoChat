import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { ChatView } from "@/components/chat";
import {
  getChat,
  getChats,
  createChat,
  addChatCharacter,
  removeChatCharacter,
  getMessages,
  getCharacters,
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
  getPersonas,
  updateChat,
  deleteChat as apiDeleteChat,
  renameChat as apiRenameChat,
  generateResponse,
  createBranch,
  switchBranch,
  getBranches,
  deleteBranch,
  updateChatCharacter,
} from "@/lib/api";
import { getSiblingLeafId } from "@/lib/branch-utils";
import { pickNextCharacter } from "@/lib/group-utils";
import type {
  Chat,
  ChatListItem,
  Message,
  Bookmark,
  BranchInfo,
  SceneDirection,
  TokenBudget,
  GenerationPreset,
  AvailableModel,
  InputMode,
  BookmarkColor,
  ExportScope,
  ExportFormat,
  ReplyStrategy,
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
  const [allCharacters, setAllCharacters] = useState<{ id: string; name: string; portraitUrl: string }[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>("in_character");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [pendingCharacterId, setPendingCharacterId] = useState<string | null>(null);
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoContinueRef = useRef(false);
  const stoppedByUserRef = useRef(false);

  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [branchPointActive, setBranchPointActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const loadChatData = useCallback(async (id: string) => {
    try {
      const [chatData, msgResult, bms, scene, budget] = await Promise.all([
        getChat(id),
        getMessages(id),
        getChatBookmarks(id),
        getSceneDirection(id),
        getTokenBudget(id),
      ]);
      // Ensure characters array is always populated
      const chatWithChars = {
        ...chatData,
        characters: chatData.characters?.length
          ? chatData.characters
          : [{ id: chatData.characterId, name: chatData.characterName, portraitUrl: chatData.characterPortraitUrl, talkativeness: 0.5 }],
      };
      setChat(chatWithChars);
      autoContinueRef.current = !!chatData.autoContinue;
      setMessages(msgResult.messages);
      setBranchInfo(msgResult.branchInfo);
      setBookmarks(bms);
      setSceneDirection(scene);
      setTokenBudget(budget);
      setError(null);
      // Default pending character to primary
      setPendingCharacterId((prev) => prev ?? chatData.characterId);
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
      setPendingCharacterId(null);
      try {
        // Load presets, models, chat list, active connection, personas, and characters in parallel
        const [presetsData, models, chats, connections, personas, chars] = await Promise.all([
          getPresets(),
          getAvailableModels(),
          getChats(),
          getConnections().catch(() => []),
          getPersonas().catch(() => []),
          getCharacters().catch(() => []),
        ]);

        if (cancelled) return;

        setPresets(presetsData);
        setActivePreset(presetsData[0] || null);
        setAvailableModels(models);
        setChatList(chats);
        setAllCharacters(chars.map(c => ({ id: c.id, name: c.name, portraitUrl: c.portraitUrl ?? "" })));

        const characterId = searchParams.get("character");

        if (characterId) {
          // Use the active connection's default model, falling back to first available
          const activeConnection = connections.find((c) => c.isActive);
          const defaultModelId = activeConnection?.defaultModel;
          const model =
            (defaultModelId && models.find((m) => m.id === defaultModelId)) ||
            models[0];
          const defaultPersona = personas.find((p) => p.isDefault) || personas[0];
          const newChat = await createChat({
            characterId,
            modelId: model?.id || "unknown",
            modelName: model?.name || "Unknown Model",
            personaName: defaultPersona?.name,
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
    const [msgResult, bms, budget, chats] = await Promise.all([
      getMessages(chat.id),
      getChatBookmarks(chat.id),
      getTokenBudget(chat.id),
      getChats(),
    ]);
    setMessages(msgResult.messages);
    setBranchInfo(msgResult.branchInfo);
    setBookmarks(bms);
    setTokenBudget(budget);
    setChatList(chats);
    // Refresh chat stats
    const updated = await getChat(chat.id);
    setChat({
      ...updated,
      characters: updated.characters?.length
        ? updated.characters
        : [{ id: updated.characterId, name: updated.characterName, portraitUrl: updated.characterPortraitUrl, talkativeness: 0.5 }],
    });
  }, [chat]);

  const triggerGeneration = useCallback((targetChatId: string, mode: InputMode, characterId?: string) => {
    const characters = chat?.characters ?? [];

    stoppedByUserRef.current = false;
    setIsGenerating(true);
    setStreamingContent("");
    setGenerationError(null);
    setGeneratingCharacterId(characterId ?? null);
    const controller = generateResponse(
      targetChatId,
      { mode, characterId },
      (token) => setStreamingContent((prev) => prev + token),
      async () => {
        setIsGenerating(false);
        setStreamingContent("");
        setGeneratingCharacterId(null);
        await refreshMessages();
        // Auto-advance to next character (group chats only)
        if (characters.length > 1 && characterId) {
          const strategy = chat?.replyStrategy ?? 'round_robin';
          const nextCharId = pickNextCharacter(characters, characterId, strategy);
          setPendingCharacterId(nextCharId);

          // Auto-continue: trigger next generation after a short delay
          if (autoContinueRef.current && !stoppedByUserRef.current) {
            setTimeout(() => {
              triggerGeneration(targetChatId, "in_character", nextCharId);
            }, 500);
          }
        }
      },
      (err) => {
        setIsGenerating(false);
        setStreamingContent("");
        setGeneratingCharacterId(null);
        setGenerationError(err);
        console.error("Generation error:", err);
      },
    );
    abortRef.current = controller;
  }, [chat, refreshMessages]);

  const onStopGeneration = useCallback(() => {
    stoppedByUserRef.current = true;
    abortRef.current?.abort();
    setIsGenerating(false);
    setStreamingContent("");
    setGeneratingCharacterId(null);
  }, []);

  // Callbacks
  const onSendMessage = useCallback(async (content: string, mode: InputMode) => {
    if (!chat) return;

    if (mode !== "continue") {
      const role = mode === "narrate" ? "system" : "user";

      if (branchPointActive) {
        // We're at a branch point — use createBranch to properly fork with correct branchPosition
        const lastMsg = messages[messages.length - 1];
        await createBranch(chat.id, lastMsg.id, { role, content });
      } else {
        await createMessage(chat.id, {
          role,
          content,
          isSystemMessage: mode === "narrate",
        });
      }
      setBranchPointActive(false);
      await refreshMessages();
    }

    triggerGeneration(chat.id, mode, pendingCharacterId ?? chat.characterId);
  }, [chat, messages, branchPointActive, refreshMessages, triggerGeneration, pendingCharacterId]);

  const onEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!chat) return;
    const msg = messages.find((m) => m.id === messageId);
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    const hasChildren = msgIndex < messages.length - 1;

    if (hasChildren && msg?.parentId) {
      // Auto-branch: create a new branch with the edited content, then regenerate
      await createBranch(chat.id, msg.parentId, { role: msg.role, content: newContent });
      await refreshMessages();
      // Trigger regeneration on the new branch if it was a user message
      if (msg.role === "user") {
        const regenCharId = pendingCharacterId ?? chat.characterId;
        triggerGeneration(chat.id, "in_character", regenCharId);
      }
    } else {
      // Last message or no parent: edit in-place
      await updateMessage(messageId, newContent);
      await refreshMessages();
    }
  }, [chat, messages, pendingCharacterId, refreshMessages, triggerGeneration]);

  const onDeleteMessage = useCallback(async (messageId: string) => {
    await apiDeleteMessage(messageId);
    await refreshMessages();
  }, [refreshMessages]);

  const onRegenerate = useCallback(async (messageId: string) => {
    if (!chat) return;
    const msg = messages.find((m) => m.id === messageId);
    const regenCharId = msg?.characterId ?? pendingCharacterId ?? chat.characterId;

    // Branch-aware regenerate: create a sibling branch from the parent, then generate
    const parentId = msg?.parentId;
    if (parentId) {
      await createBranch(chat.id, parentId);
      await refreshMessages();
      triggerGeneration(chat.id, "in_character", regenCharId);
    } else {
      // Fallback for root messages: delete and regenerate (legacy behavior)
      await apiDeleteMessage(messageId);
      await refreshMessages();
      triggerGeneration(chat.id, "in_character", regenCharId);
    }
  }, [chat, messages, pendingCharacterId, refreshMessages, triggerGeneration]);

  // Branch callbacks
  const onBranchCreate = useCallback(async (messageId: string) => {
    if (!chat) return;
    // Set this message as the active leaf — the chat truncates here.
    // The fork happens when the user sends their next message.
    const result = await switchBranch(chat.id, messageId);
    setMessages(result.messages);
    setBranchInfo(result.branchInfo);
    setBranchPointActive(true);
  }, [chat]);

  const onBranchNavigate = useCallback(async (messageId: string, direction: "prev" | "next") => {
    if (!chat || !branchInfo) return;
    const leafId = getSiblingLeafId(branchInfo, messageId, direction);
    if (!leafId) return;
    const result = await switchBranch(chat.id, leafId);
    setMessages(result.messages);
    setBranchInfo(result.branchInfo);
  }, [chat, branchInfo]);

  const onBranchSwitch = useCallback(async (leafId: string) => {
    if (!chat) return;
    const result = await switchBranch(chat.id, leafId);
    setMessages(result.messages);
    setBranchInfo(result.branchInfo);
  }, [chat]);

  const onBranchDelete = useCallback(async (messageId: string) => {
    if (!chat) return;
    await deleteBranch(chat.id, messageId);
    await refreshMessages();
  }, [chat, refreshMessages]);

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

  const onTalkativenessChange = useCallback(async (characterId: string, value: number) => {
    if (!chat) return;
    const result = await updateChatCharacter(chat.id, characterId, { talkativeness: value });
    setChat((prev) => prev ? { ...prev, characters: result.characters } : prev);
  }, [chat]);

  const onReplyStrategyChange = useCallback(async (strategy: ReplyStrategy) => {
    if (!chat) return;
    await updateChat(chat.id, { replyStrategy: strategy });
    setChat((prev) => prev ? { ...prev, replyStrategy: strategy } : prev);
  }, [chat]);

  const onAutoContinueChange = useCallback(async (enabled: boolean) => {
    if (!chat) return;
    autoContinueRef.current = enabled;
    await updateChat(chat.id, { autoContinue: enabled });
    setChat((prev) => prev ? { ...prev, autoContinue: enabled } : prev);
  }, [chat]);

  const onAddCharacter = useCallback(async (characterId: string) => {
    if (!chat) return;
    const result = await addChatCharacter(chat.id, characterId);
    setChat((prev) => prev ? { ...prev, characters: result.characters } : prev);
  }, [chat]);

  const onRemoveCharacter = useCallback(async (characterId: string) => {
    if (!chat) return;
    const result = await removeChatCharacter(chat.id, characterId);
    setChat((prev) => prev ? { ...prev, characters: result.characters } : prev);
  }, [chat]);

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

  const generatingCharacter = generatingCharacterId && chat.characters
    ? chat.characters.find((c) => c.id === generatingCharacterId) ?? null
    : null;

  return (
    <>
    {generationError && (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-w-lg rounded-lg bg-red-900/90 px-4 py-3 text-sm text-red-100 shadow-lg backdrop-blur-sm flex items-center gap-3">
        <span className="flex-1">{generationError}</span>
        <button
          onClick={() => setGenerationError(null)}
          className="shrink-0 rounded p-1 hover:bg-red-800 text-red-300 hover:text-red-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    )}
    <ChatView
      chat={chat}
      messages={messages}
      isGenerating={isGenerating}
      streamingContent={streamingContent}
      onStopGeneration={onStopGeneration}
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
      branchInfo={branchInfo}
      branchPointActive={branchPointActive}
      onBranchCreate={onBranchCreate}
      onBranchNavigate={onBranchNavigate}
      onBranchSwitch={onBranchSwitch}
      onBranchDelete={onBranchDelete}
      pendingCharacterId={pendingCharacterId ?? chat.characterId}
      generatingCharacter={generatingCharacter ?? undefined}
      onSelectCharacter={(charId) => setPendingCharacterId(charId)}
      onTalkativenessChange={onTalkativenessChange}
      onReplyStrategyChange={onReplyStrategyChange}
      onAutoContinueChange={onAutoContinueChange}
      allCharacters={allCharacters}
      onAddCharacter={onAddCharacter}
      onRemoveCharacter={onRemoveCharacter}
    />
    </>
  );
}
