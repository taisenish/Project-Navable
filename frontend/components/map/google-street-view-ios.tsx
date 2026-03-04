import { requireNativeViewManager } from 'expo-modules-core';
import type { StyleProp, ViewStyle } from 'react-native';

export type GoogleStreetViewIOSProps = {
  style?: StyleProp<ViewStyle>;
  latitude: number;
  longitude: number;
  zoom?: number;
  tilt?: number;
  bearing?: number;
  isPanningGesturesEnabled?: boolean;
  isStreetNamesEnabled?: boolean;
  isUserNavigationEnabled?: boolean;
  isZoomGesturesEnabled?: boolean;
};

let NativeStreetView: React.ComponentType<GoogleStreetViewIOSProps> | null = null;

try {
  NativeStreetView = requireNativeViewManager<GoogleStreetViewIOSProps>('ExpoGoogleStreetViewIOS');
} catch {
  try {
    NativeStreetView = requireNativeViewManager<GoogleStreetViewIOSProps>(
      'ExpoGoogleStreetViewIOS',
      'GoogleStreetViewIOSView'
    );
  } catch {
    NativeStreetView = null;
  }
}

export const isGoogleStreetViewIOSAvailable = NativeStreetView !== null;

export function GoogleStreetViewIOS(props: GoogleStreetViewIOSProps) {
  if (!NativeStreetView) {
    return null;
  }

  return <NativeStreetView {...props} />;
}
