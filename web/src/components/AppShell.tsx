'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from './Logo';
import { Icon, type IconName } from './Icon';
import { UniversitySelect } from './UniversitySelect';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { initials, roleHome } from '@/lib/format';
import type { NotificationItem, Role } from '@/lib/types';

type Group = { label: string; items: { href: string; label: string; icon: IconName }[] };

const navByRole: Record<Role, Group[]> = {
  STUDENT: [
    {
      label: 'Workspace',
      items: [
        { href: '/dashboard', label: 'Overview', icon: 'home' },
        { href: '/stays', label: 'Find a stay', icon: 'bed' },
        { href: '/rides', label: 'Book a ride', icon: 'bike' },
        { href: '/dashboard/inquiries', label: 'My inquiries', icon: 'chat' },
        { href: '/dashboard/rides', label: 'My rides', icon: 'route' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/notifications', label: 'Notifications', icon: 'bell' },
        { href: '/dashboard/account', label: 'Profile', icon: 'user' },
        { href: '/dashboard/support', label: 'Help & complaints', icon: 'shield' },
      ],
    },
  ],
  DRIVER: [
    {
      label: 'Drive',
      items: [
        { href: '/driver', label: 'Driver home', icon: 'home' },
        { href: '/driver/requests', label: 'Ride requests', icon: 'bike' },
        { href: '/driver/trips', label: 'Trip history', icon: 'route' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/driver/vehicle', label: 'Vehicle & documents', icon: 'key' },
        { href: '/notifications', label: 'Notifications', icon: 'bell' },
        { href: '/driver/account', label: 'Profile', icon: 'user' },
      ],
    },
  ],
  OWNER: [
    {
      label: 'Hostel',
      items: [
        { href: '/owner', label: 'Overview', icon: 'home' },
        { href: '/owner/properties', label: 'My properties', icon: 'building' },
        { href: '/owner/inquiries', label: 'Inquiries', icon: 'chat' },
        { href: '/owner/bookings', label: 'Bookings', icon: 'key' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/notifications', label: 'Notifications', icon: 'bell' },
        { href: '/owner/account', label: 'Profile', icon: 'user' },
      ],
    },
  ],
  ADMIN: [
    {
      label: 'Operations',
      items: [
        { href: '/admin', label: 'Overview', icon: 'home' },
        { href: '/admin/users', label: 'Users', icon: 'users' },
        { href: '/admin/drivers', label: 'Driver verification', icon: 'bike' },
        { href: '/admin/properties', label: 'Property approvals', icon: 'building' },
        { href: '/admin/rides', label: 'Rides', icon: 'route' },
        { href: '/admin/complaints', label: 'Complaints', icon: 'alert' },
      ],
    },
    {
      label: 'System',
      items: [
        { href: '/admin/universities', label: 'Universities', icon: 'pin' },
        { href: '/admin/messages', label: 'Contact messages', icon: 'mail' },
        { href: '/admin/logs', label: 'Audit log', icon: 'shield' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/notifications', label: 'Notifications', icon: 'bell' },
        { href: '/admin/account', label: 'Profile', icon: 'user' },
      ],
    },
  ],
};

const roleLabel: Record<Role, string> = {
  STUDENT: 'Student',
  DRIVER: 'Driver',
  OWNER: 'Stay owner',
  ADMIN: 'Administrator',
};

const roleTitle: Record<Role, string> = {
  STUDENT: 'Your campus, sorted',
  DRIVER: 'Driver workspace',
  OWNER: 'Owner workspace',
  ADMIN: 'Control room',
};

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== role) router.replace(roleHome(user.role));
  }, [ready, user, role, pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || !user) return;
    let active = true;
    api<{ items: NotificationItem[]; unreadCount: number }>('/api/notifications')
      .then((data) => {
        if (active) setUnread(data.unreadCount);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [ready, user, pathname]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <span className="spinner" /> Loading workspace…
      </div>
    );
  }

  const groups = navByRole[role];

  const logout = () => {
    signOut();
    router.replace('/');
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="side-brand">
          <Logo href={roleHome(role)} light />
        </div>
        <nav className="side-nav" aria-label="Workspace navigation">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="side-section">{group.label}</div>
              {group.items.map((item) => {
                const active =
                  item.href === pathname ||
                  (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? 'side-link active' : 'side-link'}
                  >
                    <Icon name={item.icon} size={17} />
                    {item.label}
                    {item.href === '/notifications' && unread > 0 && (
                      <span className="side-badge">{unread}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="side-user">
            <span className="avatar">{initials(user.fullName)}</span>
            <div>
              <strong>{user.fullName}</strong>
              <span>{roleLabel[role]}</span>
            </div>
          </div>
          <button type="button" className="side-logout" onClick={logout}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </aside>
      <div
        className={`side-overlay ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <div className="shell-main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            <Icon name="menu" size={19} />
          </button>
          <div className="topbar-title">
            <strong>{roleTitle[role]}</strong>
            <span>
              {user.universityShortName ? `${user.universityShortName} · ` : ''}
              {user.fullName}
            </span>
          </div>
          <UniversitySelect compact />
          <span className="topbar-role">{roleLabel[role]}</span>
          <Link href="/notifications" className="topbar-icon" aria-label="Notifications">
            <Icon name="bell" size={18} />
            {unread > 0 && <span className="count">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <span className="avatar" title={user.fullName}>
            {initials(user.fullName)}
          </span>
        </header>
        <div className="shell-content">{children}</div>
      </div>
    </div>
  );
}
