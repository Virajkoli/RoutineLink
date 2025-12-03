// Base types matching Prisma schema
export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: Date | null;
  dueDate: Date | null;
  priority: number;
  labels: string[];
  projectId: string | null;
  createdBy: string;
  isRecurring: boolean;
  recurrence: string | null; // "daily" | "weekly" | "monthly"
  lastCompleted: Date | null;
  isShared: boolean;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyStats {
  id: string;
  userId: string;
  date: Date;
  completedCount: number;
  streak: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extended task with relations
export interface TaskWithRelations extends Task {
  project?: Project | null;
  user?: User;
}

// Extended project with relations
export interface ProjectWithRelations extends Project {
  tasks?: Task[];
  user?: User | null;
  _count?: {
    tasks: number;
  };
}

// User stats for dashboard
export interface UserDashboardStats {
  todayTasks: number;
  completedToday: number;
  upcomingTasks: number;
  currentStreak: number;
  totalCompleted: number;
}

// Heatmap data point
export interface HeatmapDataPoint {
  date: string;
  count: number;
  level: number; // 0-4
}

// Activity feed item
export interface ActivityItem {
  id: string;
  type: "task_created" | "task_completed" | "task_deleted" | "project_created";
  userId: string;
  userName: string;
  description: string;
  timestamp: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter options for tasks
export interface TaskFilters {
  view: "today" | "upcoming" | "all" | "priority" | "completed";
  projectId?: string;
  priority?: number;
  search?: string;
}

// Online status
export interface UserPresence {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen?: Date;
}
