import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherClientInstance && typeof window !== "undefined") {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    );
  }
  return pusherClientInstance;
};

// Channel names
export const CHANNELS = {
  TASKS: "tasks-channel",
  PROJECTS: "projects-channel",
  STATS: "stats-channel",
  PRESENCE: "presence-routinelink",
};

// Event names
export const EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  TASK_COMPLETED: "task:completed",
  PROJECT_CREATED: "project:created",
  PROJECT_UPDATED: "project:updated",
  PROJECT_DELETED: "project:deleted",
  STATS_UPDATED: "stats:updated",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
};
