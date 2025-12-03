'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HeatmapDataPoint {
  date: string;
  count: number;
  level: number;
}

interface ContributionHeatmapProps {
  data: HeatmapDataPoint[];
  className?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getLevelColor(level: number, isDark: boolean = false): string {
  const colors = isDark
    ? ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
    : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  return colors[level] || colors[0];
}

export function ContributionHeatmap({ data, className }: ContributionHeatmapProps) {
  // Group data by weeks
  const weeks: HeatmapDataPoint[][] = [];
  let currentWeek: HeatmapDataPoint[] = [];

  // Ensure we have exactly 365 days of data
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Fill in missing days
  const startDate = sortedData.length > 0 ? new Date(sortedData[0].date) : new Date();
  const startDayOfWeek = startDate.getDay();

  // Add empty cells for the first week
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: '', count: -1, level: -1 });
  }

  sortedData.forEach((point, index) => {
    currentWeek.push(point);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Add remaining days to the last week
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Get month labels
  const monthLabels: { month: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const validDay = week.find((d) => d.date);
    if (validDay) {
      const month = new Date(validDay.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ month: MONTHS[month], weekIndex });
        lastMonth = month;
      }
    }
  });

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="inline-block min-w-max">
        {/* Month labels */}
        <div className="flex mb-2 ml-8">
          {monthLabels.map(({ month, weekIndex }, i) => (
            <span
              key={i}
              className="text-xs text-muted-foreground"
              style={{
                marginLeft: i === 0 ? `${weekIndex * 14}px` : '0',
                width: i < monthLabels.length - 1
                  ? `${(monthLabels[i + 1].weekIndex - weekIndex) * 14}px`
                  : 'auto',
              }}
            >
              {month}
            </span>
          ))}
        </div>

        <div className="flex">
          {/* Day of week labels */}
          <div className="flex flex-col mr-2 text-xs text-muted-foreground">
            {DAYS_OF_WEEK.map((day, i) => (
              <span
                key={day}
                className="h-[12px] flex items-center"
                style={{ display: i % 2 === 1 ? 'flex' : 'none' }}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) => (
                  <motion.div
                    key={`${weekIndex}-${dayIndex}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: (weekIndex * 7 + dayIndex) * 0.001,
                      duration: 0.2,
                    }}
                    className={cn(
                      'w-[11px] h-[11px] rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-ring',
                      day.level === -1 && 'invisible'
                    )}
                    style={{
                      backgroundColor: day.level >= 0 ? getLevelColor(day.level) : 'transparent',
                    }}
                    title={
                      day.date
                        ? `${day.count} task${day.count !== 1 ? 's' : ''} on ${day.date}`
                        : ''
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end mt-2 gap-2">
          <span className="text-xs text-muted-foreground">Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="w-[11px] h-[11px] rounded-sm"
              style={{ backgroundColor: getLevelColor(level) }}
            />
          ))}
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}
