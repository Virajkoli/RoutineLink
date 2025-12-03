import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subDays, startOfDay, endOfDay } from "date-fns";

// GET /api/stats - Get user stats and heatmap data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;
    const days = parseInt(searchParams.get("days") || "365");

    // Only admin can view other user's stats
    if (userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Get daily stats
    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Get current streak
    const latestStat = await prisma.dailyStats.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
    });

    // Calculate total completed tasks
    const totalCompleted = dailyStats.reduce(
      (sum: number, stat: { completedCount: number }) =>
        sum + stat.completedCount,
      0
    );

    // Get today's stats
    const today = startOfDay(new Date());
    const todayStats = dailyStats.find(
      (stat: { date: Date; completedCount: number }) =>
        startOfDay(stat.date).getTime() === today.getTime()
    );

    // Get task counts
    const [todayTasks, upcomingTasks] = await Promise.all([
      prisma.task.count({
        where: {
          createdBy: userId,
          completed: false,
          OR: [
            { dueDate: { gte: today, lte: endOfDay(today) } },
            { dueDate: null },
          ],
        },
      }),
      prisma.task.count({
        where: {
          createdBy: userId,
          completed: false,
          dueDate: { gt: endOfDay(today) },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        heatmap: dailyStats.map(
          (stat: { date: Date; completedCount: number }) => ({
            date: stat.date.toISOString().split("T")[0],
            count: stat.completedCount,
            level: getHeatmapLevel(stat.completedCount),
          })
        ),
        currentStreak: latestStat?.streak || 0,
        totalCompleted,
        todayCompleted: todayStats?.completedCount || 0,
        todayTasks,
        upcomingTasks,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

// Helper function to get heatmap level
function getHeatmapLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}
