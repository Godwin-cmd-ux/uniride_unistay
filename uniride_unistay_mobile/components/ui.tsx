import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Heading({
  children,
  size = 'md',
}: {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const theme = useTheme();
  const map = { sm: theme.fontSize.md, md: theme.fontSize.lg, lg: theme.fontSize.xl, xl: 32 };
  return (
    <Text style={{ color: theme.text, fontSize: map[size], fontWeight: '800', letterSpacing: -0.3 }}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted = false,
  small = false,
  bold = false,
  style,
  ...rest
}: TextProps & {
  children: ReactNode;
  muted?: boolean;
  small?: boolean;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          color: muted ? theme.textMuted : theme.text,
          fontSize: small ? theme.fontSize.sm : theme.fontSize.md,
          lineHeight: small ? 20 : 24,
          fontWeight: bold ? '700' : '400',
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Row({
  children,
  gap = 8,
  wrap = true,
  align = 'center',
  style,
}: {
  children: ReactNode;
  gap?: number;
  wrap?: boolean;
  align?: 'center' | 'flex-start' | 'space-between';
  style?: StyleProp<ViewStyle>;
}) {
  const { alignItems, justifyContent } =
    align === 'space-between'
      ? { alignItems: 'center' as const, justifyContent: 'space-between' as const }
      : { alignItems: align, justifyContent: 'flex-start' as const };
  return (
    <View
      style={[
        { flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap, alignItems, justifyContent },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Field({
  label,
  hint,
  multiline,
  style,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        style={[
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: theme.radius.md,
            color: theme.text,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: theme.fontSize.md,
            minHeight: multiline ? 96 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...props}
      />
      {hint ? (
        <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.xs }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export type Option = { value: string; label: string };

export function Chips({
  options,
  value,
  onChange,
  style,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value || option.label}
            onPress={() => onChange(option.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: theme.radius.pill,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: active ? theme.primary : theme.border,
              backgroundColor: active ? theme.primary : theme.surface,
            }}>
            <Text
              style={{
                color: active ? theme.onPrimary : theme.text,
                fontSize: theme.fontSize.sm,
                fontWeight: '600',
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SegTabs({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.cardMuted,
        borderRadius: theme.radius.md,
        padding: 4,
        gap: 4,
      }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value || option.label}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: theme.radius.sm,
              backgroundColor: active ? theme.card : 'transparent',
              alignItems: 'center',
            }}>
            <Text
              style={{
                color: active ? theme.text : theme.textMuted,
                fontSize: theme.fontSize.sm,
                fontWeight: active ? '700' : '500',
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const toneMap = {
  success: 'success',
  info: 'info',
  warn: 'warning',
  danger: 'danger',
  muted: 'textMuted',
} as const;

const statusTones: Record<string, keyof typeof toneMap> = {
  COMPLETED: 'success',
  ACTIVE: 'success',
  VERIFIED: 'success',
  APPROVED: 'success',
  IDLE: 'success',
  READ: 'success',
  RESOLVED: 'success',
  ACCEPTED: 'info',
  DRIVER_EN_ROUTE: 'info',
  ON_TRIP: 'info',
  ON_ROAD: 'info',
  REQUESTED: 'warn',
  PENDING: 'warn',
  IN_REVIEW: 'warn',
  OPEN: 'warn',
  NEW: 'warn',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  DECLINED: 'danger',
  DISMISSED: 'danger',
  WITHDRAWN: 'muted',
  OFFLINE: 'muted',
  ARCHIVED: 'muted',
  INACTIVE: 'muted',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const theme = useTheme();
  const key = toneMap[statusTones[status] ?? 'muted'];
  const color = theme[key] as string;
  const softMap: Record<string, string> = {
    success: theme.successSoft,
    info: theme.infoSoft,
    warn: theme.warningSoft,
    danger: theme.dangerSoft,
    muted: theme.cardMuted,
  };
  return (
    <View
      style={{
        backgroundColor: softMap[statusTones[status] ?? 'muted'],
        borderRadius: theme.radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}>
      <Text style={{ color, fontSize: theme.fontSize.xs, fontWeight: '700' }}>
        {label ?? status.replaceAll('_', ' ').toLowerCase()}
      </Text>
    </View>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        minWidth: 140,
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        gap: 4,
      }}>
      <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.xs, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ color: theme.text, fontSize: theme.fontSize.lg, fontWeight: '800' }}>
        {value}
      </Text>
      {hint ? (
        <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.xs }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Empty({
  title,
  description,
  icon = 'sparkles-outline',
}: {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, gap: 8 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <Heading size="sm">{title}</Heading>
      {description ? (
        <Body muted small style={{ textAlign: 'center', maxWidth: 280 }}>
          {description}
        </Body>
      ) : null}
    </View>
  );
}

export function LoadingView({ label = 'Loading' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
      <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.sm }}>{label}…</Text>
    </View>
  );
}

export function Notice({
  children,
  tone = 'warning',
}: {
  children: ReactNode;
  tone?: 'warning' | 'danger' | 'info' | 'success';
}) {
  const theme = useTheme();
  const background =
    tone === 'danger'
      ? theme.dangerSoft
      : tone === 'success'
        ? theme.successSoft
        : tone === 'info'
          ? theme.infoSoft
          : theme.warningSoft;
  const color =
    tone === 'danger'
      ? theme.danger
      : tone === 'success'
        ? theme.success
        : tone === 'info'
          ? theme.info
          : theme.warning;
  return (
    <View style={{ backgroundColor: background, borderRadius: theme.radius.md, padding: 12 }}>
      <Text style={{ color, fontSize: theme.fontSize.sm, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexGrow: 1, flexBasis: '45%', gap: 2 }}>
      <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.xs }}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={{ color: theme.text, fontSize: theme.fontSize.sm, fontWeight: '600' }}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

export const keyboard: KeyboardTypeOptions = 'default';

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#14231C',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
});
