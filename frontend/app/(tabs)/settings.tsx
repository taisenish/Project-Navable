import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useMemo, useState } from 'react';

import { TopBar } from '../../components/top-bar';
import { useAuthSession } from '../../state/auth-session';

type SettingsRow = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

export default function SettingsScreen() {
  const { user, signOut } = useAuthSession();
  const [values, setValues] = useState<Record<string, boolean>>({
    avoidStairs: true,
    preferElevators: true,
    avoidSteepSlopes: true,
    surfacePreferences: true,
    shortestDistance: true,
    fastestTime: false,
    communityReports: true,
    routeAlerts: true,
    voiceGuidance: true,
    largeText: false,
  });

  const sections = useMemo(
    () => [
      {
        title: 'Accessibility Preferences',
        rows: [
          { key: 'avoidStairs', label: 'Avoid Stairs', icon: <MaterialCommunityIcons name="stairs" size={18} color="#111" /> },
          { key: 'preferElevators', label: 'Prefer Elevators', icon: <Ionicons name="swap-vertical" size={18} color="#111" /> },
          { key: 'avoidSteepSlopes', label: 'Avoid Steep Slopes', icon: <FontAwesome6 name="mountain" size={16} color="#111" /> },
          { key: 'surfacePreferences', label: 'Surface Preferences', icon: <MaterialCommunityIcons name="texture-box" size={18} color="#111" /> },
        ] as SettingsRow[],
      },
      {
        title: 'Route Preferences',
        rows: [
          { key: 'shortestDistance', label: 'Shortest Distance', icon: <MaterialCommunityIcons name="arrow-left-right" size={18} color="#111" /> },
          { key: 'fastestTime', label: 'Fastest Time', icon: <MaterialCommunityIcons name="fast-forward" size={18} color="#111" /> },
        ] as SettingsRow[],
      },
      {
        title: 'Notifications',
        rows: [
          { key: 'communityReports', label: 'Community Report References', icon: <MaterialCommunityIcons name="message-outline" size={18} color="#111" /> },
          { key: 'routeAlerts', label: 'Route Disruption Alerts', icon: <Ionicons name="warning-outline" size={18} color="#111" /> },
        ] as SettingsRow[],
      },
      {
        title: 'Preferences',
        rows: [
          { key: 'voiceGuidance', label: 'Voice Guidance', icon: <MaterialCommunityIcons name="microphone-outline" size={18} color="#111" /> },
          { key: 'largeText', label: 'Large Text Mode', icon: <FontAwesome5 name="text-height" size={16} color="#111" /> },
        ] as SettingsRow[],
      },
    ],
    [],
  );

  const toggle = (key: string) => {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.screen}>
      <TopBar />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.email}>{user?.email ?? 'Signed in'}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={() => void signOut()}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.rows.map((row, index) => (
              <View key={row.key} style={[styles.row, index !== section.rows.length - 1 && styles.rowDivider]}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}>{row.icon}</View>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                </View>
                <Switch
                  trackColor={{ false: '#D3D4DA', true: '#B083FF' }}
                  thumbColor={values[row.key] ? '#7B3FF3' : '#FFFFFF'}
                  ios_backgroundColor="#D3D4DA"
                  value={Boolean(values[row.key])}
                  onValueChange={() => toggle(row.key)}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111111',
  },
  email: {
    marginTop: 2,
    color: '#52525B',
    fontSize: 13,
  },
  logoutButton: {
    backgroundColor: '#E64D4D',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 28,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#ECE7F5',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DAD1EE',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E1E22',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  row: {
    minHeight: 54,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3EFFA',
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#D7D2E6',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 17,
    color: '#1A1A1A',
    fontWeight: '500',
  },
});
