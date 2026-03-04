import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';

export default function TabsLayout() {
  const { user, isLoading } = useAuthSession();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7B3FF3',
        tabBarInactiveTintColor: '#111',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          height: 88,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <FontAwesome name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="view-3d"
        options={{
          title: '3D View',
          tabBarIcon: ({ color }) => <FontAwesome6 name="cube" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-sharp" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    flex: 1,
    backgroundColor: '#F3F3F4',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
});
