import { Audio } from 'expo-av';

import { config } from './config';

class TtsService {
  private sound: Audio.Sound | null = null;
  private currentPlayId: number = 0;

  async speak(text: string) {
    try {
      await this.stop();
      const playId = ++this.currentPlayId;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      if (playId !== this.currentPlayId) {
        return;
      }

      const ttsUrl = `${config.apiBaseUrl}/tts?text=${encodeURIComponent(text)}`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: ttsUrl },
        { shouldPlay: true }
      );

      if (playId !== this.currentPlayId) {
        void sound.unloadAsync().catch(() => {});
        return;
      }

      this.sound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          void sound.unloadAsync().catch(() => {});
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
    this.currentPlayId++;
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
