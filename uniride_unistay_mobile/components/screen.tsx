import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

type ScreenProps = PropsWithChildren<{
  /** Wrap the content in a ScrollView (for screens taller than the viewport). */
  scroll?: boolean;
  /** Extra style for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Extra style for the padded content area. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Drop the default horizontal/vertical padding. */
  bleed?: boolean;
}>;

/**
 * Standard page shell: safe-area aware, themed background, consistent padding.
 * Use it on every route so screens never hand-roll insets.
 */
export function Screen({ children, scroll = false, style, contentStyle, bleed = false }: ScreenProps) {
  const theme = useTheme();
  const padding = bleed ? null : { padding: theme.spacing.md };

  if (scroll) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }, style]}>
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }, style]}>
      <View style={[styles.flex, padding, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
