import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/admin/tasks - Get all tasks from all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const where = userId ? { createdBy: userId } : {};

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching admin tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
