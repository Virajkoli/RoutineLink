'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContributionHeatmap } from '@/components/contribution-heatmap';
import { TaskItem } from '@/components/task-item';
import { TaskDialog } from '@/components/task-dialog';
import { OnlineStatus } from '@/components/online-status';
import { useToast } from '@/components/ui/use-toast';
import { usePusher, usePresence } from '@/hooks/use-pusher';
import type { TaskWithRelations, ProjectWithRelations } from '@/types';
import type { TaskInput } from '@/lib/validations';

interface DashboardStats {
  todayTasks: number;
  todayCompleted: number;
  upcomingTasks: number;
  currentStreak: number;
  totalCompleted: number;
  heatmap: Array<{ date: string; count: number; level: number }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { onlineUsers } = usePresence(session?.user?.id || '');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tasksRes, projectsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/tasks?view=today'),
        fetch('/api/projects'),
      ]);

      const [statsData, tasksData, projectsData] = await Promise.all([
        statsRes.json(),
        tasksRes.json(),
        projectsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (tasksData.success) setTodayTasks(tasksData.data);
      if (projectsData.success) setProjects(projectsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  usePusher({
    onTaskCreated: (data) => {
      setTodayTasks((prev) => [data.task as TaskWithRelations, ...prev]);
      toast({
        title: 'New task',
        description: `${data.userName} created a new task`,
      });
    },
    onTaskUpdated: (data) => {
      setTodayTasks((prev) =>
        prev.map((t) =>
          t.id === (data.task as TaskWithRelations).id
            ? (data.task as TaskWithRelations)
            : t
        )
      );
    },
    onTaskCompleted: (data) => {
      setTodayTasks((prev) =>
        prev.map((t) =>
          t.id === (data.task as TaskWithRelations).id
            ? (data.task as TaskWithRelations)
            : t
        )
      );
      fetchData(); // Refresh stats
    },
    onTaskDeleted: (data) => {
      setTodayTasks((prev) => prev.filter((t) => t.id !== data.taskId));
    },
    onStatsUpdated: () => {
      fetchData();
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

  const handleCreateTask = async (data: TaskInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to create task');

      toast({ title: 'Task created!', variant: 'success' });
      setTaskDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = async (data: TaskInput) => {
    if (!editingTask) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to update task');

      toast({ title: 'Task updated!', variant: 'success' });
      setEditingTask(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Good {getGreeting()}, {session?.user?.name}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your productivity overview
          </p>
        </div>
        <div className="flex items-center gap-4">
          <OnlineStatus users={onlineUsers} />
          <Button onClick={() => fetchData()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Tasks"
          value={stats?.todayTasks || 0}
          icon={Target}
          delay={0}
        />
        <StatsCard
          title="Completed Today"
          value={stats?.todayCompleted || 0}
          icon={CheckCircle2}
          delay={0.1}
          variant="success"
        />
        <StatsCard
          title="Upcoming"
          value={stats?.upcomingTasks || 0}
          icon={Clock}
          delay={0.2}
        />
        <StatsCard
          title="Current Streak"
          value={`${stats?.currentStreak || 0} days`}
          icon={Flame}
          delay={0.3}
          variant="fire"
        />
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionHeatmap data={stats?.heatmap || []} />
        </CardContent>
      </Card>

      {/* Today's Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Today&apos;s Tasks</CardTitle>
          <Button onClick={() => setTaskDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No tasks for today. Add one to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
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
        onSubmit={editingTask ? handleEditTask : handleCreateTask}
        isLoading={isSubmitting}
      />
    </div>
  );
}

// Helper components
function StatsCard({
  title,
  value,
  icon: Icon,
  delay,
  variant = 'default',
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
  variant?: 'default' | 'success' | 'fire';
}) {
  const variants = {
    default: 'bg-card',
    success: 'bg-green-500/10 border-green-500/20',
    fire: 'bg-orange-500/10 border-orange-500/20',
  };

  const iconVariants = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    fire: 'text-orange-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={variants[variant]}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
            <Icon className={`h-8 w-8 ${iconVariants[variant]}`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
