'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  CheckSquare,
  FolderOpen,
  TrendingUp,
  RefreshCw,
  Trash2,
  RotateCcw,
  Shield,
  Activity,
  Flame,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContributionHeatmap } from '@/components/contribution-heatmap';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface UserStats {
  id: string;
  username: string;
  role: string;
  completedThisWeek: number;
  currentStreak: number;
  tasksCreatedThisWeek: number;
  lastActive: string;
}

interface AdminStats {
  users: UserStats[];
  totals: {
    totalTasks: number;
    completedTasks: number;
    totalProjects: number;
    completionRate: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [resetType, setResetType] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      redirect('/dashboard');
    }
  }, [session, status]);

  // Fetch admin stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load admin stats',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchStats();
    }
  }, [session, fetchStats]);

  // Handle reset stats
  const handleResetStats = async () => {
    if (!selectedUserId || !resetType) return;

    setIsResetting(true);
    try {
      const res = await fetch('/api/stats/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, resetType }),
      });

      if (!res.ok) throw new Error('Failed to reset stats');

      toast({
        title: 'Stats reset successfully',
        variant: 'success',
      });

      setResetDialogOpen(false);
      setSelectedUserId('');
      setResetType('');
      fetchStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset stats',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <AdminSkeleton />;
  }

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">
            Manage users, tasks, and system settings
          </p>
        </div>
        <Button onClick={fetchStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tasks"
          value={stats?.totals.totalTasks || 0}
          icon={CheckSquare}
          delay={0}
        />
        <StatsCard
          title="Completed"
          value={stats?.totals.completedTasks || 0}
          icon={TrendingUp}
          delay={0.1}
          variant="success"
        />
        <StatsCard
          title="Projects"
          value={stats?.totals.totalProjects || 0}
          icon={FolderOpen}
          delay={0.2}
        />
        <StatsCard
          title="Completion Rate"
          value={`${stats?.totals.completionRate || 0}%`}
          icon={Activity}
          delay={0.3}
          variant="primary"
        />
      </div>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users
              </CardTitle>
              <CardDescription>
                Monitor and manage user activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last active: {format(new Date(user.lastActive), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{user.completedThisWeek}</p>
                    <p className="text-xs text-muted-foreground">
                      Completed this week
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <p className="text-2xl font-bold">{user.currentStreak}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Day streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{user.tasksCreatedThisWeek}</p>
                    <p className="text-xs text-muted-foreground">
                      Created this week
                    </p>
                  </div>

                  {/* Admin Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setResetDialogOpen(true);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Stats
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
          <CardDescription>
            Advanced controls for system management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="justify-start h-auto py-4">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-medium">Force Refresh</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Refresh all realtime connections
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => setResetDialogOpen(true)}
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4" />
                  <span className="font-medium">Reset User Stats</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Reset streak or daily stats for a user
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4 text-destructive hover:text-destructive"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <Trash2 className="h-4 w-4" />
                  <span className="font-medium">Cleanup Completed</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Remove old completed tasks
                </span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Stats</DialogTitle>
            <DialogDescription>
              Choose what to reset for the selected user. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {stats?.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reset Type</label>
              <Select value={resetType} onValueChange={setResetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select what to reset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="streak">Reset Streak Only</SelectItem>
                  <SelectItem value="today">Reset Today&apos;s Stats</SelectItem>
                  <SelectItem value="all">Reset All Stats</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetStats}
              disabled={!selectedUserId || !resetType || isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset Stats'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components
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
  variant?: 'default' | 'success' | 'primary';
}) {
  const variants = {
    default: 'bg-card',
    success: 'bg-green-500/10 border-green-500/20',
    primary: 'bg-primary/10 border-primary/20',
  };

  const iconVariants = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    primary: 'text-primary',
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

function AdminSkeleton() {
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
      <Skeleton className="h-64" />
    </div>
  );
}
