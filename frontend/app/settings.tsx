import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthSession } from '@/hooks/use-auth-session';
import { usePreferences } from '@/hooks/use-preferences';
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

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 14,
  },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slopeRow: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  surfaceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  surfaceChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  surfaceChipActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  surfaceChipTextActive: {
    color: '#fff',
  },
  error: {
    color: '#c0392b',
  },
});
