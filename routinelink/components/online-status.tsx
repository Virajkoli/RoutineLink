'use client';

import { motion } from 'framer-motion';
import { Users, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnlineUser {
  id: string;
  name: string;
  isOnline: boolean;
}

interface OnlineStatusProps {
  users: OnlineUser[];
}

export function OnlineStatus({ users }: OnlineStatusProps) {
  const onlineUsers = users.filter((u) => u.isOnline);

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1">
        {users.map((user) => (
          <motion.div
            key={user.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative"
            title={`${user.name} is ${user.isOnline ? 'online' : 'offline'}`}
          >
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium',
                user.isOnline
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <Circle
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current',
                user.isOnline ? 'text-green-500' : 'text-gray-400'
              )}
            />
          </motion.div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {onlineUsers.length} online
      </span>
    </div>
  );
}
