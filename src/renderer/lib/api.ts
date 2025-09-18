import { API_BASE } from "@/env";
import type {
  ConnectionProfile,
  Character,
  LorebookEntry,
  Chat,
  ChatListItem,
  Message,
  SwipeAlternative,
  Bookmark,
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
  endpoint: string;
  defaultModel?: string;
  contentTier?: string;
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
  data: Partial<Pick<ConnectionProfile, "name" | "endpoint" | "defaultModel">>
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
}): Promise<Chat> {
  const res = await fetch(`${API_BASE}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateChat(
  id: string,
  updates: Partial<Pick<Chat, "title" | "tags" | "modelId" | "modelName" | "personaName">>
): Promise<void> {
  await fetch(`${API_BASE}/api/chats/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
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
export async function getMessages(chatId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`);
  return json(res);
}

export async function createMessage(
  chatId: string,
  data: { role: string; content: string; model?: string; isSystemMessage?: boolean }
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

export async function bulkDeleteCharacters(ids: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/characters/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function bulkTagCharacters(ids: string[], tags: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/characters/bulk-tag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, tags }),
  });
}

// Personas
export async function getPersonas(): Promise<Persona[]> {
  const res = await fetch(`${API_BASE}/api/personas`);
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

// Discover
export async function getDiscoverCards(): Promise<DiscoverCard[]> {
  const res = await fetch(`${API_BASE}/api/discover/cards`);
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

export async function seedDiscoverData(): Promise<{ seeded: boolean }> {
  const res = await fetch(`${API_BASE}/api/discover/seed`, {
    method: "POST",
  });
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
  opts: { mode?: string },
  onToken: (content: string) => void,
  onDone: (message: Message) => void,
  onError: (error: string) => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chats/${chatId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: opts.mode }),
        signal: controller.signal,
      });

      if (!res.ok) {
        onError(`HTTP ${res.status}: ${res.statusText}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        onError("No response stream");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (currentEvent === "token") {
                onToken(parsed.content);
              } else if (currentEvent === "done") {
                onDone(parsed.message as Message);
              } else if (currentEvent === "error") {
                onError(parsed.error);
              }
            } catch {
              // skip malformed data
            }
            currentEvent = "";
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError(err instanceof Error ? err.message : "Generation failed");
      }
    }
  })();

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
