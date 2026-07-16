"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import {
  ProjectDialog,
  type ProjectFormValues,
} from "@/components/projects/project-dialog";
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
} from "@/lib/supabase/projects";
import type { Project } from "@/lib/types";

export function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch {
      setError("No se pudieron cargar los proyectos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  function openCreateDialog() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function openEditDialog(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ProjectFormValues) {
    if (editingProject) {
      await updateProject(editingProject.id, values);
    } else {
      await createProject(values);
    }
    await loadProjects();
  }

  async function handleDelete(project: Project) {
    const previous = projects;
    setProjects((current) => current.filter((p) => p.id !== project.id));
    try {
      await deleteProject(project.id);
    } catch {
      setProjects(previous);
      setError("No se pudo eliminar el proyecto.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proyectos</CardTitle>
        <CardAction>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={openCreateDialog}
            aria-label="Agregar proyecto"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {!loading && projects.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin proyectos registrados.
          </p>
        )}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={() => openEditDialog(project)}
            onDelete={() => handleDelete(project)}
          />
        ))}
      </CardContent>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
