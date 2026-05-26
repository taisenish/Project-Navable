import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';

import { homeStyles as styles } from '../../styles/home.styles';
import type { DirectionsStep } from '../../types/api';

const COLLAPSED_HEIGHT = 130;
const EXPANDED_MAX_HEIGHT = 600;

type HomeNavigationCardProps = {
  activeStepIndex: number;
  totalSteps: number;
  instruction: string;
  distanceText: string;
  durationText: string;
  steps: DirectionsStep[];
  expanded: boolean;
  onToggleExpanded: () => void;
};

function stepIcon(instruction: string): React.ReactNode {
  const lower = instruction.toLowerCase();
  if (lower.includes('board bus') || lower.includes('take bus')) {
    return <MaterialIcons name="directions-bus" size={20} color="#F4C430" />;
  }
  if (lower.includes('stop') && lower.includes('en route')) {
    return <MaterialIcons name="more-horiz" size={18} color="#CDB7FF" />;
  }
  if (lower.includes('exit at')) {
    return <MaterialIcons name="directions-bus" size={18} color="#F4C430" />;
  }
  if (lower.includes('left')) {
    return <Feather name="corner-up-left" size={18} color="#CDB7FF" />;
  }
  if (lower.includes('right')) {
    return <Feather name="corner-up-right" size={18} color="#CDB7FF" />;
  }
  return <MaterialIcons name="straight" size={18} color="#CDB7FF" />;
}

export function HomeNavigationCard({
  activeStepIndex,
  totalSteps,
  instruction,
  distanceText,
  durationText,
  steps,
  expanded,
  onToggleExpanded,
}: HomeNavigationCardProps) {
  const maxHeightAnim = useRef(new Animated.Value(expanded ? EXPANDED_MAX_HEIGHT : COLLAPSED_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(maxHeightAnim, {
      toValue: expanded ? EXPANDED_MAX_HEIGHT : COLLAPSED_HEIGHT,
      useNativeDriver: false,
      tension: 80,
      friction: 14,
    }).start();
  }, [expanded, maxHeightAnim]);

  return (
    <Animated.View style={[styles.navCard, { maxHeight: maxHeightAnim, overflow: 'hidden' }]}>
      <Pressable onPress={onToggleExpanded} style={styles.navCardDragArea} accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse steps' : 'Show all steps'}>
        <View style={styles.navCardHandle} />
        <View style={styles.navCardHeader}>
          <Text style={styles.navCardTitle}>
            Step {activeStepIndex + 1} of {totalSteps}
          </Text>
          <Text style={styles.navInstruction}>{instruction}</Text>
          <Text style={styles.navMeta}>
            {distanceText} • {durationText}
          </Text>
        </View>
      </Pressable>

      <ScrollView style={styles.navStepsScroll} contentContainerStyle={styles.navStepsContent} nestedScrollEnabled>
        {steps.map((step, index) => {
          const isActive = index === activeStepIndex;
          const subText = step.distance_text || step.duration_text || '';
          return (
            <View key={index} style={[styles.navStepRow, isActive && styles.navStepRowActive]}>
              <View style={styles.navStepIcon}>{stepIcon(step.instruction)}</View>
              <View style={styles.navStepInfo}>
                <Text style={[styles.navStepInstruction, isActive && styles.navStepInstructionActive]} numberOfLines={3}>
                  {step.instruction}
                </Text>
                {subText ? <Text style={styles.navStepDistance}>{subText}</Text> : null}
              </View>
              <Text style={styles.navStepIndex}>{index + 1}</Text>
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}
