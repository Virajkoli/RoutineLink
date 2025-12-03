import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectSchema } from "@/lib/validations";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

// GET /api/projects - Get all projects for user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { userId: null }, // Shared projects
        ],
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = projectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, color, isShared } = validation.data;

    // Only admin can create shared projects
    if (isShared && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can create shared projects" },
        { status: 403 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        color,
        userId: isShared ? null : session.user.id,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    // Trigger real-time update
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_CREATED, {
      project,
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
