'use client';

import { AccountSettings } from '@/components/AccountSettings';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui';

export default function AdminAccountPage() {
  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Your account"
        title="Admin settings"
        subtitle="Keep your contact details current so audit entries and case notes stay accurate."
      />
      <AccountSettings />
    </AppShell>
  );
}
