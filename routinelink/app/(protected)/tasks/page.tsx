'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Filter,
  Calendar,
  Star,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskItem } from '@/components/task-item';
import { TaskDialog } from '@/components/task-dialog';
import { useToast } from '@/components/ui/use-toast';
import { usePusher } from '@/hooks/use-pusher';
import type { TaskWithRelations, ProjectWithRelations } from '@/types';
import type { TaskInput } from '@/lib/validations';

type TaskView = 'all' | 'today' | 'upcoming' | 'completed' | 'priority';

interface UserOption {
  id: string;
  username: string;
  role: string;
}

export default function TasksPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<TaskView>(
    (searchParams.get('view') as TaskView) || 'all'
  );
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('view', view);
      if (projectFilter) params.set('projectId', projectFilter);
      if (priorityFilter) params.set('priority', priorityFilter);

      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        fetch(`/api/tasks?${params}`),
        fetch('/api/projects'),
        fetch('/api/users'),
      ]);

      const [tasksData, projectsData, usersData] = await Promise.all([
        tasksRes.json(),
        projectsRes.json(),
        usersRes.json(),
      ]);

      if (tasksData.success) setTasks(tasksData.data);
      if (projectsData.success) setProjects(projectsData.data);
      if (usersData.success) setUsers(usersData.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [view, projectFilter, priorityFilter, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time updates
  usePusher({
    onTaskCreated: (data) => {
      setTasks((prev) => [data.task as TaskWithRelations, ...prev]);
    },
    onTaskUpdated: (data) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === (data.task as TaskWithRelations).id
            ? (data.task as TaskWithRelations)
            : t
        )
      );
    },
    onTaskCompleted: (data) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === (data.task as TaskWithRelations).id
            ? (data.task as TaskWithRelations)
            : t
        )
      );
    },
    onTaskDeleted: (data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
    },
  });

  // Handlers
  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) throw new Error('Failed to update task');

      toast({
        title: completed ? 'Task completed! 🎉' : 'Task reopened',
        variant: completed ? 'success' : 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitTask = async (data: TaskInput) => {
    setIsSubmitting(true);
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to save task');

      toast({
        title: editingTask ? 'Task updated!' : 'Task created!',
        variant: 'success',
      });

      setTaskDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save task',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete task');

      toast({ title: 'Task deleted' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const getViewIcon = () => {
    switch (view) {
      case 'today':
        return <Calendar className="h-5 w-5" />;
      case 'upcoming':
        return <Star className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5" />;
      default:
        return <ListTodo className="h-5 w-5" />;
    }
  };

  const getViewTitle = () => {
    switch (view) {
      case 'today':
        return "Today's Tasks";
      case 'upcoming':
        return 'Upcoming Tasks';
      case 'completed':
        return 'Completed Tasks';
      case 'priority':
        return 'By Priority';
      default:
        return 'All Tasks';
    }
  };

  if (isLoading) {
    return <TasksSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {getViewIcon()}
          <h1 className="text-2xl font-bold">{getViewTitle()}</h1>
        </div>
        <Button onClick={() => setTaskDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            {/* View Filter */}
            <Select value={view} onValueChange={(v) => setView(v as TaskView)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="priority">By Priority</SelectItem>
              </SelectContent>
            </Select>

            {/* Project Filter */}
            <Select value={projectFilter || "all"} onValueChange={(val) => setProjectFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter || "all"} onValueChange={(val) => setPriorityFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="1">P1 - Urgent</SelectItem>
                <SelectItem value="2">P2 - High</SelectItem>
                <SelectItem value="3">P3 - Medium</SelectItem>
                <SelectItem value="4">P4 - Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(projectFilter || priorityFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProjectFilter('');
                  setPriorityFilter('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListTodo className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg mb-2">No tasks found</p>
              <p className="text-sm">
                {view === 'completed'
                  ? 'Complete some tasks to see them here!'
                  : 'Add a new task to get started!'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={setEditingTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setTaskDialogOpen(false);
            setEditingTask(null);
          }
        }}
        task={editingTask}
        projects={projects}
        users={users}
        currentUserId={session?.user?.id}
        onSubmit={handleSubmitTask}
        isLoading={isSubmitting}
      />
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-16" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
