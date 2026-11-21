import { useColorScheme } from 'react-native';

import { createTheme, type Theme } from '@/constants/theme';

/**
 * Returns the design tokens for the scheme the device is currently using.
 * Follows the system light/dark setting because app.json sets
 * `userInterfaceStyle: "automatic"`.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return createTheme(scheme === 'dark' ? 'dark' : 'light');
}
