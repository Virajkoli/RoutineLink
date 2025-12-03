"use client";

import { useEffect, useState, useCallback } from "react";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher";
import type { Channel } from "pusher-js";

interface PusherEvent {
  task?: unknown;
  project?: unknown;
  taskId?: string;
  projectId?: string;
  userId?: string;
  userName?: string;
}

interface UsePusherOptions {
  onTaskCreated?: (data: PusherEvent) => void;
  onTaskUpdated?: (data: PusherEvent) => void;
  onTaskDeleted?: (data: PusherEvent) => void;
  onTaskCompleted?: (data: PusherEvent) => void;
  onProjectCreated?: (data: PusherEvent) => void;
  onProjectUpdated?: (data: PusherEvent) => void;
  onProjectDeleted?: (data: PusherEvent) => void;
  onStatsUpdated?: (data: { userId: string; streak?: number }) => void;
}

export function usePusher(options: UsePusherOptions) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    // Subscribe to channels
    const tasksChannel = pusher.subscribe(CHANNELS.TASKS);
    const projectsChannel = pusher.subscribe(CHANNELS.PROJECTS);
    const statsChannel = pusher.subscribe(CHANNELS.STATS);

    // Bind events
    if (options.onTaskCreated) {
      tasksChannel.bind(EVENTS.TASK_CREATED, options.onTaskCreated);
    }
    if (options.onTaskUpdated) {
      tasksChannel.bind(EVENTS.TASK_UPDATED, options.onTaskUpdated);
    }
    if (options.onTaskDeleted) {
      tasksChannel.bind(EVENTS.TASK_DELETED, options.onTaskDeleted);
    }
    if (options.onTaskCompleted) {
      tasksChannel.bind(EVENTS.TASK_COMPLETED, options.onTaskCompleted);
    }
    if (options.onProjectCreated) {
      projectsChannel.bind(EVENTS.PROJECT_CREATED, options.onProjectCreated);
    }
    if (options.onProjectUpdated) {
      projectsChannel.bind(EVENTS.PROJECT_UPDATED, options.onProjectUpdated);
    }
    if (options.onProjectDeleted) {
      projectsChannel.bind(EVENTS.PROJECT_DELETED, options.onProjectDeleted);
    }
    if (options.onStatsUpdated) {
      statsChannel.bind(EVENTS.STATS_UPDATED, options.onStatsUpdated);
    }

    // Connection status
    pusher.connection.bind("connected", () => setIsConnected(true));
    pusher.connection.bind("disconnected", () => setIsConnected(false));

    setIsConnected(pusher.connection.state === "connected");

    return () => {
      tasksChannel.unbind_all();
      projectsChannel.unbind_all();
      statsChannel.unbind_all();
      pusher.unsubscribe(CHANNELS.TASKS);
      pusher.unsubscribe(CHANNELS.PROJECTS);
      pusher.unsubscribe(CHANNELS.STATS);
    };
  }, [options]);

  return { isConnected };
}

// Hook for presence channel (online status)
export function usePresence(userId: string) {
  const [onlineUsers, setOnlineUsers] = useState<
    Array<{ id: string; name: string; isOnline: boolean }>
  >([]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const presenceChannel = pusher.subscribe(CHANNELS.PRESENCE) as Channel & {
      members: {
        each: (
          callback: (member: { id: string; info: { name: string } }) => void
        ) => void;
      };
    };

    presenceChannel.bind(
      "pusher:subscription_succeeded",
      (members: {
        each: (
          callback: (member: { id: string; info: { name: string } }) => void
        ) => void;
      }) => {
        const users: Array<{ id: string; name: string; isOnline: boolean }> =
          [];
        members.each((member: { id: string; info: { name: string } }) => {
          users.push({
            id: member.id,
            name: member.info.name,
            isOnline: true,
          });
        });
        setOnlineUsers(users);
      }
    );

    presenceChannel.bind(
      "pusher:member_added",
      (member: { id: string; info: { name: string } }) => {
        setOnlineUsers((prev) => [
          ...prev.filter((u) => u.id !== member.id),
          { id: member.id, name: member.info.name, isOnline: true },
        ]);
      }
    );

    presenceChannel.bind("pusher:member_removed", (member: { id: string }) => {
      setOnlineUsers((prev) =>
        prev.map((u) => (u.id === member.id ? { ...u, isOnline: false } : u))
      );
    });

    return () => {
      presenceChannel.unbind_all();
      pusher.unsubscribe(CHANNELS.PRESENCE);
    };
  }, [userId]);

  return { onlineUsers };
}
