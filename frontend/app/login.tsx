import * as AuthSession from 'expo-auth-session';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Image, ImageBackground, Platform, Pressable, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthSession } from '@/hooks/use-auth-session';
import { config } from '@/services/config';
import { loginStyles as styles } from '@/styles/login.styles';

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

      try {
        const token = response.params?.id_token ?? response.authentication?.idToken;
        if (!token) {
          throw new Error('Missing native ID token');
        }
        const authResult = await signInWithGoogleNative(token);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (authResult.isNewUser) {
          router.replace('/onboarding?step=0');
        } else {
          router.replace('/');
        }
      } catch {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    void handleResponse();
  }, [response, signInWithGoogleNative]);

  return (
    <ThemedView style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/login_bg_gradient.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover">
        <View style={styles.centerContent}>
          <View style={styles.centerBlock}>
            <View style={styles.logoCircle}>
              <Image source={require('@/assets/images/navable_logo.png')} style={styles.logoImage} />
            </View>
            <ThemedText style={styles.title}>NavAble</ThemedText>
          </View>

          <View style={styles.bottomBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              disabled={!request || !hasClientId || isLoading}
              style={[styles.primaryButton, (!request || !hasClientId || isLoading) && styles.disabled]}
              onPress={() => void promptAsync()}>
              {isLoading ? <ActivityIndicator color="#2E155F" /> : <ThemedText style={styles.buttonText}>Continue with Google</ThemedText>}
            </Pressable>

            {!hasClientId ? (
              <ThemedText style={styles.error}>
                Missing Google OAuth client IDs in frontend env.
              </ThemedText>
            ) : null}
            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          </View>
        </View>
      </ImageBackground>
    </ThemedView>
  );
}
