import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function TabView3DScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ThemedText type="title">3D View</ThemedText>
        <ThemedText>3D campus visualization is coming next.</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1F2230',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
