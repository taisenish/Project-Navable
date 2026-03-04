import { router, useLocalSearchParams } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { onboardingStyles as styles } from '@/styles/onboarding.styles';

type Card = {
  color: string;
  title: string;
  subtitle: string;
  body: string;
  iconName?: 'accessible-icon' | 'info-circle' | 'cube' | 'account-heart';
  iconFamily?: 'fa5' | 'ant' | 'fa6' | 'mc';
  useLogo?: boolean;
};

const cards: Card[] = [
  {
    color: '#7B3FF3',
    title: 'Welcome to NavAble',
    subtitle: 'Your accessible campus companion',
    body: 'Navigate campus with confidence. Find accessible routes, ramps, elevators, and real-time updates tailored to your needs.',
    useLogo: true,
  },
  {
    color: '#23B300',
    title: 'Find Accessible Routes',
    subtitle: 'Navigate with ease',
    body: "Find accessible routes, ramps, elevators. We'll show you the best path to get you where you need to go.",
    iconName: 'accessible-icon',
    iconFamily: 'fa5',
  },
  {
    color: '#3C79DF',
    title: 'Real time information',
    subtitle: 'Stay informed',
    body: 'Get updates about construction zones, temporary closures and accessibility changes. We keep you in the loop so you can plan ahead.',
    iconName: 'info-circle',
    iconFamily: 'ant',
  },
  {
    color: '#B041D7',
    title: '3D Campus Exploration',
    subtitle: 'See your route',
    body: 'Visualize buildings and features in 3D. Rotate, zoom and explore the campus before you even step outside.',
    iconName: 'cube',
    iconFamily: 'fa6',
  },
  {
    color: '#3AA5A1',
    title: 'Personalized Experience',
    subtitle: 'Your accessibility, your way',
    body: 'Customize settings for vision, mobility, or other accessibility needs. NavAble adapts for you!',
    iconName: 'account-heart',
    iconFamily: 'mc',
  },
];

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ step?: string }>();
  const parsed = Number(params.step ?? '0');
  const step = Number.isFinite(parsed) ? Math.max(0, Math.min(cards.length - 1, Math.floor(parsed))) : 0;
  const card = cards[step];

  const animValue = useRef(new Animated.Value(0)).current;
  const activeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    activeAnimationRef.current?.stop();
    animValue.setValue(0);

    let animation: Animated.CompositeAnimation;

    if (step === 1) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: -1, duration: 440, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 220, useNativeDriver: true }),
        ])
      );
    } else if (step === 2) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 550, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 550, useNativeDriver: true }),
        ])
      );
    } else if (step === 3) {
      animation = Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1300,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
    } else if (step === 4) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 0.35, duration: 160, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0.08, duration: 120, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0.4, duration: 180, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(340),
        ])
      );
    } else {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
    }

    activeAnimationRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
    };
  }, [animValue, step]);

  const animatedStyle = useMemo(() => {
    if (step === 1) {
      return {
        transform: [
          {
            rotate: animValue.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: ['-12deg', '0deg', '12deg'],
            }),
          },
        ],
      };
    }
    if (step === 2) {
      return {
        transform: [
          {
            scale: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.16],
            }),
          },
        ],
        opacity: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.75, 1],
        }),
      };
    }
    if (step === 3) {
      return {
        transform: [
          {
            rotate: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }),
          },
        ],
      };
    }
    if (step === 4) {
      return {
        transform: [
          {
            scale: animValue.interpolate({
              inputRange: [0, 0.4],
              outputRange: [1, 1.22],
            }),
          },
        ],
      };
    }

    return {
      transform: [
        {
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -7],
          }),
        },
      ],
    };
  }, [animValue, step]);

  const iconNode = useMemo(() => {
    if (card.useLogo) {
      return <Image source={require('@/assets/images/navable_logo.png')} style={styles.logoImage} />;
    }

    if (card.iconFamily === 'fa5' && card.iconName === 'accessible-icon') {
      return <FontAwesome5 name="accessible-icon" size={34} color="black" />;
    }
    if (card.iconFamily === 'ant' && card.iconName === 'info-circle') {
      return <AntDesign name="info-circle" size={34} color="black" />;
    }
    if (card.iconFamily === 'fa6' && card.iconName === 'cube') {
      return <FontAwesome6 name="cube" size={34} color="black" />;
    }
    if (card.iconFamily === 'mc' && card.iconName === 'account-heart') {
      return <MaterialCommunityIcons name="account-heart" size={34} color="black" />;
    }
    return null;
  }, [card.iconFamily, card.iconName, card.useLogo]);

  const onContinue = () => {
    if (step < cards.length - 1) {
      router.replace(`/onboarding?step=${step + 1}`);
      return;
    }
    router.replace('/');
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: card.color }]}>
      <View style={styles.topSpacer} />

      <View style={styles.centerBlock}>
        <Animated.View style={animatedStyle}>
          <View style={styles.iconCircle}>{iconNode}</View>
        </Animated.View>

        <ThemedText style={styles.title}>{card.title}</ThemedText>
        <ThemedText style={styles.subtitle}>{card.subtitle}</ThemedText>
        <ThemedText style={styles.body}>{card.body}</ThemedText>
      </View>

      <View style={styles.bottomBlock}>
        <Pressable accessibilityRole="button" accessibilityLabel="Continue onboarding" style={styles.primaryButton} onPress={onContinue}>
          <ThemedText style={styles.buttonText}>Continue  &gt;</ThemedText>
        </Pressable>
        <ThemedText style={styles.pageIndicator}>{`${step + 1} of 5`}</ThemedText>
      </View>
    </ThemedView>
  );
}
