import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { useAuthSession } from '../../state/auth-session';

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
        tabBarInactiveTintColor: '#111111',
        tabBarStyle: {
          height: 84,
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          backgroundColor: '#F7F7F8',
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <FontAwesome name="map" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="view-3d"
        options={{
          title: '3D View',
          tabBarIcon: ({ color }) => <FontAwesome6 name="cube" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-sharp" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
