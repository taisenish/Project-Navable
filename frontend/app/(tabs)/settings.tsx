import { type ReactNode, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Switch, View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import { ThemedText } from '@/components/themed-text';
import { useAuthSession } from '@/hooks/use-auth-session';
import { usePreferences } from '@/hooks/use-preferences';
import { settingsStyles as styles } from '@/styles/settings.styles';
import type { SurfaceType } from '@/types/api';

const surfaceOptions: SurfaceType[] = ['paved', 'brick', 'gravel', 'mixed'];

export default function TabSettingsScreen() {
  const { user, userId, isLoading: isAuthLoading, signOut } = useAuthSession();
  const { preferences, save, isLoading, error } = usePreferences(userId);
  const [preferElevators, setPreferElevators] = useState(true);
  const [shortestDistance, setShortestDistance] = useState(true);
  const [fastestTime, setFastestTime] = useState(false);
  const [communityReports, setCommunityReports] = useState(true);
  const [routeAlerts, setRouteAlerts] = useState(true);
  const [voiceGuidance, setVoiceGuidance] = useState(true);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user]);

  const onLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const onToggleSteepSlope = (value: boolean) => {
    const max_slope_percent = value ? 5 : 12;
    void save({ ...preferences, max_slope_percent });
  };

  const onToggleSurfacePreference = (value: boolean) => {
    const preferredSurfaces: SurfaceType[] = ['paved', 'brick', 'mixed'];
    const nextSurfaces = value ? preferredSurfaces : surfaceOptions;
    void save({ ...preferences, allowed_surfaces: nextSurfaces });
  };

  const avoidsSteepSlopes = preferences.max_slope_percent <= 5;
  const prefersSmoothSurfaces = !preferences.allowed_surfaces.includes('gravel');

  const renderRow = (
    key: string,
    label: string,
    value: boolean,
    onValueChange: (next: boolean) => void,
    icon: ReactNode,
  ) => (
    <View key={key} style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#BFB9CF', true: '#A987F8' }}
        thumbColor={value ? '#7B3FF3' : '#F1EFF8'}
      />
    </View>
  );

  const accessibilityRows = [
    renderRow(
      'avoid-stairs',
      'Avoid Stairs',
      preferences.avoid_stairs,
      (value) => void save({ ...preferences, avoid_stairs: value }),
      <FontAwesome6 name="person-cane" size={16} color="#14131A" />,
    ),
    renderRow(
      'prefer-elevators',
      'Prefer Elevators',
      preferElevators,
      setPreferElevators,
      <MaterialCommunityIcons name="elevator-passenger" size={16} color="#14131A" />,
    ),
    renderRow(
      'steep-slopes',
      'Avoid Steep Slopes',
      avoidsSteepSlopes,
      onToggleSteepSlope,
      <MaterialCommunityIcons name="slope-uphill" size={16} color="#14131A" />,
    ),
    renderRow(
      'surface',
      'Surface Preferences',
      prefersSmoothSurfaces,
      onToggleSurfacePreference,
      <FontAwesome5 name="layer-group" size={14} color="#14131A" />,
    ),
  ];

  const routeRows = [
    renderRow(
      'shortest',
      'Shortest Distance',
      shortestDistance,
      setShortestDistance,
      <Ionicons name="swap-horizontal" size={16} color="#14131A" />,
    ),
    renderRow(
      'fastest',
      'Fastest Time',
      fastestTime,
      setFastestTime,
      <Ionicons name="play-skip-forward" size={16} color="#14131A" />,
    ),
  ];

  const notificationRows = [
    renderRow(
      'community',
      'Community Report References',
      communityReports,
      setCommunityReports,
      <Feather name="message-square" size={16} color="#14131A" />,
    ),
    renderRow(
      'alerts',
      'Route Distribution Alerts',
      routeAlerts,
      setRouteAlerts,
      <Feather name="alert-triangle" size={16} color="#14131A" />,
    ),
  ];

  const preferenceRows = [
    renderRow(
      'voice',
      'Voice Guidance',
      voiceGuidance,
      setVoiceGuidance,
      <Ionicons name="mic-outline" size={16} color="#14131A" />,
    ),
    renderRow(
      'large-text',
      'Large Text Mode',
      largeText,
      setLargeText,
      <FontAwesome6 name="text-height" size={15} color="#14131A" />,
    ),
  ];

  const renderCard = (title: string, rows: ReactNode[]) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardTitle}>{title}</ThemedText>
        </View>
        <View style={styles.cardRows}>{rows}</View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBubble}>
            <Image source={require('@/assets/images/navable_logo.png')} style={styles.logo} />
          </View>
          <View style={styles.titleStack}>
            <ThemedText style={styles.brandTitle}>NavAble</ThemedText>
            <ThemedText style={styles.brandSubtitle}>Accessible Campus Navigation</ThemedText>
          </View>
        </View>

        <Pressable accessibilityRole="button" style={styles.logoutButton} onPress={() => void onLogout()}>
          <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText style={styles.pageTitle}>Settings</ThemedText>

        {renderCard('Accessibility Preferences', accessibilityRows)}
        {renderCard('Route Preferences', routeRows)}
        {renderCard('Notifications', notificationRows)}
        {renderCard('Preferences', preferenceRows)}

        {isLoading ? <ThemedText>Loading preferences...</ThemedText> : null}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      </ScrollView>
    </View>
  );
}
