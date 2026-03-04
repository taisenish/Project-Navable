import { StyleSheet } from 'react-native';

import { palette, radius } from '@/styles/tokens';

export const settingsStyles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 14,
    backgroundColor: palette.background,
  },
  row: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
  },
  slopeRow: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  surfaceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  surfaceChip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  surfaceChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  surfaceChipTextActive: {
    color: '#fff',
  },
  error: {
    color: palette.danger,
  },
});
