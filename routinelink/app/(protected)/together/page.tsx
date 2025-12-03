'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Flame, 
  TrendingUp,
  Calendar,
  Trophy,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContributionHeatmap } from '@/components/contribution-heatmap';
import { useToast } from '@/components/ui/use-toast';
import { usePusher } from '@/hooks/use-pusher';
import { cn } from '@/lib/utils';
import { format, isToday, startOfDay } from 'date-fns';

interface UserStats {
  id: string;
  username: string;
  role: string;
  todayTasks: number;
  todayCompleted: number;
  currentStreak: number;
  totalCompleted: number;
  heatmap: Array<{ date: string; count: number; level: number }>;
  todayTasksList: Array<{
    id: string;
    title: string;
    completed: boolean;
    priority: number;
    isRecurring: boolean;
  }>;
}

export default function TogetherPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/together');
      const data = await res.json();
      
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
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
    onTaskCompleted: () => fetchData(),
    onTaskCreated: () => fetchData(),
    onStatsUpdated: () => fetchData(),
  });

  if (isLoading) {
    return <TogetherSkeleton />;
  }

  const currentUser = users.find(u => u.id === session?.user?.id);
  const otherUser = users.find(u => u.id !== session?.user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Together</h1>
          <p className="text-muted-foreground">Track progress side by side</p>
        </div>
      </div>

      {/* Side by Side Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentUser && <UserColumn user={currentUser} isCurrentUser={true} />}
        {otherUser && <UserColumn user={otherUser} isCurrentUser={false} />}
        {!otherUser && (
          <Card className="flex items-center justify-center min-h-[400px]">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Waiting for friend to join...</p>
            </div>
          </Card>
        )}
      </div>

      {/* Combined Heatmaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentUser && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {currentUser.username}'s Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionHeatmap data={currentUser.heatmap} />
            </CardContent>
          </Card>
        )}
        {otherUser && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {otherUser.username}'s Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionHeatmap data={otherUser.heatmap} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function UserColumn({ user, isCurrentUser }: { user: UserStats; isCurrentUser: boolean }) {
  const completionRate = user.todayTasks > 0 
    ? Math.round((user.todayCompleted / user.todayTasks) * 100) 
    : 0;

  return (
    <Card className={cn(
      "relative overflow-hidden",
      isCurrentUser && "ring-2 ring-primary/20"
    )}>
      {isCurrentUser && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">You</Badge>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold",
            isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          )}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <CardTitle className="text-lg">{user.username}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-3 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
              <Flame className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{user.currentStreak}</p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center p-3 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{user.todayCompleted}/{user.todayTasks}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center p-3 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{user.totalCompleted}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Today's Progress</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                completionRate === 100 ? "bg-green-500" : "bg-primary"
              )}
            />
          </div>
        </div>

        {/* Today's Tasks */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today's Tasks
          </h4>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {user.todayTasksList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks for today
              </p>
            ) : (
              user.todayTasksList.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm",
                    task.completed ? "bg-green-500/10" : "bg-secondary/50"
                  )}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn(
                    "flex-1 truncate",
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </span>
                  {task.isRecurring && (
                    <Badge variant="outline" className="text-xs shrink-0">Daily</Badge>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TogetherSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
