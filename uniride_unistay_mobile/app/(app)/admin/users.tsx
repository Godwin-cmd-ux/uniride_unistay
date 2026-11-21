import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import {
  Body,
  Card,
  Empty,
  Field,
  LoadingView,
  Row,
  SegTabs,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { initials, shortDate } from '@/lib/format';
import type { AdminUser } from '@/lib/types';

const roleTabs = [
  { value: '', label: 'All' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'DRIVER', label: 'Drivers' },
  { value: 'OWNER', label: 'Hosts' },
  { value: 'ADMIN', label: 'Admins' },
];

const roleTone: Record<string, string> = {
  STUDENT: 'Local student',
  DRIVER: 'Verified driver',
  OWNER: 'Stay host',
  ADMIN: 'Platform admin',
};

export default function AdminUsers() {
  const theme = useTheme();
  const { push } = useToast();
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (debounced) params.set('search', debounced);
      const suffix = params.toString();
      setUsers(await api<AdminUser[]>(`/api/admin/users${suffix ? `?${suffix}` : ''}`));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [role, debounced, push]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeStatus(user: AdminUser) {
    const next = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    Alert.alert(
      next === 'SUSPENDED' ? 'Suspend account?' : 'Reinstate account?',
      next === 'SUSPENDED'
        ? `${user.fullName} will lose access immediately. Drivers are sent offline.`
        : `${user.fullName} can sign in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next === 'SUSPENDED' ? 'Suspend' : 'Reinstate',
          style: next === 'SUSPENDED' ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              setBusyId(user.id);
              try {
                await api(`/api/admin/users/${user.id}/status`, {
                  method: 'PATCH',
                  body: { status: next },
                });
                push(next === 'SUSPENDED' ? 'Account suspended' : 'Account reinstated', 'success');
                await load();
              } catch (error) {
                push(error instanceof Error ? error.message : 'Action failed', 'error');
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <Workspace
      role="ADMIN"
      title="People"
      subtitle="Every account on UNIRIDE UNISTAY, with suspension controls.">
      <Field
        label="Search by name, phone or email"
        value={search}
        onChangeText={setSearch}
        placeholder="e.g. Neema or 0712…"
        autoCapitalize="none"
      />
      <SegTabs options={roleTabs} value={role} onChange={setRole} />

      {loading ? (
        <LoadingView label="Loading people" />
      ) : users.length === 0 ? (
        <Empty icon="people-outline" title="No accounts match" description="Try a different role or search." />
      ) : (
        users.map((user) => (
          <Card key={user.id}>
            <Row align="space-between">
              <Row>
                <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                  <Text style={{ color: theme.primary, fontWeight: '800' }}>
                    {initials(user.fullName)}
                  </Text>
                </View>
                <View>
                  <Body>{user.fullName}</Body>
                  <Body muted small>
                    {roleTone[user.role] ?? user.role} · {user.phone}
                    {user.email ? ` · ${user.email}` : ''}
                  </Body>
                </View>
              </Row>
              <StatusBadge status={user.status} />
            </Row>
            <Body muted small>
              {user.universityShortName ? `${user.universityShortName} · ` : ''}
              Joined {shortDate(user.createdAt)}
              {user.driverVerificationStatus
                ? ` · Driver ${user.driverVerificationStatus.toLowerCase()}`
                : ''}
            </Body>
            {user.role === 'ADMIN' ? (
              <Body muted small>
                Protected account
              </Body>
            ) : (
              <Button
                label={user.status === 'SUSPENDED' ? 'Reinstate account' : 'Suspend account'}
                variant={user.status === 'SUSPENDED' ? 'secondary' : 'danger'}
                size="sm"
                disabled={busyId === user.id}
                onPress={() => changeStatus(user)}
              />
            )}
          </Card>
        ))
      )}
    </Workspace>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
