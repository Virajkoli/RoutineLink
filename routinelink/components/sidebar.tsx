'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Flame,
  Calendar,
  Star,
  Users,
  Repeat,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/together', label: 'Together', icon: Users },
  { href: '/tasks', label: 'All Tasks', icon: CheckSquare },
  { href: '/tasks?view=today', label: 'Today', icon: Calendar },
  { href: '/tasks?view=upcoming', label: 'Upcoming', icon: Star },
  { href: '/tasks?view=recurring', label: 'Routines', icon: Repeat },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/admin', label: 'Admin Panel', icon: Settings, adminOnly: true },
];

interface SidebarProps {
  user: {
    name: string;
    role: string;
  };
  streak?: number;
}

export function Sidebar({ user, streak = 0 }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isAdmin = user.role === 'admin';

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const NavLinks = () => (
    <>
      {filteredNavItems.map((item) => {
        const currentSearch = searchParams.toString();
        const fullPath = currentSearch ? `${pathname}?${currentSearch}` : pathname;
        const isActive = pathname === item.href || 
          (item.href.includes('?') && fullPath === item.href);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
          >
            <motion.div
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </motion.div>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">RoutineLink</span>
            </Link>
          </div>

          {/* Streak Display */}
          {streak > 0 && (
            <div className="px-6 py-4 border-b">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10"
              >
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">{streak} day streak!</p>
                  <p className="text-xs text-muted-foreground">Keep it going!</p>
                </div>
              </motion.div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavLinks />
          </nav>

          {/* User Section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
