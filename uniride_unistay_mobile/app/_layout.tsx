import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/auth';
import { ToastProvider } from '@/context/toast';
import { UniversityProvider } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UniversityProvider>
          <ToastProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
                animation: 'slide_from_right',
              }}
            />
            <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
          </ToastProvider>
        </UniversityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
