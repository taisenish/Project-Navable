import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuthSession } from '../state/auth-session';

export default function IndexScreen() {
  const { user, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
