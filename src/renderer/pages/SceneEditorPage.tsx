import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { SceneEditor } from "@/components/story-structure-and-export/components";
import { BookmarkPickerModal } from "@/components/story-structure-and-export/components/BookmarkPickerModal";
import {
  getScene,
  getContentBlocks,
  getProject,
  toggleBlockVisibility,
  reorderBlocks,
  addBlock,
  deleteScene,
  generatePdf,
} from "@/lib/api";
import {
  exportToMarkdown,
  exportToPlainText,
  exportToJson,
  triggerDownload,
} from "@/lib/export";
import type { Scene, ContentBlock, ExportOptions } from "@shared/types";

export function SceneEditorPage() {
  const { projectId, sceneId } = useParams<{ projectId: string; sceneId: string }>();
  const navigate = useNavigate();
  const [scene, setScene] = useState<Scene | null>(null);
  const [contentBlocksList, setContentBlocks] = useState<ContentBlock[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBlockPicker, setShowBlockPicker] = useState(false);

  useEffect(() => {
    if (sceneId && projectId) loadData();
  }, [sceneId, projectId]);

  async function loadData() {
    if (!sceneId || !projectId) return;
    const [sc, blocks, proj] = await Promise.all([
      getScene(sceneId),
      getContentBlocks(sceneId),
      getProject(projectId),
    ]);
    setScene(sc);
    setContentBlocks(blocks);
    setProjectTitle(proj.title);
    setLoading(false);
  }

  async function handleToggleVisibility(blockId: string) {
    await toggleBlockVisibility(blockId);
    await loadData();
  }

  async function handleReorderBlocks(_sceneId: string, blockIds: string[]) {
    if (!sceneId) return;
    await reorderBlocks(sceneId, blockIds);
    await loadData();
  }

  async function handleAddBlockFromBookmarks(data: {
    title: string;
    sourceChatId: string;
    contentBlocks: Array<{
      bookmarkLabel: string;
      speaker: string;
      sourceMessageId: string;
      text: string;
    }>;
  }) {
    if (!sceneId) return;
    for (const block of data.contentBlocks) {
      await addBlock(sceneId, block);
    }
    setShowBlockPicker(false);
    await loadData();
  }

  async function handleDeleteScene() {
    if (!sceneId) return;
    await deleteScene(sceneId);
    navigate(`/story/${projectId}`);
  }

  async function handleExecuteExport(targetId: string, options: ExportOptions) {
    const title = scene?.title.replace(/\s+/g, "_") ?? "export";

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

    if (options.format === "prose-md") {
      const md = exportToMarkdown(contentBlocksList, options);
      triggerDownload(md, `${title}.md`, "text/markdown");
    } else if (options.format === "prose-txt") {
      const txt = exportToPlainText(contentBlocksList, options);
      triggerDownload(txt, `${title}.txt`, "text/plain");
    } else if (options.format === "json") {
      const data = exportToJson(contentBlocksList, options);
      triggerDownload(JSON.stringify(data, null, 2), `${title}.json`, "application/json");
    }
  }

  if (loading || !scene) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <SceneEditor
        scene={scene}
        contentBlocks={contentBlocksList}
        projectTitle={projectTitle}
        exportFormats={["prose-md", "prose-txt", "json", "pdf"]}
        pdfStyleOptions={["prose", "screenplay"]}
        onBack={() => navigate(`/story/${projectId}`)}
        onToggleBlockVisibility={handleToggleVisibility}
        onReorderBlocks={handleReorderBlocks}
        onAddBlock={() => setShowBlockPicker(true)}
        onViewBlockSource={(messageId) => navigate(`/chat/${scene.sourceChatId}`)}
        onOpenSourceChat={(chatId) => navigate(`/chat/${chatId}`)}
        onDeleteScene={handleDeleteScene}
        onExecuteExport={handleExecuteExport}
      />

      {showBlockPicker && (
        <BookmarkPickerModal
          onConfirm={handleAddBlockFromBookmarks}
          onClose={() => setShowBlockPicker(false)}
        />
      )}
    </>
  );
}
