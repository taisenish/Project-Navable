import { StyleSheet } from 'react-native';

import { palette, radius } from '@/styles/tokens';

export const uwStaticMapStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: palette.mapBorder,
    borderRadius: radius.lg,
    padding: 10,
    gap: 8,
    backgroundColor: palette.surface,
  },
  mapImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.sm,
    backgroundColor: '#d9d9d9',
  },
});
