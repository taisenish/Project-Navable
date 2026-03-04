import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuthSession } from '@/hooks/use-auth-session';

export default function IndexRedirect() {
  const { user, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B1D27' }}>
        <ActivityIndicator color="#7B3FF3" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
