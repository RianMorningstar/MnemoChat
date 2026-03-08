import { API_BASE } from "@/env";
import type {
  ConnectionProfile,
  Character,
  LorebookEntry,
  Chat,
  ChatCharacter,
  ChatListItem,
  Message,
  SwipeAlternative,
  Bookmark,
  BranchInfo,
  BranchLeaf,
  SceneDirection,
  TokenBudget,
  GenerationPreset,
  AvailableModel,
  Persona,
  Collection,
  LibraryLorebook,
  LibraryCharacter,
  DiscoverCard,
  CreatorProfile,
  Project,
  Scene,
  ContentBlock,
} from "@shared/types";
import type { SpriteInfo } from "@shared/expression-types";
import type { TtsProviderType, TtsVoice, TtsSettings } from "@shared/tts-types";
import type { ImageGenProviderType, ImageGenRequest, ImageGenResult } from "@shared/image-gen-types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Settings
export async function getSetting(
  key: string
): Promise<{ key: string; value: string; updatedAt: string } | null> {
  const res = await fetch(`${API_BASE}/api/settings/${key}`);
  if (res.status === 404) return null;
  return json(res);
}

export async function setSetting(
  key: string,
  value: string
): Promise<{ key: string; value: string; updatedAt: string }> {
  const res = await fetch(`${API_BASE}/api/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return json(res);
}

// Quick Replies (global)

export async function getGlobalQuickReplies(): Promise<
  import("@shared/character-types").QuickReply[]
> {
  const setting = await getSetting("quick_replies");
  if (!setting) return [];
  try {
    return JSON.parse(setting.value);
  } catch {
    return [];
  }
}

export async function setGlobalQuickReplies(
  replies: import("@shared/character-types").QuickReply[]
): Promise<void> {
  await setSetting("quick_replies", JSON.stringify(replies));
}

// Connections
type DbProfile = Omit<ConnectionProfile, "isActive"> & { isActive: number };

function mapProfile(p: DbProfile): ConnectionProfile {
  return { ...p, isActive: p.isActive === 1 };
}

export async function getConnections(): Promise<ConnectionProfile[]> {
  const res = await fetch(`${API_BASE}/api/connections`);
  const rows = await json<DbProfile[]>(res);
  return rows.map(mapProfile);
}

export async function createConnection(data: {
  id: string;
  name: string;
  type?: string;
  endpoint: string;
  defaultModel?: string;
  contentTier?: string;
  apiKey?: string;
}): Promise<ConnectionProfile> {
  const res = await fetch(`${API_BASE}/api/connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json<DbProfile>(res).then(mapProfile);
}

export async function updateConnection(
  id: string,
  data: Partial<Pick<ConnectionProfile, "name" | "type" | "endpoint" | "defaultModel" | "apiKey">>
): Promise<ConnectionProfile> {
  const res = await fetch(`${API_BASE}/api/connections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json<DbProfile>(res).then(mapProfile);
}

export async function deleteConnection(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/connections/${id}`, { method: "DELETE" });
}

export async function activateConnection(
  id: string
): Promise<ConnectionProfile> {
  const res = await fetch(`${API_BASE}/api/connections/${id}/activate`, {
    method: "PUT",
  });
  return json<DbProfile>(res).then(mapProfile);
}

// Characters
export async function getCharacters(): Promise<Character[]> {
  const res = await fetch(`${API_BASE}/api/characters`);
  return json(res);
}

export async function getCharacter(id: string): Promise<Character> {
  const res = await fetch(`${API_BASE}/api/characters/${id}`);
  return json(res);
}

export async function createCharacter(
  data: Partial<Character> = {}
): Promise<Character> {
  const res = await fetch(`${API_BASE}/api/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateCharacter(
  id: string,
  updates: Partial<Character>
): Promise<Character> {
  const res = await fetch(`${API_BASE}/api/characters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deleteCharacter(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/characters/${id}`, { method: "DELETE" });
}

export async function duplicateCharacter(id: string): Promise<Character> {
  const res = await fetch(`${API_BASE}/api/characters/${id}/duplicate`, {
    method: "POST",
  });
  return json(res);
}

// Lorebook
export async function getLorebookEntries(
  characterId: string
): Promise<LorebookEntry[]> {
  const res = await fetch(
    `${API_BASE}/api/characters/${characterId}/lorebook`
  );
  return json(res);
}

export async function createLorebookEntry(
  characterId: string,
  data: Partial<LorebookEntry> = {}
): Promise<LorebookEntry> {
  const res = await fetch(
    `${API_BASE}/api/characters/${characterId}/lorebook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  return json(res);
}

export async function updateLorebookEntry(
  id: string,
  updates: Partial<LorebookEntry>
): Promise<LorebookEntry> {
  const res = await fetch(`${API_BASE}/api/lorebook/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deleteLorebookEntry(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/lorebook/${id}`, { method: "DELETE" });
}

export async function toggleLorebookEntry(
  id: string
): Promise<LorebookEntry> {
  const res = await fetch(`${API_BASE}/api/lorebook/${id}/toggle`, {
    method: "PUT",
  });
  return json(res);
}

// Chats
export async function getChats(): Promise<ChatListItem[]> {
  const res = await fetch(`${API_BASE}/api/chats`);
  return json(res);
}

export async function getChat(id: string): Promise<Chat> {
  const res = await fetch(`${API_BASE}/api/chats/${id}`);
  return json(res);
}

export async function createChat(data: {
  characterId: string;
  modelId: string;
  modelName: string;
  personaName?: string;
  title?: string;
  /** Additional character IDs for group chats */
  characterIds?: string[];
}): Promise<Chat> {
  const res = await fetch(`${API_BASE}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function addChatCharacter(chatId: string, characterId: string): Promise<{ characters: ChatCharacter[] }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterId }),
  });
  return json(res);
}

export async function removeChatCharacter(chatId: string, characterId: string): Promise<{ characters: ChatCharacter[] }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/characters/${characterId}`, {
    method: "DELETE",
  });
  return json(res);
}

export async function updateChat(
  id: string,
  updates: Partial<Pick<Chat, "title" | "tags" | "modelId" | "modelName" | "personaName" | "replyStrategy" | "autoContinue">>
): Promise<void> {
  await fetch(`${API_BASE}/api/chats/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export async function updateChatCharacter(
  chatId: string,
  characterId: string,
  updates: { talkativeness: number },
): Promise<{ characters: ChatCharacter[] }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/characters/${characterId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deleteChat(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/chats/${id}`, { method: "DELETE" });
}

export async function renameChat(id: string, title: string): Promise<void> {
  await fetch(`${API_BASE}/api/chats/${id}/rename`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

// Messages
export async function getMessages(
  chatId: string,
  leafId?: string
): Promise<{ messages: Message[]; branchInfo: BranchInfo }> {
  const params = leafId ? `?leafId=${encodeURIComponent(leafId)}` : "";
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages${params}`);
  return json(res);
}

export async function createMessage(
  chatId: string,
  data: { role: string; content: string; model?: string; isSystemMessage?: boolean; parentId?: string }
): Promise<Message> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateMessage(id: string, content: string): Promise<void> {
  await fetch(`${API_BASE}/api/messages/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function deleteMessage(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/messages/${id}`, { method: "DELETE" });
}

// Branches
export async function createBranch(
  chatId: string,
  parentMessageId: string,
  message?: { role: string; content: string }
): Promise<{ message: Message; branchInfo: BranchInfo }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/branch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentMessageId, message }),
  });
  return json(res);
}

export async function switchBranch(
  chatId: string,
  leafId: string
): Promise<{ messages: Message[]; branchInfo: BranchInfo }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/active-branch`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leafId }),
  });
  return json(res);
}

export async function getBranches(chatId: string): Promise<BranchLeaf[]> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/branches`);
  const data = await json<{ branches: BranchLeaf[] }>(res);
  return data.branches;
}

export async function deleteBranch(chatId: string, messageId: string): Promise<void> {
  await fetch(`${API_BASE}/api/chats/${chatId}/branch`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
}

// Swipes
export async function getSwipeAlternatives(messageId: string): Promise<SwipeAlternative[]> {
  const res = await fetch(`${API_BASE}/api/messages/${messageId}/swipes`);
  return json(res);
}

export async function createSwipeAlternative(
  messageId: string,
  data: { content: string; model: string; tokenCount?: number; generationTimeMs?: number }
): Promise<SwipeAlternative> {
  const res = await fetch(`${API_BASE}/api/messages/${messageId}/swipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function switchSwipe(messageId: string, index: number): Promise<Message> {
  const res = await fetch(`${API_BASE}/api/messages/${messageId}/swipes/${index}`, {
    method: "PATCH",
  });
  return json(res);
}

// Bookmarks
export async function getChatBookmarks(chatId: string): Promise<Bookmark[]> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/bookmarks`);
  return json(res);
}

export async function createBookmark(
  messageId: string,
  data: { label?: string; color?: string }
): Promise<Bookmark> {
  const res = await fetch(`${API_BASE}/api/messages/${messageId}/bookmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function deleteBookmark(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/bookmarks/${id}`, { method: "DELETE" });
}

// Scene Direction
export async function getSceneDirection(chatId: string): Promise<SceneDirection> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/scene-direction`);
  return json(res);
}

export async function updateSceneDirection(
  chatId: string,
  updates: Partial<SceneDirection>
): Promise<SceneDirection> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/scene-direction`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

// Presets
export async function getPresets(): Promise<GenerationPreset[]> {
  const res = await fetch(`${API_BASE}/api/presets`);
  return json(res);
}

export async function createPreset(data: Partial<GenerationPreset>): Promise<GenerationPreset> {
  const res = await fetch(`${API_BASE}/api/presets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updatePreset(
  id: string,
  updates: Partial<GenerationPreset>
): Promise<GenerationPreset> {
  const res = await fetch(`${API_BASE}/api/presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deletePreset(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/presets/${id}`, { method: "DELETE" });
}

// Models
export async function getAvailableModels(): Promise<AvailableModel[]> {
  const res = await fetch(`${API_BASE}/api/models`);
  return json(res);
}

// Token Budget
export async function getTokenBudget(chatId: string): Promise<TokenBudget> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/token-budget`);
  return json(res);
}

// Library Characters
export async function getLibraryCharacters(): Promise<LibraryCharacter[]> {
  const res = await fetch(`${API_BASE}/api/library/characters`);
  return json(res);
}



// Personas
export async function getPersonas(): Promise<Persona[]> {
  const res = await fetch(`${API_BASE}/api/personas`);
  return json(res);
}

export async function getPersona(id: string): Promise<Persona> {
  const res = await fetch(`${API_BASE}/api/personas/${id}`);
  return json(res);
}

export async function createPersona(data: Partial<Persona> = {}): Promise<Persona> {
  const res = await fetch(`${API_BASE}/api/personas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updatePersona(id: string, updates: Partial<Persona>): Promise<Persona> {
  const res = await fetch(`${API_BASE}/api/personas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deletePersona(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/personas/${id}`, { method: "DELETE" });
}

export async function setDefaultPersona(id: string): Promise<Persona> {
  const res = await fetch(`${API_BASE}/api/personas/${id}/set-default`, {
    method: "PUT",
  });
  return json(res);
}

export async function duplicatePersona(id: string): Promise<Persona> {
  const res = await fetch(`${API_BASE}/api/personas/${id}/duplicate`, {
    method: "POST",
  });
  return json(res);
}

// Collections
export async function getCollections(): Promise<Collection[]> {
  const res = await fetch(`${API_BASE}/api/collections`);
  return json(res);
}

export async function createCollection(data: { name: string; description?: string }): Promise<Collection> {
  const res = await fetch(`${API_BASE}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
  const res = await fetch(`${API_BASE}/api/collections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deleteCollection(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/collections/${id}`, { method: "DELETE" });
}

export async function addToCollection(collectionId: string, characterIds: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/collections/${collectionId}/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterIds }),
  });
}

export async function removeFromCollection(collectionId: string, characterId: string): Promise<void> {
  await fetch(`${API_BASE}/api/collections/${collectionId}/characters/${characterId}`, {
    method: "DELETE",
  });
}

// Library Lorebooks
export async function getLibraryLorebooks(): Promise<LibraryLorebook[]> {
  const res = await fetch(`${API_BASE}/api/lorebooks`);
  return json(res);
}

export async function createLibraryLorebook(data: Partial<LibraryLorebook> = {}): Promise<LibraryLorebook> {
  const res = await fetch(`${API_BASE}/api/lorebooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateLibraryLorebook(id: string, updates: Partial<LibraryLorebook>): Promise<LibraryLorebook> {
  const res = await fetch(`${API_BASE}/api/lorebooks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deleteLibraryLorebook(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/lorebooks/${id}`, { method: "DELETE" });
}

export async function duplicateLibraryLorebook(id: string): Promise<LibraryLorebook> {
  const res = await fetch(`${API_BASE}/api/lorebooks/${id}/duplicate`, {
    method: "POST",
  });
  return json(res);
}

export async function attachLorebookToCharacters(id: string, characterIds: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/lorebooks/${id}/attach`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterIds }),
  });
}

export async function exportLorebook(id: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/lorebooks/${id}/export`);
  return json(res);
}

export async function importLorebook(data: {
  name: string;
  tags?: string[];
  coverColor?: string;
  entries?: unknown[];
}): Promise<LibraryLorebook> {
  const res = await fetch(`${API_BASE}/api/lorebooks/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json<LibraryLorebook>(res);
}

// Character-centric lorebook attachment
export async function getCharacterAttachedLorebooks(characterId: string): Promise<LibraryLorebook[]> {
  const res = await fetch(`${API_BASE}/api/characters/${characterId}/lorebooks`);
  return json(res);
}

export async function attachLorebookToCharacter(characterId: string, lorebookId: string): Promise<void> {
  await fetch(`${API_BASE}/api/characters/${characterId}/lorebooks/${lorebookId}`, {
    method: "POST",
  });
}

export async function detachLorebookFromCharacter(characterId: string, lorebookId: string): Promise<void> {
  await fetch(`${API_BASE}/api/characters/${characterId}/lorebooks/${lorebookId}`, {
    method: "DELETE",
  });
}

// Discover
import type { DiscoverQuery, DiscoverCardsResponse } from "@shared/library-types";

export async function getDiscoverCards(query?: DiscoverQuery): Promise<DiscoverCardsResponse> {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.sort) params.set("sort", query.sort);
  if (query?.showNsfw) params.set("showNsfw", "true");
  if (query?.tag) params.set("tag", query.tag);
  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/discover/cards${qs ? `?${qs}` : ""}`);
  return json(res);
}

export async function getDiscoverCard(id: string): Promise<DiscoverCard> {
  const res = await fetch(`${API_BASE}/api/discover/cards/${id}`);
  return json(res);
}

export async function likeDiscoverCard(id: string): Promise<{ liked: boolean }> {
  const res = await fetch(`${API_BASE}/api/discover/cards/${id}/like`, {
    method: "POST",
  });
  return json(res);
}

export async function importDiscoverCard(id: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${API_BASE}/api/discover/cards/${id}/import`, {
    method: "POST",
  });
  return json(res);
}

export async function getCreatorProfile(username: string): Promise<CreatorProfile> {
  const res = await fetch(`${API_BASE}/api/discover/creators/${username}`);
  return json(res);
}

export async function getTokenStatus(): Promise<{
  hasToken: boolean;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/discover/token-status`);
  return json(res);
}



// Projects
export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/api/projects`);
  return json(res);
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`);
  return json(res);
}

export async function createProject(data: { title?: string; description?: string } = {}): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateProject(id: string, updates: Partial<Pick<Project, "title" | "description" | "status" | "coverImage">>): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
}

export async function addProjectCharacters(projectId: string, characterIds: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${projectId}/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterIds }),
  });
}

export async function removeProjectCharacter(projectId: string, characterId: string): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${projectId}/characters/${characterId}`, {
    method: "DELETE",
  });
}

export async function addProjectLorebooks(projectId: string, lorebookIds: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${projectId}/lorebooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lorebookIds }),
  });
}

export async function removeProjectLorebook(projectId: string, lorebookId: string): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${projectId}/lorebooks/${lorebookId}`, {
    method: "DELETE",
  });
}

// Scenes
export async function getScenes(projectId: string): Promise<Scene[]> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/scenes`);
  return json(res);
}

export async function getScene(id: string): Promise<Scene> {
  const res = await fetch(`${API_BASE}/api/scenes/${id}`);
  return json(res);
}

export async function createScene(
  projectId: string,
  data: {
    title: string;
    sourceChatId?: string;
    contentBlocks?: Array<{
      bookmarkLabel: string;
      speaker: string;
      sourceMessageId: string;
      text: string;
    }>;
  }
): Promise<Scene> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/scenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function createPlaceholderScene(projectId: string): Promise<Scene> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/scenes/placeholder`, {
    method: "POST",
  });
  return json(res);
}

export async function updateScene(id: string, updates: Partial<Pick<Scene, "title" | "status" | "sceneNotes">>): Promise<Scene> {
  const res = await fetch(`${API_BASE}/api/scenes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return json(res);
}

export async function deleteScene(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/scenes/${id}`, { method: "DELETE" });
}

export async function reorderScenes(projectId: string, sceneIds: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${projectId}/scenes/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sceneIds }),
  });
}

// Content Blocks
export async function getContentBlocks(sceneId: string): Promise<ContentBlock[]> {
  const res = await fetch(`${API_BASE}/api/scenes/${sceneId}/blocks`);
  return json(res);
}

export async function toggleBlockVisibility(blockId: string): Promise<ContentBlock> {
  const res = await fetch(`${API_BASE}/api/blocks/${blockId}/visibility`, {
    method: "PUT",
  });
  return json(res);
}

export async function reorderBlocks(sceneId: string, blockIds: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/scenes/${sceneId}/blocks/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blockIds }),
  });
}

export async function addBlock(
  sceneId: string,
  data: { bookmarkLabel: string; speaker: string; sourceMessageId: string; text: string }
): Promise<ContentBlock> {
  const res = await fetch(`${API_BASE}/api/scenes/${sceneId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

// Generation (SSE streaming)
export function generateResponse(
  chatId: string,
  opts: { mode?: string; characterId?: string; swipe?: boolean; targetMessageId?: string },
  onToken: (content: string) => void,
  onDone: (message: Message) => void,
  onError: (error: string) => void,
): AbortController {
  const controller = new AbortController();

  // Use XMLHttpRequest instead of fetch+ReadableStream for Electron compatibility.
  // Electron's fetch can buffer streaming responses instead of delivering them
  // incrementally, but XHR's onprogress + responseText works reliably everywhere.
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${API_BASE}/api/chats/${chatId}/generate`);
  xhr.setRequestHeader("Content-Type", "application/json");

  let lastIndex = 0;
  let currentEvent = "";
  let buffer = "";
  let doneHandled = false;

  function processLine(line: string) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data);
        if (currentEvent === "token") {
          onToken(parsed.content);
        } else if (currentEvent === "done") {
          doneHandled = true;
          onDone(parsed.message as Message);
        } else if (currentEvent === "error") {
          doneHandled = true;
          onError(parsed.error);
        }
      } catch {
        // skip malformed data lines
      }
      currentEvent = "";
    }
  }

  function processNewData(newData: string) {
    buffer += newData;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      processLine(line);
    }
  }

  xhr.onprogress = () => {
    const newData = xhr.responseText.substring(lastIndex);
    lastIndex = xhr.responseText.length;
    if (newData) processNewData(newData);
  };

  xhr.onload = () => {
    // Process any remaining data after the final onprogress
    const remaining = xhr.responseText.substring(lastIndex);
    if (remaining) processNewData(remaining);
    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        processLine(line);
      }
    }
    if (!doneHandled) {
      // Server finished without sending done/error — reload messages as fallback
      onDone({} as Message);
    }
  };

  xhr.onerror = () => {
    if (!doneHandled) {
      onError("Generation failed — network error");
    }
  };

  xhr.onabort = () => {
    // User cancelled — no callback needed
  };

  controller.signal.addEventListener("abort", () => xhr.abort());

  xhr.send(JSON.stringify({
    mode: opts.mode,
    characterId: opts.characterId,
    swipe: opts.swipe,
    targetMessageId: opts.targetMessageId,
  }));

  return controller;
}

// Export
export async function generatePdf(
  targetId: string,
  scope: "scene" | "project",
  characterHeaders: boolean,
  pdfStyle: "prose" | "screenplay"
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId, scope, characterHeaders, pdfStyle }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.blob();
}

// ── Sprites / Expressions ──────────────────────────────

export async function getCharacterSprites(characterId: string): Promise<SpriteInfo[]> {
  const res = await fetch(`${API_BASE}/api/sprites/${characterId}`);
  return json(res);
}

export function getSpriteUrl(characterId: string, expression: string): string {
  return `${API_BASE}/api/sprites/${characterId}/${expression}`;
}

export async function uploadSprite(characterId: string, expression: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/sprites/${characterId}/${expression}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
}

export async function uploadSpriteZip(characterId: string, file: File): Promise<string[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/sprites/${characterId}/bulk`, {
    method: "POST",
    body: form,
  });
  const data = await json<{ imported: string[] }>(res);
  return data.imported;
}

export async function deleteSprite(characterId: string, expression: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sprites/${characterId}/${expression}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
}

export async function deleteAllSprites(characterId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sprites/${characterId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
}

export async function classifyMessageExpression(
  chatId: string,
  messageId: string,
  content: string,
): Promise<{ expression: string | null }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/classify-expression`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, content }),
  });
  return json(res);
}

// ── TTS ──────────────────────────────────────────────────

export async function synthesizeTts(
  messageId: string,
  text: string,
  characterId: string,
  emotion?: string | null,
  provider?: TtsProviderType,
  voice?: string,
  settings?: TtsSettings,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/tts/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, text, characterId, emotion, provider, voice, settings }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${res.statusText}`);
  return res.blob();
}

export function getTtsAudioUrl(characterId: string, messageId: string): string {
  return `${API_BASE}/api/tts/audio/${characterId}/${messageId}`;
}

export async function listTtsVoices(provider: TtsProviderType): Promise<TtsVoice[]> {
  return json(await fetch(`${API_BASE}/api/tts/voices/${provider}`));
}

export async function clearTtsCache(characterId: string, messageId?: string): Promise<void> {
  const url = messageId
    ? `${API_BASE}/api/tts/cache/${characterId}/${messageId}`
    : `${API_BASE}/api/tts/cache/${characterId}`;
  await fetch(url, { method: "DELETE" });
}

// ── Image Generation ────────────────────────────────────

export async function generateImage(request: ImageGenRequest): Promise<ImageGenResult> {
  const res = await fetch(`${API_BASE}/api/image-gen/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return json(res);
}

export function getGeneratedImageUrl(imageId: string): string {
  return `${API_BASE}/api/image-gen/images/${imageId}`;
}

/** Build a URL to serve a generated image from its relative path (characterId/imageId.ext) */
export function getGeneratedImageUrlFromPath(relativePath: string): string {
  const parts = relativePath.split("/");
  const filename = parts[parts.length - 1];
  const imageId = filename.replace(/\.[^.]+$/, "");
  return `${API_BASE}/api/image-gen/images/${imageId}`;
}

export async function getImageGallery(characterId: string): Promise<ImageGenResult[]> {
  return json(await fetch(`${API_BASE}/api/image-gen/gallery/${characterId}`));
}

export async function getChatImageGallery(chatId: string): Promise<ImageGenResult[]> {
  return json(await fetch(`${API_BASE}/api/image-gen/gallery/chat/${chatId}`));
}

export async function listImageGenModels(
  provider: ImageGenProviderType,
  endpoint?: string,
): Promise<string[]> {
  const params = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : "";
  const data = await json<{ models: string[] }>(
    await fetch(`${API_BASE}/api/image-gen/models/${provider}${params}`),
  );
  return data.models;
}

export async function listImageGenSamplers(
  provider: ImageGenProviderType,
  endpoint?: string,
): Promise<string[]> {
  const params = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : "";
  const data = await json<{ samplers: string[] }>(
    await fetch(`${API_BASE}/api/image-gen/samplers/${provider}${params}`),
  );
  return data.samplers;
}

export async function checkImageGenConnection(
  provider: ImageGenProviderType,
  endpoint: string,
  apiKey?: string,
): Promise<boolean> {
  const params = new URLSearchParams({ endpoint });
  if (apiKey) params.set("apiKey", apiKey);
  const data = await json<{ ok: boolean }>(
    await fetch(`${API_BASE}/api/image-gen/check/${provider}?${params}`),
  );
  return data.ok;
}

export async function deleteGeneratedImage(imageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/image-gen/images/${imageId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
}

export async function deleteAllGeneratedImages(characterId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/image-gen/gallery/${characterId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
}

export async function setPortraitFromGeneratedImage(imageId: string): Promise<{ portraitUrl: string }> {
  const res = await fetch(`${API_BASE}/api/image-gen/images/${imageId}/set-portrait`, { method: "POST" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}
