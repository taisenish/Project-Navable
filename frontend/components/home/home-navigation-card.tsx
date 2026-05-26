import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { homeStyles as styles } from '../../styles/home.styles';

type HomeNavigationCardProps = {
  activeStepIndex: number;
  totalSteps: number;
  instruction: string;
  distanceText: string;
  durationText: string;
  onSpeakPress?: () => void;
};

export function HomeNavigationCard({
  activeStepIndex,
  totalSteps,
  instruction,
  distanceText,
  durationText,
  onSpeakPress,
}: HomeNavigationCardProps) {
  return (
    <View style={styles.navCard}>
      <Text style={styles.navCardTitle}>
        Step {activeStepIndex + 1} of {totalSteps}
      </Text>
      <Text style={styles.navInstruction}>{instruction}</Text>
      <Text style={styles.navMeta}>
        {distanceText} • {durationText}
      </Text>

      {onSpeakPress ? (
        <Pressable
          style={styles.navCardSpeakButton}
          onPress={onSpeakPress}
          accessibilityRole="button"
          accessibilityLabel="Repeat instruction out loud">
          <MaterialIcons name="volume-up" size={18} color="#CDB7FF" />
        </Pressable>
      ) : null}
    </View>
  );
}
