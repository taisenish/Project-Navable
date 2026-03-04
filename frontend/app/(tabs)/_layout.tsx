import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

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
          height: 88,
          borderTopWidth: 1,
          borderTopColor: '#E1E1E6',
          backgroundColor: '#F3F3F4',
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'hidden',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <FontAwesome name="map" size={24} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            console.log('[BottomTab] tabPress: map');
          },
          focus: () => {
            console.log('[BottomTab] focus: map');
          },
        }}
      />
      <Tabs.Screen
        name="view-3d"
        options={{
          title: '3D View',
          tabBarIcon: ({ color }) => <FontAwesome6 name="cube" size={24} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            console.log('[BottomTab] tabPress: view-3d');
          },
          focus: () => {
            console.log('[BottomTab] focus: view-3d');
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-sharp" size={24} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            console.log('[BottomTab] tabPress: settings');
          },
          focus: () => {
            console.log('[BottomTab] focus: settings');
          },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {},
});
