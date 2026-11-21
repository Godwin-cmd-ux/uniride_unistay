import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Body, Card, Heading, Row } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { roleHome } from '@/lib/format';
import type { Summary } from '@/lib/types';

const accountCards = [
  {
    role: 'STUDENT',
    icon: 'school-outline' as const,
    title: 'Students',
    body: 'Book a trusted ride to campus and find verified rooms, hostels and apartments near your gate.',
  },
  {
    role: 'DRIVER',
    icon: 'bicycle-outline' as const,
    title: 'Drivers',
    body: 'Go online between lectures, accept campus requests and get paid per completed trip.',
  },
  {
    role: 'OWNER',
    icon: 'business-outline' as const,
    title: 'Stay owners',
    body: 'List your hostel or apartment, answer student inquiries and fill beds each semester.',
  },
];

const scope = [
  {
    icon: 'navigate-outline' as const,
    title: 'Campus-first rides',
    body: 'Short, predictable trips from hostels to lecture halls, markets and town.',
  },
  {
    icon: 'bed-outline' as const,
    title: 'Verified student housing',
    body: 'Every property is checked before it goes live, with transparent monthly rent.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Safety by default',
    body: 'Verified drivers, document checks and an in-app complaints desk.',
  },
  {
    icon: 'wallet-outline' as const,
    title: 'Fair local pricing',
    body: 'Distance-based ride fares and accommodation success fees agreed up front.',
  },
];

export default function LandingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { selected } = useUniversity();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api<Summary>('/api/public/summary', { auth: false })
      .then(setSummary)
      .catch(() => undefined);
  }, []);

  const enter = () => router.push((user ? roleHome(user.role) : '/login') as never);
  const join = (role: string) =>
    router.push((user ? roleHome(user.role) : `/signup?role=${role}`) as never);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.nav}>
            <View>
              <Text style={{ color: theme.primary, fontWeight: '900', letterSpacing: 1.4, fontSize: 15 }}>
                UNIRIDE
              </Text>
              <Text style={{ color: theme.accent, fontWeight: '800', letterSpacing: 3.4, fontSize: 10 }}>
                UNISTAY
              </Text>
            </View>
            <View style={styles.navActions}>
              {!user && (
                <Pressable onPress={() => router.push('/login')}>
                  <Text style={{ color: theme.text, fontWeight: '600', padding: 8 }}>Log in</Text>
                </Pressable>
              )}
              <Button
                label={user ? 'Open app' : 'Sign up'}
                size="sm"
                onPress={user ? enter : () => router.push('/signup')}
              />
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.scheme === 'dark' ? theme.card : '#113A2B',
              borderRadius: 26,
              padding: 24,
              gap: 16,
              overflow: 'hidden',
            }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(227,176,75,0.18)',
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}>
              <Text style={{ color: theme.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                {selected ? `${selected.shortName} · ${selected.city.toUpperCase()}` : 'DODOMA · UDOM FIRST'}
              </Text>
            </View>
            <Text style={{ color: '#F7F3EC', fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 40 }}>
              Campus life,{'\n'}one app.
            </Text>
            <Text style={{ color: 'rgba(247,243,236,0.78)', fontSize: 15, lineHeight: 23 }}>
              UNIRIDE gets you to class safely. UNISTAY finds a verified bed near the gate. Built
              for Tanzanian university towns, starting in Dodoma.
            </Text>
            <Row>
              <Button label="Book a ride" onPress={enter} icon="bicycle-outline" />
              <Button
                label="Find a stay"
                variant="secondary"
                onPress={enter}
                icon="bed-outline"
                labelColor="#F7F3EC"
                borderColor="rgba(247,243,236,0.3)"
              />
            </Row>
            <Row gap={16}>
              {['Verified drivers', 'Checked stays', 'Local support'].map((item) => (
                <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.lime} />
                  <Text style={{ color: 'rgba(247,243,236,0.8)', fontSize: 11 }}>{item}</Text>
                </View>
              ))}
            </Row>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {[
              { label: 'Campuses', value: summary?.stats.universities ?? 1 },
              { label: 'Verified drivers', value: summary?.stats.verifiedDrivers ?? 0 },
              { label: 'Live listings', value: summary?.stats.activeProperties ?? 0 },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: theme.radius.lg,
                  padding: 14,
                  gap: 4,
                }}>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{item.value}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 }}>
              OUR STORY
            </Text>
            <Heading size="lg">Built on the road to class.</Heading>
            <Body muted small>
              We watched students in Dodoma walk long distances to lectures, negotiate unsafe rides
              after dark and hunt for rooms through word of mouth. UNIRIDE UNISTAY brings both needs
              into one trusted, student-first platform — with campus verification at its core.
            </Body>
            <Card style={{ marginTop: 4 }}>
              <Row gap={12} wrap={false} align="flex-start">
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: theme.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="people-outline" size={20} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body bold small>
                    Students first
                  </Body>
                  <Body muted small>
                    Affordable rides, real photos of rooms and honest prices — reviewed by the people
                    who use them.
                  </Body>
                </View>
              </Row>
            </Card>
          </View>

          <View style={styles.section}>
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 }}>
              OUR SCOPE
            </Text>
            <Heading size="lg">What you can do here.</Heading>
            <View style={{ gap: 10 }}>
              {scope.map((item) => (
                <Card key={item.title}>
                  <Row gap={12} wrap={false} align="flex-start">
                    <Ionicons name={item.icon} size={20} color={theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Body bold small>
                        {item.title}
                      </Body>
                      <Body muted small>
                        {item.body}
                      </Body>
                    </View>
                  </Row>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 }}>
              AVAILABLE ACCOUNTS
            </Text>
            <Heading size="lg">Pick your side of campus.</Heading>
            {accountCards.map((item) => (
              <Card key={item.role} style={{ marginTop: 10 }}>
                <Row gap={12} wrap={false} align="flex-start">
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: theme.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name={item.icon} size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Body bold>{item.title}</Body>
                    <Body muted small>
                      {item.body}
                    </Body>
                    <Pressable onPress={() => join(item.role)} style={{ paddingVertical: 4 }}>
                      <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                        Create a {item.title.toLowerCase()} account →
                      </Text>
                    </Pressable>
                  </View>
                </Row>
              </Card>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 }}>
              CONTACT US
            </Text>
            <Heading size="lg">Talk to a real person.</Heading>
            <Card>
              <Row gap={10}>
                <Ionicons name="call-outline" size={17} color={theme.primary} />
                <Body small>+255 700 000 000</Body>
              </Row>
              <Row gap={10}>
                <Ionicons name="mail-outline" size={17} color={theme.primary} />
                <Body small>hello@unirideunistay.co.tz</Body>
              </Row>
              <Row gap={10}>
                <Ionicons name="location-outline" size={17} color={theme.primary} />
                <Body small>Dodoma, Tanzania · Monday to Saturday</Body>
              </Row>
            </Card>
          </View>
        </View>

        <View
          style={{
            marginTop: 28,
            paddingHorizontal: 20,
            paddingVertical: 24,
            backgroundColor: theme.scheme === 'dark' ? theme.card : '#113A2B',
            gap: 8,
          }}>
          <Text style={{ color: '#F7F3EC', fontSize: 18, fontWeight: '800' }}>
            UNIRIDE <Text style={{ color: '#E3B04B' }}>UNISTAY</Text>
          </Text>
          <Text style={{ color: 'rgba(247,243,236,0.65)', fontSize: 12, lineHeight: 18 }}>
            Student mobility and housing for Tanzanian campuses. Rides and stays, verified.
          </Text>
          <Text style={{ color: 'rgba(247,243,236,0.45)', fontSize: 11, marginTop: 8 }}>
            © {new Date().getFullYear()} UNIRIDE UNISTAY · Dodoma
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: { marginTop: 30, gap: 10 },
});
