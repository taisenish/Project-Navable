import { Audio } from 'expo-av';

import { config } from './config';

class TtsService {
  private sound: Audio.Sound | null = null;

  async speak(text: string) {
    try {
      await this.stop();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      const ttsUrl = `${config.apiBaseUrl}/tts?text=${encodeURIComponent(text)}`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: ttsUrl },
        { shouldPlay: true }
      );
      this.sound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          void sound.unloadAsync();
          if (this.sound === sound) {
            this.sound = null;
          }
        }
      });
    } catch (error) {
      console.error('TTS execution failed:', error);
    }
  }

  async stop() {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {
        // Suppress already stopped/unloaded errors
      }
      this.sound = null;
    }
  }
}

export const ttsService = new TtsService();
