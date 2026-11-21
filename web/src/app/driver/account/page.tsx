'use client';

import { AppShell } from '@/components/AppShell';
import { AccountSettings } from '@/components/AccountSettings';
import { PageHeader } from '@/components/ui';

export default function DriverAccountPage() {
  return (
    <AppShell role="DRIVER">
      <PageHeader
        eyebrow="Account"
        title="Driver profile"
        subtitle="Update your contact details and password. Verification documents live under Vehicle & documents."
      />
      <AccountSettings />
    </AppShell>
  );
}
