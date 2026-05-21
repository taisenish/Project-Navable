import { Animated, Pressable, Text, View } from 'react-native';

import { homeStyles as styles } from '../../styles/home.styles';

type HomeChipRowProps = {
  rampsCount: number;
  entrancesCount: number;
  alertsCount: number;
  chipBarAnim: Animated.Value;
  showBaseChips: boolean;
  onPressAlerts?: () => void;
};

export function HomeChipRow({
  rampsCount,
  entrancesCount,
  alertsCount,
  chipBarAnim,
  showBaseChips,
  onPressAlerts,
}: HomeChipRowProps) {
  return (
    <Animated.View
      pointerEvents={showBaseChips ? 'auto' : 'none'}
      style={[
        styles.chipRowWrap,
        {
          opacity: chipBarAnim,
          maxHeight: chipBarAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 52],
          }),
          transform: [
            {
              translateY: chipBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-18, 0],
              }),
            },
          ],
          marginBottom: chipBarAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 8],
          }),
        },
      ]}>
      <View style={styles.chipRow}>
        <View style={[styles.chip, styles.greenChip]}>
          <Text style={styles.chipLabel}>Ramps ({rampsCount})</Text>
        </View>
        <View style={[styles.chip, styles.redChip]}>
          <Text style={styles.chipLabel}>Entrances ({entrancesCount})</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.chip,
            styles.blueChip,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onPressAlerts}
          accessibilityRole="button"
          accessibilityLabel={`Alerts count is ${alertsCount}. Tap to view campus alerts drawer.`}>
          <Text style={styles.chipLabel}>Alerts ({alertsCount})</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

