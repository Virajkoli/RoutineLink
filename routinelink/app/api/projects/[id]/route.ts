import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectSchema } from "@/lib/validations";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

// GET /api/projects/[id] - Get single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check access
    if (
      project.userId &&
      project.userId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = projectSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check ownership (only owner or admin can update)
    if (
      existingProject.userId &&
      existingProject.userId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only admin can modify shared projects
    if (!existingProject.userId && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can modify shared projects" },
        { status: 403 }
      );
    }

    const { name, color, isShared } = validation.data;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        color,
        userId:
          isShared !== undefined
            ? isShared
              ? null
              : session.user.id
            : undefined,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    // Trigger real-time update
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, {
      project,
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check ownership
    if (
      existingProject.userId &&
      existingProject.userId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only admin can delete shared projects
    if (!existingProject.userId && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can delete shared projects" },
        { status: 403 }
      );
    }

    await prisma.project.delete({
      where: { id },
    });

    // Trigger real-time update
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_DELETED, {
      projectId: id,
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
