import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthSession } from '@/hooks/use-auth-session';
import { usePreferences } from '@/hooks/use-preferences';
import { settingsStyles as styles } from '@/styles/settings.styles';
import type { SurfaceType } from '@/types/api';

const surfaceOptions: SurfaceType[] = ['paved', 'brick', 'gravel', 'mixed'];

export default function SettingsScreen() {
  const { user, userId, isLoading: isAuthLoading } = useAuthSession();
  const { preferences, save, isLoading, error } = usePreferences(userId);
  const [maxSlopeInput, setMaxSlopeInput] = useState(String(preferences.max_slope_percent));

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user]);

  const toggleSurface = (surface: SurfaceType) => {
    const exists = preferences.allowed_surfaces.includes(surface);
    const allowed_surfaces = exists
      ? preferences.allowed_surfaces.filter((item) => item !== surface)
      : [...preferences.allowed_surfaces, surface];

    void save({ ...preferences, allowed_surfaces });
  };

  const onSaveSlope = () => {
    const max_slope_percent = Number(maxSlopeInput);
    if (Number.isNaN(max_slope_percent)) {
      return;
    }
    void save({ ...preferences, max_slope_percent });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Accessibility Settings</ThemedText>

      <ThemedView style={styles.row}>
        <ThemedText>Avoid stairs</ThemedText>
        <Switch
          accessibilityLabel="Toggle avoid stairs"
          value={preferences.avoid_stairs}
          onValueChange={(value) => void save({ ...preferences, avoid_stairs: value })}
        />
      </ThemedView>

      <ThemedView style={styles.row}>
        <ThemedText>Avoid closures</ThemedText>
        <Switch
          accessibilityLabel="Toggle avoid closures"
          value={preferences.avoid_closures}
          onValueChange={(value) => void save({ ...preferences, avoid_closures: value })}
        />
      </ThemedView>

      <View style={styles.slopeRow}>
        <ThemedText type="defaultSemiBold">Max slope percent</ThemedText>
        <TextInput
          value={maxSlopeInput}
          keyboardType="numeric"
          onChangeText={setMaxSlopeInput}
          onBlur={onSaveSlope}
          style={styles.input}
          accessibilityLabel="Maximum allowed slope percentage"
        />
      </View>

      <ThemedText type="defaultSemiBold">Allowed surfaces</ThemedText>
      <View style={styles.surfaceWrap}>
        {surfaceOptions.map((surface) => {
          const active = preferences.allowed_surfaces.includes(surface);
          return (
            <Pressable
              key={surface}
              accessibilityRole="button"
              accessibilityLabel={`Toggle ${surface} surface`}
              style={[styles.surfaceChip, active ? styles.surfaceChipActive : undefined]}
              onPress={() => toggleSurface(surface)}>
              <ThemedText style={active ? styles.surfaceChipTextActive : undefined}>{surface}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? <ThemedText>Loading preferences...</ThemedText> : null}
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ScrollView>
  );
}
