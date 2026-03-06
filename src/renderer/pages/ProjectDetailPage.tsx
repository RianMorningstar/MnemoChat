import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ProjectDetail } from "@/components/story-structure-and-export/components";
import { BookmarkPickerModal } from "@/components/story-structure-and-export/components/BookmarkPickerModal";
import { CharacterPickerModal } from "@/components/story-structure-and-export/components/CharacterPickerModal";
import { LorebookPickerModal } from "@/components/story-structure-and-export/components/LorebookPickerModal";
import {
  getProject,
  getScenes,
  updateProject,
  deleteProject,
  addProjectCharacters,
  removeProjectCharacter,
  addProjectLorebooks,
  removeProjectLorebook,
  createScene,
  createPlaceholderScene,
  deleteScene,
  reorderScenes,
  getContentBlocks,
  generatePdf,
} from "@/lib/api";
import {
  exportToMarkdown,
  exportToPlainText,
  exportToJson,
  triggerDownload,
} from "@/lib/export";
import type { Project, Scene, ExportOptions } from "@shared/types";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookmarkPicker, setShowBookmarkPicker] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showLorebookPicker, setShowLorebookPicker] = useState(false);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  async function loadData() {
    if (!projectId) return;
    const [proj, sc] = await Promise.all([
      getProject(projectId),
      getScenes(projectId),
    ]);
    setProject(proj);
    setScenes(sc);
    setLoading(false);
  }

  async function handleEditProject() {
    if (!project) return;
    const title = prompt("Project title:", project.title);
    if (title === null) return;
    const updated = await updateProject(project.id, { title });
    setProject(updated);
  }

  async function handleDeleteScene(sceneId: string) {
    await deleteScene(sceneId);
    await loadData();
  }

  async function handleReorderScenes(_projectId: string, sceneIds: string[]) {
    if (!projectId) return;
    await reorderScenes(projectId, sceneIds);
    await loadData();
  }

  async function handleAddCharacters(characterIds: string[]) {
    if (!projectId) return;
    await addProjectCharacters(projectId, characterIds);
    setShowCharacterPicker(false);
    await loadData();
  }

  async function handleRemoveCharacter(_pid: string, characterId: string) {
    if (!projectId) return;
    await removeProjectCharacter(projectId, characterId);
    await loadData();
  }

  async function handleAddLorebooks(lorebookIds: string[]) {
    if (!projectId) return;
    await addProjectLorebooks(projectId, lorebookIds);
    setShowLorebookPicker(false);
    await loadData();
  }

  async function handleRemoveLorebook(_pid: string, lorebookId: string) {
    if (!projectId) return;
    await removeProjectLorebook(projectId, lorebookId);
    await loadData();
  }

  async function handleCreateSceneFromBookmarks(data: {
    title: string;
    sourceChatId: string;
    contentBlocks: Array<{
      bookmarkLabel: string;
      speaker: string;
      sourceMessageId: string;
      text: string;
    }>;
  }) {
    if (!projectId) return;
    await createScene(projectId, data);
    setShowBookmarkPicker(false);
    await loadData();
  }

  async function handleCreatePlaceholder() {
    if (!projectId) return;
    await createPlaceholderScene(projectId);
    await loadData();
  }

  async function handleChangeStatus(_pid: string, status: Project["status"]) {
    if (!project) return;
    const updated = await updateProject(project.id, { status });
    setProject(updated);
  }

  async function handleUpdateCoverImage(_projectId: string, dataUrl: string | null) {
    if (!project) return;
    const updated = await updateProject(project.id, { coverImage: dataUrl });
    setProject(updated);
  }

  async function handleExecuteExport(targetId: string, options: ExportOptions) {
    if (!project) return;
    const title = project.title.replace(/\s+/g, "_");

    if (options.format === "pdf") {
      const blob = await generatePdf(
        targetId,
        options.scope,
        options.characterHeaders,
        options.pdfStyle
      );
      triggerDownload(blob, `${title}.pdf`, "application/pdf");
      return;
    }

    // For client-side formats, gather all visible blocks
    let allBlocks: Awaited<ReturnType<typeof getContentBlocks>> = [];
    if (options.scope === "project") {
      for (const scene of scenes) {
        const blocks = await getContentBlocks(scene.id);
        allBlocks = allBlocks.concat(blocks);
      }
    } else {
      allBlocks = await getContentBlocks(targetId);
    }

    if (options.format === "prose-md") {
      const md = exportToMarkdown(allBlocks, options);
      triggerDownload(md, `${title}.md`, "text/markdown");
    } else if (options.format === "prose-txt") {
      const txt = exportToPlainText(allBlocks, options);
      triggerDownload(txt, `${title}.txt`, "text/plain");
    } else if (options.format === "json") {
      const data = exportToJson(allBlocks, options);
      triggerDownload(JSON.stringify(data, null, 2), `${title}.json`, "application/json");
    }
  }

  if (loading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <ProjectDetail
        project={project}
        scenes={scenes}
        exportFormats={["prose-md", "prose-txt", "json", "pdf"]}
        exportScopes={["scene", "project"]}
        pdfStyleOptions={["prose", "screenplay"]}
        projectStatuses={["drafting", "in-progress", "complete", "archived"]}
        onBack={() => navigate("/story")}
        onEditProject={handleEditProject}
        onChangeProjectStatus={handleChangeStatus}
        onAddCharacter={() => setShowCharacterPicker(true)}
        onRemoveCharacter={handleRemoveCharacter}
        onAddLorebook={() => setShowLorebookPicker(true)}
        onRemoveLorebook={handleRemoveLorebook}
        onCreateSceneFromBookmarks={() => setShowBookmarkPicker(true)}
        onCreatePlaceholderScene={handleCreatePlaceholder}
        onOpenScene={(sceneId) => navigate(`/story/${projectId}/scene/${sceneId}`)}
        onDeleteScene={handleDeleteScene}
        onReorderScenes={handleReorderScenes}
        onOpenSourceChat={(chatId) => navigate(`/chat/${chatId}`)}
        onExecuteExport={handleExecuteExport}
        onUpdateCoverImage={handleUpdateCoverImage}
      />

      {showBookmarkPicker && (
        <BookmarkPickerModal
          onConfirm={handleCreateSceneFromBookmarks}
          onClose={() => setShowBookmarkPicker(false)}
        />
      )}

      {showCharacterPicker && (
        <CharacterPickerModal
          existingIds={project.characterIds}
          onConfirm={handleAddCharacters}
          onClose={() => setShowCharacterPicker(false)}
        />
      )}

      {showLorebookPicker && (
        <LorebookPickerModal
          existingIds={project.lorebookIds}
          onConfirm={handleAddLorebooks}
          onClose={() => setShowLorebookPicker(false)}
        />
      )}
    </>
  );
}
