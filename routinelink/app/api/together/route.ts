import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";

interface User {
  id: string;
  username: string;
  role: string;
}

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
  isRecurring: boolean;
  recurrence: string | null;
  lastCompleted: Date | null;
  completedAt: Date | null;
}

// GET /api/together - Get both users' stats for side-by-side view
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = startOfDay(new Date());
    const yearAgo = subDays(today, 365);

    // Get both users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    // Get stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user: User) => {
        // Get daily stats for heatmap
        const dailyStats = await prisma.dailyStats.findMany({
          where: {
            userId: user.id,
            date: { gte: yearAgo },
          },
          orderBy: { date: "asc" },
        });

        // Get current streak
        const latestStat = await prisma.dailyStats.findFirst({
          where: { userId: user.id },
          orderBy: { date: "desc" },
        });

        // Get today's tasks (including recurring tasks that need to be done today)
        const todayTasks = await prisma.task.findMany({
          where: {
            OR: [
              { createdBy: user.id },
              { assignedTo: user.id },
              { isShared: true },
            ],
            AND: [
              {
                OR: [
                  // Regular tasks due today
                  {
                    isRecurring: false,
                    dueDate: { gte: today, lte: endOfDay(today) },
                  },
                  // Recurring tasks (daily)
                  {
                    isRecurring: true,
                    recurrence: "daily",
                  },
                  // Tasks with no due date created today
                  {
                    dueDate: null,
                    createdAt: { gte: today },
                  },
                ],
              },
            ],
          },
          select: {
            id: true,
            title: true,
            completed: true,
            priority: true,
            isRecurring: true,
            recurrence: true,
            lastCompleted: true,
            completedAt: true,
          },
          orderBy: [{ completed: "asc" }, { priority: "asc" }],
        });

        // For recurring tasks, check if completed today
        const processedTasks = todayTasks.map((task: TaskItem) => {
          if (task.isRecurring && task.recurrence === "daily") {
            const completedToday = task.lastCompleted
              ? startOfDay(new Date(task.lastCompleted)).getTime() ===
                today.getTime()
              : false;
            return {
              ...task,
              completed: completedToday,
            };
          }
          return task;
        });

        const todayCompleted = processedTasks.filter(
          (t: { completed: boolean }) => t.completed
        ).length;

        // Calculate total completed
        const totalCompleted = dailyStats.reduce(
          (sum: number, stat: { completedCount: number }) =>
            sum + stat.completedCount,
          0
        );

        // Build heatmap data
        const heatmap = dailyStats.map(
          (stat: { date: Date; completedCount: number }) => ({
            date: stat.date.toISOString().split("T")[0],
            count: stat.completedCount,
            level: getHeatmapLevel(stat.completedCount),
          })
        );

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          todayTasks: processedTasks.length,
          todayCompleted,
          currentStreak: latestStat?.streak || 0,
          totalCompleted,
          heatmap,
          todayTasksList: processedTasks.map(
            (t: {
              id: string;
              title: string;
              completed: boolean;
              priority: number;
              isRecurring: boolean;
            }) => ({
              id: t.id,
              title: t.title,
              completed: t.completed,
              priority: t.priority,
              isRecurring: t.isRecurring,
            })
          ),
        };
      })
    );

    return NextResponse.json({ success: true, data: usersWithStats });
  } catch (error) {
    console.error("Error fetching together data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

function getHeatmapLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}
