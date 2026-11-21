'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/auth';

export default function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const workspace =
    ready &&
    user?.role === 'STUDENT' &&
    (pathname === '/rides' || pathname.startsWith('/stays'));

  return (
    <>
      <main className="site-main">{children}</main>
      {workspace ? null : <Footer />}
    </>
  );
}
