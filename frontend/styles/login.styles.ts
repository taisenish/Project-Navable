import { StyleSheet } from 'react-native';

import { radius } from '@/styles/tokens';

export const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5E2AB9',
  },
  backgroundImage: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImageStyle: {
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    overflow: 'hidden',
  },
  centerContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
    marginTop: -30,
  },
  centerBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 22,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#5B2AB7',
  },
  logoImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 56,
    lineHeight: 58,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#EFEFEF',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#1D132D',
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: '#FFE2DF',
    textAlign: 'center',
    fontSize: 14,
  },
});
