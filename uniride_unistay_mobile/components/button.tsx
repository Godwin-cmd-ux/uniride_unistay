import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  block?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  labelColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  icon,
  labelColor: labelColorProp,
  borderColor: borderColorProp,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'secondary'
        ? theme.card
        : variant === 'danger'
          ? theme.dangerSoft
          : 'transparent';
  const borderColor = borderColorProp ?? (
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : theme.border
  );
  const labelColor =
    labelColorProp ??
    (variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          paddingVertical: size === 'sm' ? 8 : 13,
          paddingHorizontal: size === 'sm' ? 12 : 18,
          borderRadius: theme.radius.md,
          width: block ? '100%' : undefined,
        },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 14 : 17} color={labelColor} /> : null}
      <Text
        style={[
          styles.label,
          { color: labelColor, fontSize: size === 'sm' ? theme.fontSize.sm : theme.fontSize.md },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontWeight: '700',
  },
});
