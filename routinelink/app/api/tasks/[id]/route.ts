import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { taskUpdateSchema } from "@/lib/validations";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { startOfDay, addDays, addWeeks, addMonths } from "date-fns";

// GET /api/tasks/[id] - Get single task
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user owns the task, is assigned, task is shared, or user is admin
    const canAccess =
      task.createdBy === session.user.id ||
      task.assignedTo === session.user.id ||
      task.isShared ||
      session.user.role === "admin";

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update task
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
    const validation = taskUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check ownership or assignment for PATCH
    const canModify =
      existingTask.createdBy === session.user.id ||
      existingTask.assignedTo === session.user.id ||
      existingTask.isShared ||
      session.user.role === "admin";

    if (!canModify) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { ...validation.data };

    // Handle completion
    if (validation.data.completed !== undefined) {
      if (validation.data.completed && !existingTask.completed) {
        // Task is being completed
        updateData.completedAt = new Date();

        // Update daily stats
        await updateDailyStats(session.user.id, 1);

        // Handle recurring tasks
        if (existingTask.isRecurring) {
          // Mark as completed today but will reset tomorrow
          updateData.lastCompleted = new Date();

          // Calculate next due date based on recurrence pattern
          const today = new Date();
          let nextDueDate: Date;

          switch (existingTask.recurrence) {
            case "weekly":
              nextDueDate = addWeeks(today, 1);
              break;
            case "monthly":
              nextDueDate = addMonths(today, 1);
              break;
            case "daily":
            default:
              nextDueDate = addDays(today, 1);
              break;
          }

          // For recurring tasks, we reset them after a short delay
          // This allows the UI to show completion animation
          setTimeout(async () => {
            try {
              await prisma.task.update({
                where: { id },
                data: {
                  completed: false,
                  completedAt: null,
                  dueDate: startOfDay(nextDueDate),
                },
              });

              // Trigger update to refresh UI
              const updatedTask = await prisma.task.findUnique({
                where: { id },
                include: { project: true },
              });

              await pusherServer.trigger(CHANNELS.TASKS, EVENTS.TASK_UPDATED, {
                task: updatedTask,
                userId: session.user.id,
                userName: session.user.name,
                isRecurringReset: true,
              });
            } catch (err) {
              console.error("Error resetting recurring task:", err);
            }
          }, 2000); // 2 second delay to show completion feedback
        }
      } else if (!validation.data.completed && existingTask.completed) {
        // Task is being uncompleted
        updateData.completedAt = null;

        // Update daily stats (decrement)
        await updateDailyStats(session.user.id, -1);
      }
    }

    // Handle dueDate conversion
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate as string);
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: { project: true },
    });

    // Trigger real-time update
    const event =
      validation.data.completed !== undefined
        ? EVENTS.TASK_COMPLETED
        : EVENTS.TASK_UPDATED;

    await pusherServer.trigger(CHANNELS.TASKS, event, {
      task,
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
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

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Only creator or admin can delete
    if (
      existingTask.createdBy !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id },
    });

    // Trigger real-time update
    await pusherServer.trigger(CHANNELS.TASKS, EVENTS.TASK_DELETED, {
      taskId: id,
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

// Helper function to update daily stats
async function updateDailyStats(userId: string, increment: number) {
  const today = startOfDay(new Date());

  await prisma.dailyStats.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      completedCount: {
        increment,
      },
    },
    create: {
      userId,
      date: today,
      completedCount: Math.max(0, increment),
      streak: 0, // Will be calculated separately
    },
  });

  // Update streak
  await updateStreak(userId);
}

// Helper function to update streak
async function updateStreak(userId: string) {
  const stats = await prisma.dailyStats.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 365,
  });

  if (stats.length === 0) return;

  let streak = 0;
  const today = startOfDay(new Date());

  for (let i = 0; i < stats.length; i++) {
    const statDate = startOfDay(new Date(stats[i].date));
    const expectedDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);

    if (statDate.getTime() !== expectedDate.getTime()) {
      // Allow for today not being counted yet
      if (i === 0) continue;
      break;
    }

    if (stats[i].completedCount > 0) {
      streak++;
    } else {
      break;
    }
  }

  // Update today's streak value
  await prisma.dailyStats.updateMany({
    where: {
      userId,
      date: today,
    },
    data: { streak },
  });

  // Trigger stats update
  await pusherServer.trigger(CHANNELS.STATS, EVENTS.STATS_UPDATED, {
    userId,
    streak,
  });
}
