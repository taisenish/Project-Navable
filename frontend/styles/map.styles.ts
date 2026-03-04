import { StyleSheet } from 'react-native';

import { radius } from '@/styles/tokens';

export const mapStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1B1D27',
  },
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: '#7B3FF3',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBubble: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: '#CBA8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  brandTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  brandSubtitle: {
    color: '#F0E8FF',
    fontSize: 14,
  },
  searchInput: {
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    paddingHorizontal: 14,
    fontSize: 16,
  },
  mapArea: {
    flex: 1,
    paddingTop: 10,
  },
  loader: {
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    alignItems: 'center',
  },
  greenChip: {
    backgroundColor: '#20B300',
  },
  redChip: {
    backgroundColor: '#FF472F',
  },
  blueChip: {
    backgroundColor: '#3A6FF2',
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    gap: 6,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#39435E',
    backgroundColor: '#202637',
  },
  button: {
    backgroundColor: '#7B3FF3',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#7B3FF3',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#202637',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  error: {
    color: '#FF857A',
    textAlign: 'center',
    marginBottom: 8,
  },
});
