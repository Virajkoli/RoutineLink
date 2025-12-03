'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  MoreHorizontal,
  Calendar,
  Flag,
  Trash2,
  Edit2,
  FolderOpen,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDate, getPriorityColor, isOverdue } from '@/lib/utils';
import type { TaskWithRelations } from '@/types';

interface TaskItemProps {
  task: TaskWithRelations;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (taskId: string) => void;
}

export function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    onToggleComplete(task.id, !task.completed);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border transition-all',
        'hover:bg-accent/50 hover:shadow-sm',
        task.completed && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={task.completed}
          onCheckedChange={handleToggle}
          className={cn(getPriorityColor(task.priority))}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm font-medium truncate',
                task.completed && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </p>
            
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Due date */}
              {task.dueDate && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    isOverdue(task.dueDate) && !task.completed
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </div>
              )}

              {/* Project */}
              {task.project && (
                <div className="flex items-center gap-1">
                  <FolderOpen
                    className="h-3 w-3"
                    style={{ color: task.project.color }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: task.project.color }}
                  >
                    {task.project.name}
                  </span>
                </div>
              )}

              {/* Priority */}
              {task.priority <= 2 && (
                <div className={cn('flex items-center gap-1', getPriorityColor(task.priority))}>
                  <Flag className="h-3 w-3" />
                  <span className="text-xs">P{task.priority}</span>
                </div>
              )}

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <div className="flex gap-1">
                  {task.labels.slice(0, 2).map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs px-1.5 py-0">
                      {label}
                    </Badge>
                  ))}
                  {task.labels.length > 2 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      +{task.labels.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
