import { StyleSheet } from 'react-native';

import { palette, radius } from '@/styles/tokens';

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  heroCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 6,
  },
  userLabel: {
    color: palette.textMuted,
  },
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.text,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  error: {
    color: palette.danger,
  },
});
