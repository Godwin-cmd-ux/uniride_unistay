import { Ionicons } from '@expo/vector-icons';
import { Redirect, usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { initials, roleHome } from '@/lib/format';
import type { NotificationItem, Role } from '@/lib/types';

type Tab = { href: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] };
type NavGroup = { label: string; items: Tab[] };

const tabsByRole: Record<Role, Tab[]> = {
  STUDENT: [
    { href: '/student', label: 'Home', icon: 'home-outline' },
    { href: '/student/stays', label: 'Stays', icon: 'bed-outline' },
    { href: '/student/rides', label: 'Ride', icon: 'bicycle-outline' },
    { href: '/notifications', label: 'Alerts', icon: 'notifications-outline' },
    { href: '/account', label: 'Profile', icon: 'person-outline' },
  ],
  DRIVER: [
    { href: '/driver', label: 'Home', icon: 'home-outline' },
    { href: '/driver/requests', label: 'Requests', icon: 'bicycle-outline' },
    { href: '/driver/trips', label: 'Trips', icon: 'navigate-outline' },
    { href: '/notifications', label: 'Alerts', icon: 'notifications-outline' },
    { href: '/driver/vehicle', label: 'Vehicle', icon: 'car-sport-outline' },
  ],
  OWNER: [
    { href: '/owner', label: 'Home', icon: 'home-outline' },
    { href: '/owner/properties', label: 'Listings', icon: 'business-outline' },
    { href: '/owner/inquiries', label: 'Inquiries', icon: 'chatbubbles-outline' },
    { href: '/owner/bookings', label: 'Bookings', icon: 'key-outline' },
    { href: '/account', label: 'Profile', icon: 'person-outline' },
  ],
  ADMIN: [
    { href: '/admin', label: 'Home', icon: 'home-outline' },
    { href: '/admin/drivers', label: 'Drivers', icon: 'shield-checkmark-outline' },
    { href: '/admin/properties', label: 'Listings', icon: 'business-outline' },
    { href: '/admin/users', label: 'Users', icon: 'people-outline' },
    { href: '/account', label: 'Profile', icon: 'person-outline' },
  ],
};

const navByRole: Record<Role, NavGroup[]> = {
  STUDENT: [
    {
      label: 'Workspace',
      items: [
        { href: '/student', label: 'Overview', icon: 'home-outline' },
        { href: '/student/stays', label: 'Find a stay', icon: 'bed-outline' },
        { href: '/student/rides', label: 'Book a ride', icon: 'bicycle-outline' },
        { href: '/student/inquiries', label: 'My inquiries', icon: 'chatbubbles-outline' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/student/support', label: 'Help & complaints', icon: 'shield-outline' },
        { href: '/notifications', label: 'Notifications', icon: 'notifications-outline' },
        { href: '/account', label: 'Profile', icon: 'person-outline' },
      ],
    },
  ],
  DRIVER: [
    {
      label: 'Drive',
      items: [
        { href: '/driver', label: 'Driver home', icon: 'home-outline' },
        { href: '/driver/requests', label: 'Ride requests', icon: 'bicycle-outline' },
        { href: '/driver/trips', label: 'Trip history', icon: 'navigate-outline' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/driver/vehicle', label: 'Vehicle & documents', icon: 'car-sport-outline' },
        { href: '/notifications', label: 'Notifications', icon: 'notifications-outline' },
        { href: '/account', label: 'Profile', icon: 'person-outline' },
      ],
    },
  ],
  OWNER: [
    {
      label: 'Hostel',
      items: [
        { href: '/owner', label: 'Overview', icon: 'home-outline' },
        { href: '/owner/properties', label: 'My properties', icon: 'business-outline' },
        { href: '/owner/inquiries', label: 'Inquiries', icon: 'chatbubbles-outline' },
        { href: '/owner/bookings', label: 'Bookings', icon: 'key-outline' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/notifications', label: 'Notifications', icon: 'notifications-outline' },
        { href: '/account', label: 'Profile', icon: 'person-outline' },
      ],
    },
  ],
  ADMIN: [
    {
      label: 'Operations',
      items: [
        { href: '/admin', label: 'Overview', icon: 'home-outline' },
        { href: '/admin/drivers', label: 'Driver verification', icon: 'shield-checkmark-outline' },
        { href: '/admin/properties', label: 'Property approvals', icon: 'business-outline' },
        { href: '/admin/users', label: 'Users', icon: 'people-outline' },
        { href: '/admin/rides', label: 'Ride log', icon: 'car-outline' },
      ],
    },
    {
      label: 'System',
      items: [
        { href: '/admin/universities', label: 'Campuses', icon: 'school-outline' },
        { href: '/admin/complaints', label: 'Complaints', icon: 'alert-circle-outline' },
        { href: '/admin/messages', label: 'Contact messages', icon: 'mail-outline' },
        { href: '/admin/logs', label: 'Audit log', icon: 'document-text-outline' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/notifications', label: 'Notifications', icon: 'notifications-outline' },
        { href: '/account', label: 'Profile', icon: 'person-outline' },
      ],
    },
  ],
};

const drawerInk = '#0B2319';
const drawerMuted = '#8FA79A';
const drawerText = '#C4D6CA';
const drawerLime = '#D7EFA9';

export function Workspace({
  role,
  title,
  subtitle,
  children,
  scroll = true,
  showTabs = true,
}: {
  role: Role;
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  showTabs?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, ready, signOut } = useAuth();
  const { selected } = useUniversity();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api<{ unreadCount: number; items: NotificationItem[] }>('/api/notifications')
      .then((data) => {
        if (active) setUnread(data.unreadCount);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, pathname]);

  if (!ready || !user) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textMuted }}>Loading workspace…</Text>
      </SafeAreaView>
    );
  }
  if (user.role !== role) return <Redirect href={roleHome(user.role) as never} />;

  const tabs = tabsByRole[role];
  const groups = navByRole[role];
  const homeHref = roleHome(role);

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === '/student/stays' && pathname.startsWith('/student/stay/')) return true;
    if (href === '/owner/properties' && pathname.startsWith('/owner/property/')) return true;
    return href !== homeHref && pathname.startsWith(`${href}/`);
  };

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href as never);
  };

  const logout = async () => {
    setMenuOpen(false);
    await signOut();
    router.replace('/');
  };

  const content = (
    <View style={{ padding: theme.spacing.md, paddingBottom: showTabs ? 120 : 32, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <View style={styles.brandRow}>
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open workspace navigation"
            hitSlop={8}
            style={[
              styles.menuButton,
              {
                backgroundColor: theme.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border,
              },
            ]}>
            <Ionicons name="menu-outline" size={22} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 }}>
            UNIRIDE · UNISTAY
          </Text>
          <Pressable
            onPress={() => router.push('/account')}
            style={{ marginLeft: 'auto' }}
            accessibilityRole="button"
            accessibilityLabel="Change campus">
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {selected ? selected.shortName : 'Choose campus'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: theme.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="notifications-outline" size={19} color={theme.text} />
            {unread > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.accent,
                }}
              />
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push('/account')}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: theme.onPrimary, fontWeight: '800', fontSize: 13 }}>
              {initials(user.fullName)}
            </Text>
          </Pressable>
        </View>
      </View>

      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}

      {showTabs ? (
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: Math.max(insets.bottom, 10),
            backgroundColor: theme.card,
            borderRadius: 22,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border,
            flexDirection: 'row',
            paddingVertical: 8,
            paddingHorizontal: 4,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}>
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Pressable
                key={tab.href}
                onPress={() => router.push(tab.href as never)}
                style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <View
                  style={{
                    width: 34,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: active ? theme.primarySoft : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons
                    name={tab.icon}
                    size={19}
                    color={active ? theme.primary : theme.textMuted}
                  />
                </View>
                <Text
                  style={{
                    color: active ? theme.primary : theme.textMuted,
                    fontSize: 10,
                    fontWeight: active ? '700' : '500',
                  }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {menuOpen ? (
        <View style={styles.drawerLayer}>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.drawerBackdrop]}
            onPress={() => setMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close navigation"
          />
          <View
            style={[
              styles.drawer,
              {
                width: Math.min(312, width * 0.85),
                paddingTop: 16,
                paddingBottom: insets.bottom + 12,
              },
            ]}>
            <View style={styles.drawerBrandRow}>
              <View>
                <Text style={styles.drawerBrand}>
                  uniride<Text style={{ color: drawerLime }}>/</Text>unistay
                </Text>
                <Text style={styles.drawerCampus}>
                  {selected ? `${selected.shortName} · ${selected.city}` : 'Choose your campus'}
                </Text>
              </View>
              <Pressable
                onPress={() => setMenuOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close navigation">
                <Ionicons name="close" size={22} color={drawerMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}>
              {groups.map((group) => (
                <View key={group.label}>
                  <Text style={styles.drawerSection}>{group.label}</Text>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Pressable
                        key={item.href}
                        onPress={() => go(item.href)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[styles.drawerLink, active && styles.drawerLinkActive]}>
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={active ? drawerInk : drawerText}
                        />
                        <Text
                          style={[
                            styles.drawerLinkText,
                            { color: active ? drawerInk : drawerText },
                            active && { fontWeight: '700' },
                          ]}>
                          {item.label}
                        </Text>
                        {item.href === '/notifications' && unread > 0 ? (
                          <View style={styles.drawerBadge}>
                            <Text style={styles.drawerBadgeText}>
                              {unread > 9 ? '9+' : unread}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.drawerFoot}>
              <Pressable onPress={() => go('/account')} style={styles.drawerUser}>
                <View style={styles.drawerAvatar}>
                  <Text style={{ color: drawerLime, fontWeight: '800', fontSize: 12 }}>
                    {initials(user.fullName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.drawerUserText}>
                    {user.fullName}
                  </Text>
                  <Text style={styles.drawerRole}>{role}</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => void logout()} style={styles.drawerSignout}>
                <Ionicons name="log-out-outline" size={17} color="#F08C82" />
                <Text style={{ color: '#F08C82', fontSize: 13, fontWeight: '600' }}>
                  Sign out
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  drawerLayer: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  drawerBackdrop: { backgroundColor: 'rgba(6, 16, 11, 0.5)' },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: drawerInk,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 8, height: 0 },
    elevation: 24,
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 18,
  },
  drawerBrand: {
    color: '#F2F6F2',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  drawerCampus: { color: drawerMuted, fontSize: 11, marginTop: 3 },
  drawerSection: {
    color: '#6F8A7B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 12,
  },
  drawerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  drawerLinkActive: { backgroundColor: drawerLime },
  drawerLinkText: { fontSize: 14, fontWeight: '500', flex: 1 },
  drawerBadge: {
    backgroundColor: '#E8742A',
    borderRadius: 10,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  drawerFoot: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 12,
    gap: 6,
  },
  drawerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  drawerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(215, 239, 169, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerUserText: { color: '#F0F4EC', fontSize: 13, fontWeight: '700' },
  drawerRole: {
    color: drawerMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  drawerSignout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
});
