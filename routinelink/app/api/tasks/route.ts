import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { taskSchema } from "@/lib/validations";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { startOfDay, endOfDay, addDays } from "date-fns";

// GET /api/tasks - Get tasks with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "all";
    const projectId = searchParams.get("projectId");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    // Build where clause - include own tasks AND shared/assigned tasks
    const where: Record<string, unknown> = {
      OR: [
        { createdBy: session.user.id },
        { isShared: true },
        { assignedTo: session.user.id },
      ],
    };

    // Filter by view
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(addDays(today, 1));
    const nextWeek = endOfDay(addDays(today, 7));

    switch (view) {
      case "today":
        where.AND = [
          {
            OR: [
              { dueDate: { gte: today, lte: endOfDay(today) } },
              { dueDate: null, createdAt: { gte: today } },
              { isRecurring: true, recurrence: "daily" },
            ],
          },
          { completed: false },
        ];
        break;
      case "upcoming":
        where.dueDate = { gte: tomorrow, lte: nextWeek };
        where.completed = false;
        break;
      case "completed":
        where.completed = true;
        break;
      case "priority":
        where.completed = false;
        break;
      case "shared":
        where.OR = [{ isShared: true }, { assignedTo: session.user.id }];
        break;
      default:
        // all tasks
        break;
    }

    // Filter by project
    if (projectId) {
      where.projectId = projectId;
    }

    // Filter by priority
    if (priority) {
      where.priority = parseInt(priority);
    }

    // Search filter
    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: true,
        user: {
          select: { id: true, username: true },
        },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = taskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      dueDate,
      priority,
      labels,
      projectId,
      isRecurring,
      recurrence,
      isShared,
      assignedTo,
    } = validation.data;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        labels,
        projectId,
        createdBy: session.user.id,
        isRecurring: isRecurring || false,
        recurrence: isRecurring ? recurrence : null,
        isShared: isShared || false,
        assignedTo: assignedTo || null,
      },
      include: {
        project: true,
        user: {
          select: { id: true, username: true },
        },
      },
    });

    // Trigger real-time update
    await pusherServer.trigger(CHANNELS.TASKS, EVENTS.TASK_CREATED, {
      task,
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
