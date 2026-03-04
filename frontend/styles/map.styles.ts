import { StyleSheet } from 'react-native';

import { palette, radius } from '@/styles/tokens';

export const mapStyles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: palette.background,
  },
  section: {
    gap: 6,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  button: {
    backgroundColor: palette.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: palette.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.surface,
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
