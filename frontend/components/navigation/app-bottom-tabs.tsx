import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type TabKey = 'map' | 'view3d' | 'settings';

type Props = {
  active: TabKey;
};

export function AppBottomTabs({ active }: Props) {
  return (
    <View style={styles.container}>
      <Link href="/map" asChild>
        <Pressable style={styles.tab} accessibilityRole="button" accessibilityLabel="Open map tab">
          <FontAwesome name="map" size={24} color={active === 'map' ? '#7B3FF3' : '#111'} />
          <ThemedText style={[styles.label, active === 'map' && styles.activeLabel]}>Map</ThemedText>
        </Pressable>
      </Link>

      <Link href="/view-3d" asChild>
        <Pressable style={styles.tab} accessibilityRole="button" accessibilityLabel="Open 3D view tab">
          <FontAwesome6 name="cube" size={24} color={active === 'view3d' ? '#7B3FF3' : '#111'} />
          <ThemedText style={[styles.label, active === 'view3d' && styles.activeLabel]}>3D View</ThemedText>
        </Pressable>
      </Link>

      <Link href="/settings" asChild>
        <Pressable style={styles.tab} accessibilityRole="button" accessibilityLabel="Open settings tab">
          <Ionicons name="settings-sharp" size={24} color={active === 'settings' ? '#7B3FF3' : '#111'} />
          <ThemedText style={[styles.label, active === 'settings' && styles.activeLabel]}>Settings</ThemedText>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 88,
    backgroundColor: '#F3F3F4',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
  },
  label: {
    fontSize: 15,
    color: '#111',
  },
  activeLabel: {
    color: '#7B3FF3',
    fontWeight: '700',
  },
});
