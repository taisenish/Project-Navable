import { StyleSheet } from 'react-native';

import { radius } from '@/styles/tokens';

export const onboardingStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 36,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    overflow: 'hidden',
  },
  topSpacer: {
    height: 20,
  },
  centerBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: radius.pill,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  iconText: {
    fontSize: 34,
  },
  logoImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#F5ECFF',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: '#EFE6FF',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    marginTop: 8,
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
  buttonText: {
    color: '#1D132D',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  pageIndicator: {
    color: '#EFE4FF',
    fontSize: 28,
    lineHeight: 30,
  },
});
