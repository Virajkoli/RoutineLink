'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProjectWithRelations } from '@/types';
import type { ProjectInput } from '@/lib/validations';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectWithRelations | null;
  onSubmit: (data: ProjectInput) => void;
  isLoading?: boolean;
  isAdmin?: boolean;
}

const PROJECT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  isLoading,
  isAdmin,
}: ProjectDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (open && project) {
      setName(project.name);
      setColor(project.color);
      setIsShared(!project.userId);
    } else if (open) {
      setName('');
      setColor('#6366f1');
      setIsShared(false);
    }
  }, [open, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, color, isShared });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Add Project'}</DialogTitle>
          <DialogDescription>
            Create a project to organize your tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-ring' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Shared (Admin only) */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shared"
                checked={isShared}
                onCheckedChange={(checked) => setIsShared(checked as boolean)}
              />
              <Label htmlFor="shared" className="text-sm font-normal">
                Make this a shared project (visible to both users)
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name || isLoading}>
              {isLoading ? 'Saving...' : project ? 'Save changes' : 'Add project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
