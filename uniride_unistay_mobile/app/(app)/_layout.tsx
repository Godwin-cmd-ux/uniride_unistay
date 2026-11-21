import { Redirect, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const { ready, user } = useAuth();
  const theme = useTheme();

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textMuted }}>Loading your workspace…</Text>
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
