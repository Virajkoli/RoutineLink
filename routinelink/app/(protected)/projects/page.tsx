'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FolderOpen,
  MoreHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectDialog } from '@/components/project-dialog';
import { useToast } from '@/components/ui/use-toast';
import { usePusher } from '@/hooks/use-pusher';
import { cn } from '@/lib/utils';
import type { ProjectWithRelations } from '@/types';
import type { ProjectInput } from '@/lib/validations';

export default function ProjectsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();

      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Real-time updates
  usePusher({
    onProjectCreated: (data) => {
      setProjects((prev) => [data.project as ProjectWithRelations, ...prev]);
    },
    onProjectUpdated: (data) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === (data.project as ProjectWithRelations).id
            ? (data.project as ProjectWithRelations)
            : p
        )
      );
    },
    onProjectDeleted: (data) => {
      setProjects((prev) => prev.filter((p) => p.id !== data.projectId));
    },
  });

  // Handlers
  const handleSubmitProject = async (data: ProjectInput) => {
    setIsSubmitting(true);
    try {
      const url = editingProject
        ? `/api/projects/${editingProject.id}`
        : '/api/projects';
      const method = editingProject ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save project');
      }

      toast({
        title: editingProject ? 'Project updated!' : 'Project created!',
        variant: 'success',
      });

      setDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save project',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete project');
      }

      toast({ title: 'Project deleted' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Organize your tasks into projects
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg text-muted-foreground mb-2">No projects yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a project to start organizing your tasks
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    'group relative hover:shadow-md transition-all cursor-pointer',
                    'border-l-4'
                  )}
                  style={{ borderLeftColor: project.color }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen
                          className="h-5 w-5"
                          style={{ color: project.color }}
                        />
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingProject(project)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      {!project.userId && (
                        <Badge variant="outline" className="text-xs">
                          Shared
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{project._count?.tasks || 0} tasks</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Project Dialog */}
      <ProjectDialog
        open={dialogOpen || !!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingProject(null);
          }
        }}
        project={editingProject}
        onSubmit={handleSubmitProject}
        isLoading={isSubmitting}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
