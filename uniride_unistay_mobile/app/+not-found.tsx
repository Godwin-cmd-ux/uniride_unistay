import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Shown for any unknown route (deep link with a bad path, typo, ...). */
export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: theme.background, gap: theme.spacing.sm }]}>
        <Text style={[styles.title, { color: theme.text }]}>This screen does not exist.</Text>
        <Link href="/" style={[styles.link, { color: theme.primary }]}>
          Go to the home screen
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
  },
});
