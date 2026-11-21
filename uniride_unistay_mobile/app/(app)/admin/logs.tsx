import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import {
  Body,
  Card,
  Empty,
  Field,
  LoadingView,
  Row,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { AdminLog } from '@/lib/types';

export default function AdminLogs() {
  const theme = useTheme();
  const { push } = useToast();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLogs(await api<AdminLog[]>('/api/admin/logs'));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load audit log', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((log) =>
      [log.action, log.adminName, log.entityType, log.entityId]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [logs, search]);

  return (
    <Workspace
      role="ADMIN"
      title="Audit log"
      subtitle="Every sensitive admin action is recorded here.">
      <Field
        label="Filter"
        value={search}
        onChangeText={setSearch}
        placeholder="Action, admin, entity…"
        autoCapitalize="none"
      />

      {loading ? (
        <LoadingView label="Loading audit log" />
      ) : filtered.length === 0 ? (
        <Empty icon="document-text-outline" title="No log entries" description="Verification and suspension actions will appear here." />
      ) : (
        filtered.map((log) => (
          <Card key={log.id}>
            <Row align="space-between">
              <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>
                {log.action.replaceAll('_', ' ')}
              </Text>
              <Body muted small>
                {dateTime(log.createdAt)}
              </Body>
            </Row>
            <Body small>{log.adminName}</Body>
            <Body muted small>
              {log.entityType} · {log.entityId.slice(0, 8)}…
            </Body>
            {Object.keys(log.details ?? {}).length > 0 && (
              <View
                style={{
                  backgroundColor: theme.cardMuted,
                  borderRadius: theme.radius.sm,
                  padding: 8,
                }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'monospace' }}>
                  {JSON.stringify(log.details)}
                </Text>
              </View>
            )}
          </Card>
        ))
      )}
    </Workspace>
  );
}
