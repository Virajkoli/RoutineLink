import { z } from "zod";

// Login validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Task validation
export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z
    .string()
    .max(2000, "Description too long")
    .optional()
    .nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.number().min(1).max(4).default(4),
  labels: z.array(z.string()).default([]),
  projectId: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrence: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  isShared: z.boolean().default(false),
  assignedTo: z.string().optional().nullable(),
});

export const taskUpdateSchema = taskSchema.partial().extend({
  completed: z.boolean().optional(),
});

// Project validation
export const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .default("#6366f1"),
  isShared: z.boolean().default(false),
});

// Stats validation
export const statsSchema = z.object({
  date: z.string().datetime(),
  completedCount: z.number().int().min(0),
  streak: z.number().int().min(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type StatsInput = z.infer<typeof statsSchema>;
