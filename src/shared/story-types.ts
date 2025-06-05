// ── Enums ──────────────────────────────────────────────

export type ProjectStatus = "drafting" | "in-progress" | "complete" | "archived";

export type SceneStatus = "placeholder" | "draft" | "final";

export type ExportFormat = "prose-md" | "prose-txt" | "json" | "pdf";

export type ExportScope = "scene" | "project";

export type PdfStyle = "prose" | "screenplay";

export type SegmentType = "action" | "dialogue" | "narration";

// ── Data Models ────────────────────────────────────────

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  characterIds: string[];
  characterNames: string[];
  lorebookIds: string[];
  lorebookNames: string[];
  sceneIds: string[];
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  sceneCount: number;
  coverImage: string | null;
}

export interface CharacterRef {
  name: string;
  characterId: string;
}

export interface Scene {
  id: string;
  projectId: string;
  title: string;
  position: number;
  sourceChatId: string | null;
  sourceChatTitle: string | null;
  wordCount: number;
  status: SceneStatus;
  charactersPresent: CharacterRef[];
  sceneNotes: string;
  blockCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlock {
  id: string;
  sceneId: string;
  position: number;
  bookmarkLabel: string;
  speaker: string;
  hidden: boolean;
  sourceMessageId: string;
  text: string;
}

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  characterHeaders: boolean;
  pdfStyle: PdfStyle;
}

// ── Structured export segment (JSON export output) ─────

export interface ExportSegment {
  type: SegmentType;
  text: string;
}

export interface ExportBlock {
  bookmarkLabel: string;
  type: "action" | "dialogue" | "mixed";
  speaker: string;
  segments: ExportSegment[];
}

// ── Props ──────────────────────────────────────────────

export interface StoryStructureProps {
  projects: Project[];
  scenes: Scene[];
  contentBlocks: ContentBlock[];
  exportFormats: ExportFormat[];
  exportScopes: ExportScope[];
  pdfStyleOptions: PdfStyle[];
  projectStatuses: ProjectStatus[];
  sceneStatuses: SceneStatus[];

  // Project actions
  onCreateProject?: () => void;
  onOpenProject?: (projectId: string) => void;
  onEditProject?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onChangeProjectStatus?: (projectId: string, status: ProjectStatus) => void;
  onAddCharacter?: (projectId: string) => void;
  onRemoveCharacter?: (projectId: string, characterId: string) => void;
  onAddLorebook?: (projectId: string) => void;
  onRemoveLorebook?: (projectId: string, lorebookId: string) => void;

  // Scene actions
  onCreateSceneFromBookmarks?: (projectId: string) => void;
  onCreatePlaceholderScene?: (projectId: string) => void;
  onOpenScene?: (sceneId: string) => void;
  onReorderScenes?: (projectId: string, sceneIds: string[]) => void;
  onDeleteScene?: (sceneId: string) => void;
  onOpenSourceChat?: (chatId: string) => void;

  // Content block actions
  onToggleBlockVisibility?: (blockId: string) => void;
  onReorderBlocks?: (sceneId: string, blockIds: string[]) => void;
  onViewBlockSource?: (messageId: string) => void;
  onAddBlock?: (sceneId: string) => void;

  // Export actions
  onExport?: (targetId: string, scope: ExportScope) => void;
  onExecuteExport?: (targetId: string, options: ExportOptions) => void;
}
