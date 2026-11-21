import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import {
  Body,
  Card,
  Chips,
  Empty,
  Field,
  Heading,
  LoadingView,
  Row,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import type { Complaint } from '@/lib/types';

const filters = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const statuses = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

export default function AdminComplaints() {
  const { push } = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { status: string; resolution: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<Complaint[]>('/api/admin/complaints'));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load complaints', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = filter ? items.filter((item) => item.status === filter) : items;

  function draftFor(item: Complaint) {
    return draft[item.id] ?? { status: item.status, resolution: item.resolution ?? '' };
  }

  function update(
    id: string,
    base: { status: string; resolution: string },
    patch: Partial<{ status: string; resolution: string }>,
  ) {
    setDraft((current) => ({
      ...current,
      [id]: { ...base, ...current[id], ...patch },
    }));
  }

  async function save(item: Complaint) {
    const value = draftFor(item);
    setBusyId(item.id);
    try {
      await api(`/api/admin/complaints/${item.id}`, {
        method: 'PATCH',
        body: { status: value.status, resolution: value.resolution.trim() || undefined },
      });
      push('Complaint updated', 'success');
      setDraft((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update complaint', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Workspace
      role="ADMIN"
      title="Complaints"
      subtitle="Resolve rider, driver and host issues with a written resolution.">
      <Chips options={filters} value={filter} onChange={setFilter} />

      {loading ? (
        <LoadingView label="Loading complaints" />
      ) : visible.length === 0 ? (
        <Empty icon="alert-circle-outline" title="No complaints here" description="Nothing needs attention in this view." />
      ) : (
        visible.map((item) => {
          const value = draftFor(item);
          const dirty = item.id in draft;
          return (
            <Card key={item.id}>
              <Row align="space-between">
                <View style={{ flex: 1, gap: 4 }}>
                  <Heading size="sm">{item.subject}</Heading>
                  <Body muted small>
                    {item.complainantName ? `${item.complainantName} · ` : ''}
                    {shortDate(item.createdAt)}
                    {item.accusedName ? ` · about ${item.accusedName}` : ''}
                  </Body>
                </View>
                <StatusBadge status={item.status} />
              </Row>
              <Body small>{item.description}</Body>

              <Field
                label="Resolution / notes"
                value={value.resolution}
                onChangeText={(text) => update(item.id, value, { resolution: text })}
                placeholder="What was decided?"
                multiline
              />
              <Chips
                options={statuses}
                value={value.status}
                onChange={(status) => update(item.id, value, { status })}
              />
              <Button
                label="Save update"
                size="sm"
                disabled={!dirty || busyId === item.id}
                onPress={() => void save(item)}
              />
            </Card>
          );
        })
      )}
    </Workspace>
  );
}
