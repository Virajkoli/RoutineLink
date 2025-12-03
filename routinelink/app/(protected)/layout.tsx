import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';
import { Toaster } from '@/components/ui/toaster';

function SidebarSkeleton() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-card border-r hidden md:block">
      <div className="p-6 border-b">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </aside>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar
          user={{
            name: session.user.name || 'User',
            role: session.user.role || 'friend',
          }}
        />
      </Suspense>
      <main className="md:ml-64 min-h-screen">
        <div className="container mx-auto p-6 md:p-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
