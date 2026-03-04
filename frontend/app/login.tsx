import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Image, ImageBackground, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { config } from '../services/config';
import { useAuthSession } from '../state/auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signInWithGoogleNative, isLoading, error } = useAuthSession();

  const googleIosScheme = config.googleIosClientId
    ? `com.googleusercontent.apps.${config.googleIosClientId.replace('.apps.googleusercontent.com', '')}`
    : undefined;

  const redirectUri =
    Platform.OS === 'ios' && googleIosScheme
      ? `${googleIosScheme}:/oauthredirect`
      : AuthSession.makeRedirectUri({ path: 'oauthredirect' });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: config.googleIosClientId || undefined,
    iosClientId: config.googleIosClientId || undefined,
    androidClientId: config.googleAndroidClientId || undefined,
    redirectUri,
  });

  const hasClientId = useMemo(() => Boolean(config.googleIosClientId || config.googleAndroidClientId), []);

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type !== 'success') {
        return;
      }

      const token = response.params?.id_token ?? response.authentication?.idToken;
      if (!token) {
        return;
      }

      const authResult = await signInWithGoogleNative(token);
      if (authResult.isNewUser) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    };

    void handleResponse();
  }, [response, signInWithGoogleNative]);

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/images/login_bg_gradient.png')} style={styles.bg} resizeMode="cover">
        <View style={styles.content}>
          <View style={styles.logoCircle}>
            <Image source={require('../assets/images/navable_logo.png')} style={styles.logo} />
          </View>
          <Text style={styles.title}>NavAble</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            disabled={!request || !hasClientId || isLoading}
            style={[styles.button, (!request || !hasClientId || isLoading) && styles.buttonDisabled]}
            onPress={() => void promptAsync()}>
            {isLoading ? <ActivityIndicator color="#2E155F" /> : <Text style={styles.buttonText}>Continue with Google</Text>}
          </Pressable>

          {!hasClientId ? <Text style={styles.error}>Missing Google OAuth client ID env vars.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  logoCircle: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '800',
  },
  button: {
    marginTop: 24,
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#2E155F',
    fontSize: 22,
    fontWeight: '700',
  },
  error: {
    color: '#FCE7E7',
    textAlign: 'center',
    fontSize: 14,
  },
});
