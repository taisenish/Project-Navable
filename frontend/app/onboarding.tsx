import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Slide = {
  key: string;
  title: string;
  subtitle: string;
  body: string;
  progress: string;
  backgroundColor: string;
  renderIcon: () => React.ReactNode;
};

const slides: Slide[] = [
  {
    key: 'welcome',
    title: 'Welcome to NavAble',
    subtitle: 'Your accessible campus companion',
    body:
      'Navigate University of Washington, Seattle campus with confidence. Find accessible routes, ramps, elevators, and real-time updates tailored to your needs.',
    progress: '1 of 5',
    backgroundColor: '#8A45F6',
    renderIcon: () => <Image source={require('../assets/images/navable_logo.png')} style={styles.logoIcon} />,
  },
  {
    key: 'routes',
    title: 'Find Accessible Routes',
    subtitle: 'Navigate with ease',
    body: 'Find accessible routes, ramps, elevators. We\'ll show you the best path to get you where you need to go.',
    progress: '2 of 5',
    backgroundColor: '#22B300',
    renderIcon: () => <FontAwesome5 name="accessible-icon" size={34} color="#0D0D0D" />,
  },
  {
    key: 'alerts',
    title: 'Real time information',
    subtitle: 'Stay informed',
    body:
      'Get updates about construction zones, temporary closures and accessibility changes. We keep you in the loop so you can plan ahead.',
    progress: '3 of 5',
    backgroundColor: '#3D7ADF',
    renderIcon: () => <AntDesign name="info-circle" size={34} color="#0D0D0D" />,
  },
  {
    key: 'explore',
    title: '3D Campus Exploration',
    subtitle: 'See your route',
    body: 'Visualize buildings and features in 3D. Rotate, zoom and explore the campus before you even step outside.',
    progress: '4 of 5',
    backgroundColor: '#B345D9',
    renderIcon: () => <FontAwesome6 name="cube" size={32} color="#0D0D0D" />,
  },
  {
    key: 'personalized',
    title: 'Personalized Experience',
    subtitle: 'Your accessibility, your way',
    body: 'Customize settings for vision, mobility, or other accessibility needs. NavAble adapts for you!',
    progress: '5 of 5',
    backgroundColor: '#37A4A3',
    renderIcon: () => <MaterialCommunityIcons name="account-heart" size={34} color="#0D0D0D" />,
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const current = useMemo(() => slides[index], [index]);

  const advance = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 8,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (index >= slides.length - 1) {
        router.replace('/(tabs)');
        return;
      }

      setIndex((prev) => prev + 1);
      translateY.setValue(-8);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: current.backgroundColor } as ViewStyle]}>
      <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}> 
        <View style={styles.iconRing}>
          <View style={styles.iconInner}>{current.renderIcon()}</View>
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>
        <Text style={styles.body}>{current.body}</Text>

        <View style={styles.bottomArea}>
          <Pressable style={styles.button} onPress={advance}>
            <Text style={styles.buttonText}>{index === slides.length - 1 ? 'Get Started  >' : 'Continue  >'}</Text>
          </Pressable>
          <Text style={styles.progress}>{current.progress}</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 28,
    paddingTop: 44,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 42,
    height: 42,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 14,
  },
  body: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 28,
    textAlign: 'center',
    opacity: 0.95,
    maxWidth: 700,
  },
  bottomArea: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 16,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 22,
    color: '#101010',
    fontWeight: '500',
  },
  progress: {
    marginTop: 10,
    color: '#F2F2F2',
    fontSize: 18,
    fontWeight: '400',
  },
});
