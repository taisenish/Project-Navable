const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://127.0.0.1:8000/api/v1';

export const config = {
  apiBaseUrl: API_BASE_URL,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '',
} as const;
