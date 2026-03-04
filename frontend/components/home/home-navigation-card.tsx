import { Text, View } from 'react-native';

import { homeStyles as styles } from '../../styles/home.styles';

type HomeNavigationCardProps = {
  activeStepIndex: number;
  totalSteps: number;
  instruction: string;
  distanceText: string;
  durationText: string;
};

export function HomeNavigationCard({
  activeStepIndex,
  totalSteps,
  instruction,
  distanceText,
  durationText,
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
    </View>
  );
}
