'use client';

import { AppShell } from '@/components/AppShell';
import { AccountSettings } from '@/components/AccountSettings';
import { PageHeader } from '@/components/ui';

export default function OwnerAccountPage() {
  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Account"
        title="Host profile"
        subtitle="Your name and phone appear to students whose inquiries you accept."
      />
      <AccountSettings />
    </AppShell>
  );
}
