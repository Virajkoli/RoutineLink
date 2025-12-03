import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  startOfDay,
  isToday,
  isTomorrow,
  isPast,
  differenceInDays,
} from "date-fns";

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date for display
export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;

  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";

  return format(d, "MMM d, yyyy");
}

// Format date for API
export function formatDateForApi(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
}

// Get priority color
export function getPriorityColor(priority: number): string {
  switch (priority) {
    case 1:
      return "text-red-500 border-red-500";
    case 2:
      return "text-orange-500 border-orange-500";
    case 3:
      return "text-blue-500 border-blue-500";
    case 4:
    default:
      return "text-gray-400 border-gray-400";
  }
}

// Get priority label
export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return "P1 - Urgent";
    case 2:
      return "P2 - High";
    case 3:
      return "P3 - Medium";
    case 4:
    default:
      return "P4 - Low";
  }
}

// Check if date is overdue
export function isOverdue(date: Date | string | null): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return isPast(startOfDay(d)) && !isToday(d);
}

// Generate contribution data for heatmap
export function generateHeatmapData(
  stats: Array<{ date: Date; completedCount: number }>,
  startDate: Date,
  endDate: Date
): Array<{ date: string; count: number; level: number }> {
  const data: Array<{ date: string; count: number; level: number }> = [];
  const statsMap = new Map(
    stats.map((s) => [format(s.date, "yyyy-MM-dd"), s.completedCount])
  );

  let currentDate = startDate;
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const count = statsMap.get(dateStr) || 0;
    const level = getHeatmapLevel(count);

    data.push({ date: dateStr, count, level });
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return data;
}

// Get heatmap level (0-4) based on task count
export function getHeatmapLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

// Calculate current streak
export function calculateStreak(
  stats: Array<{ date: Date; completedCount: number }>
): number {
  if (stats.length === 0) return 0;

  // Sort by date descending
  const sortedStats = [...stats]
    .filter((s) => s.completedCount > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sortedStats.length === 0) return 0;

  const today = startOfDay(new Date());
  const latestDate = startOfDay(new Date(sortedStats[0].date));

  // If the latest activity is older than yesterday, streak is broken
  const daysSinceLatest = differenceInDays(today, latestDate);
  if (daysSinceLatest > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sortedStats.length; i++) {
    const currentDate = startOfDay(new Date(sortedStats[i].date));
    const prevDate = startOfDay(new Date(sortedStats[i - 1].date));
    const diff = differenceInDays(prevDate, currentDate);

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
