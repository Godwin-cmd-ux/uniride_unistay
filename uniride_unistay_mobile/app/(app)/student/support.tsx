import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { Body, Card, Empty, Field, LoadingView, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { Complaint } from '@/lib/types';

export default function StudentSupport() {
  const theme = useTheme();
  const { push } = useToast();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api<Complaint[]>('/api/complaints/mine'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setBusy(true);
    try {
      await api('/api/complaints', { method: 'POST', body: { subject, description } });
      push('Complaint submitted. Our team will review it.', 'success');
      setSubject('');
      setDescription('');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not submit complaint', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      role="STUDENT"
      title="Help & safety"
      subtitle="Report a ride, stay or safety issue. Every case gets a reference and a reply.">
      <Card>
        <Body bold>Raise a complaint</Body>
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What went wrong?" />
        <Field
          label="What happened?"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Include the date, route, driver or property, and anyone involved."
        />
        <Button
          label={busy ? 'Sending…' : 'Submit complaint'}
          onPress={() => void submit()}
          disabled={busy || subject.trim().length < 3 || description.trim().length < 10}
          block
        />
        <Body muted small>
          For an emergency, call campus security or the police first, then file a report here.
        </Body>
      </Card>

      <Body bold>My complaints</Body>
      {loading ? (
        <LoadingView label="Loading complaints" />
      ) : items.length === 0 ? (
        <Card>
          <Empty
            icon="shield-outline"
            title="No complaints filed"
            description="If something goes wrong, tell us and keep your reference."
          />
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <Card style={{ backgroundColor: 'transparent', borderColor: 'transparent', padding: 0 }}>
              <Body bold small>
                {item.subject}
              </Body>
            </Card>
            <StatusBadge status={item.status} />
            <Body muted small>
              {item.description}
            </Body>
            {item.resolution ? (
              <Body small style={{ color: theme.success }}>
                Resolution: {item.resolution}
              </Body>
            ) : null}
            <Body muted small>
              {timeAgo(item.createdAt)} · ref {item.id.slice(0, 8).toUpperCase()}
            </Body>
          </Card>
        ))
      )}
    </Workspace>
  );
}
