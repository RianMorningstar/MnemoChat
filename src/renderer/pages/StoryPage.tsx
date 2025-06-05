import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ProjectList } from "@/components/story-structure-and-export/components";
import {
  getProjects,
  createProject,
  deleteProject,
  updateProject,
} from "@/lib/api";
import type { Project, ProjectStatus } from "@shared/types";

export function StoryPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const data = await getProjects();
    setProjects(data);
    setLoading(false);
  }

  async function handleCreateProject() {
    const project = await createProject({ title: "Untitled Project" });
    navigate(`/story/${project.id}`);
  }

  async function handleDeleteProject(projectId: string) {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }

  async function handleChangeStatus(projectId: string, status: ProjectStatus) {
    const updated = await updateProject(projectId, { status });
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <ProjectList
      projects={projects}
      projectStatuses={["drafting", "in-progress", "complete", "archived"]}
      onCreateProject={handleCreateProject}
      onOpenProject={(id) => navigate(`/story/${id}`)}
      onDeleteProject={handleDeleteProject}
      onChangeProjectStatus={handleChangeStatus}
    />
  );
}
