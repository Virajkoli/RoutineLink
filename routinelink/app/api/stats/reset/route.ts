import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { startOfDay } from "date-fns";

// POST /api/stats/reset - Admin only: Reset stats
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can reset stats
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, resetType } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    switch (resetType) {
      case "streak":
        // Reset streak only
        await prisma.dailyStats.updateMany({
          where: { userId },
          data: { streak: 0 },
        });
        break;
      case "today":
        // Reset today's stats
        const today = startOfDay(new Date());
        await prisma.dailyStats.deleteMany({
          where: {
            userId,
            date: today,
          },
        });
        break;
      case "all":
        // Reset all stats
        await prisma.dailyStats.deleteMany({
          where: { userId },
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid reset type" },
          { status: 400 }
        );
    }

    // Trigger stats update
    await pusherServer.trigger(CHANNELS.STATS, EVENTS.STATS_UPDATED, {
      userId,
      resetType,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting stats:", error);
    return NextResponse.json(
      { error: "Failed to reset stats" },
      { status: 500 }
    );
  }
}
