import Constants from 'expo-constants';

let API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (__DEV__ && API_BASE_URL && (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1'))) {
  // expoConfig.hostUri contains the developer machine IP:Metro port (e.g., '192.168.1.10:8081')
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const localIp = hostUri.split(':')[0];
    if (localIp) {
      API_BASE_URL = `http://${localIp}:8000/api/v1`;
    }
  }
}

if (!API_BASE_URL) {
  API_BASE_URL = 'https://navable-dev-backend-a2f6dkdqg2ebdmc5.centralus-01.azurewebsites.net/api/v1';
}

console.log('Resolved Navable API Base URL:', API_BASE_URL);
console.log('Resolved Spoof Location Env:', process.env.EXPO_PUBLIC_SPOOF_LOCATION);

export const config = {
  apiBaseUrl: API_BASE_URL,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '',
  spoofLocation: process.env.EXPO_PUBLIC_SPOOF_LOCATION?.trim() || null,
} as const;
