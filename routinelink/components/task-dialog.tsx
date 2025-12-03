'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calendar as CalendarIcon, Flag, FolderOpen, Tag, Repeat, Users, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { TaskWithRelations, ProjectWithRelations } from '@/types';
import type { TaskInput } from '@/lib/validations';

interface UserOption {
  id: string;
  username: string;
  role: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskWithRelations | null;
  projects: ProjectWithRelations[];
  users?: UserOption[];
  currentUserId?: string;
  onSubmit: (data: TaskInput) => void;
  isLoading?: boolean;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  projects,
  users = [],
  currentUserId,
  onSubmit,
  isLoading,
}: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<number>(4);
  const [projectId, setProjectId] = useState<string>('');
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<string>('daily');
  const [isShared, setIsShared] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Get other user for assignment
  const otherUsers = users.filter(u => u.id !== currentUserId);

  // Reset form when dialog opens/closes or task changes
  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
      setPriority(task.priority);
      setProjectId(task.projectId || '');
      setLabels(task.labels || []);
      setIsRecurring(task.isRecurring || false);
      setRecurrence(task.recurrence || 'daily');
      setIsShared(task.isShared || false);
      setAssignedTo(task.assignedTo || '');
    } else if (open) {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority(4);
      setProjectId('');
      setLabels([]);
      setIsRecurring(false);
      setRecurrence('daily');
      setIsShared(false);
      setAssignedTo('');
    }
  }, [open, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      projectId: projectId || null,
      labels,
      isRecurring,
      recurrence: isRecurring ? recurrence as "daily" | "weekly" | "monthly" : null,
      isShared,
      assignedTo: assignedTo || null,
    });
  };

  const addLabel = () => {
    if (newLabel && !labels.includes(newLabel)) {
      setLabels([...labels, newLabel]);
      setNewLabel('');
    }
  };

  const removeLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task name</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Due Date & Priority Row */}
          <div className="flex gap-4">
            {/* Due Date */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="flex-1 space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority.toString()}
                onValueChange={(val) => setPriority(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-red-500" />
                      <span>P1 - Urgent</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-orange-500" />
                      <span>P2 - High</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="3">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-blue-500" />
                      <span>P3 - Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="4">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-gray-400" />
                      <span>P4 - Low</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId || "none"} onValueChange={(val) => setProjectId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No project</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen
                        className="h-4 w-4"
                        style={{ color: project.color }}
                      />
                      <span>{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Task */}
          <div className="space-y-3 p-3 rounded-lg border bg-secondary/30">
            <div className="flex items-center gap-3">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                Make this a recurring task (routine)
              </Label>
            </div>
            
            {isRecurring && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pl-7"
              >
                <Label className="text-xs text-muted-foreground mb-2 block">Repeat</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  This task will reset and appear in "Today" after completion
                </p>
              </motion.div>
            )}
          </div>

          {/* Sharing Options */}
          <div className="space-y-3 p-3 rounded-lg border bg-blue-500/10">
            <div className="flex items-center gap-3">
              <Checkbox
                id="shared"
                checked={isShared}
                onCheckedChange={(checked) => setIsShared(checked as boolean)}
              />
              <Label htmlFor="shared" className="flex items-center gap-2 cursor-pointer">
                <Share2 className="h-4 w-4" />
                Share with friend (visible to both)
              </Label>
            </div>
            
            {otherUsers.length > 0 && (
              <div className="pl-7">
                <Label className="text-xs text-muted-foreground mb-2 block">Assign to</Label>
                <Select value={assignedTo || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? "" : val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No one (self)</span>
                    </SelectItem>
                    {otherUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{user.username}</span>
                          <Badge variant="outline" className="text-xs ml-1">
                            {user.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Assigned tasks appear in the other person's task list
                </p>
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add a label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLabel();
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button type="button" variant="outline" onClick={addLabel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Label list */}
            <AnimatePresence>
              {labels.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1"
                >
                  {labels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeLabel(label)}
                    >
                      {label}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title || isLoading}>
              {isLoading ? 'Saving...' : task ? 'Save changes' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
