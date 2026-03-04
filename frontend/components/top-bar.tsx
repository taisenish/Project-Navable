import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TopBarProps = {
  subtitle?: string;
};

export function TopBar({ subtitle = 'Accessible Campus Navigation' }: TopBarProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoCircle}>
          <Image source={require('../assets/images/navable_logo.png')} style={styles.logo} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>NavAble</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#7B3FF3',
  },
  container: {
    backgroundColor: '#7B3FF3',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#A57AFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 34,
    height: 34,
  },
  textWrap: {
    marginLeft: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '800',
  },
  subtitle: {
    color: '#EEE7FF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
});
