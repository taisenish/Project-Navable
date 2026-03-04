import { StyleSheet } from 'react-native';

import { palette, radius } from '@/styles/tokens';

export const routeDetailsStyles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: palette.background,
  },
  step: {
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    gap: 6,
    backgroundColor: palette.surface,
  },
});
