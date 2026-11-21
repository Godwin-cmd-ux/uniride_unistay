'use client';

import type { ReactNode } from 'react';
import { AppShell } from './AppShell';
import { Nav } from './Nav';
import { useAuth } from '@/context/auth';

/**
 * Shared student-facing pages (stays, stay detail, ride booking) keep the same
 * workspace sidebar for students while staying public for guests and other roles.
 */
export function StudentFrame({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();

  if (ready && user?.role === 'STUDENT') {
    return <AppShell role="STUDENT">{children}</AppShell>;
  }

  return (
    <>
      <Nav variant="plain" />
      {children}
    </>
  );
}
