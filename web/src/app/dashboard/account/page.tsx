'use client';

import { AppShell } from '@/components/AppShell';
import { AccountSettings } from '@/components/AccountSettings';
import { PageHeader } from '@/components/ui';

export default function StudentAccountPage() {
  return (
    <AppShell role="STUDENT">
      <PageHeader
        eyebrow="Account"
        title="Profile & security"
        subtitle="Keep your campus, contact details and password up to date."
      />
      <AccountSettings />
    </AppShell>
  );
}
