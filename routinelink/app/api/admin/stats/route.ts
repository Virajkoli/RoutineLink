import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";

// GET /api/admin/stats - Get admin dashboard stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);

    // Get all users with their stats
    const users = await prisma.user.findMany({
      include: {
        tasks: {
          where: {
            createdAt: { gte: weekAgo },
          },
        },
        stats: {
          where: {
            date: { gte: weekAgo },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    // Process user stats
    const userStats = users.map(
      (user: {
        id: string;
        username: string;
        role: string;
        createdAt: Date;
        tasks: unknown[];
        stats: { completedCount: number; streak: number; date: Date }[];
      }) => {
        const completedThisWeek = user.stats.reduce(
          (sum: number, stat: { completedCount: number }) =>
            sum + stat.completedCount,
          0
        );
        const currentStreak = user.stats[0]?.streak || 0;
        const tasksCreatedThisWeek = user.tasks.length;

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          completedThisWeek,
          currentStreak,
          tasksCreatedThisWeek,
          lastActive: user.stats[0]?.date || user.createdAt,
        };
      }
    );

    // Get total stats
    const totalTasks = await prisma.task.count();
    const completedTasks = await prisma.task.count({
      where: { completed: true },
    });
    const totalProjects = await prisma.project.count();

    return NextResponse.json({
      success: true,
      data: {
        users: userStats,
        totals: {
          totalTasks,
          completedTasks,
          totalProjects,
          completionRate:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
