import { createAudioPlayer } from 'expo-audio';

import { config } from './config';

class TtsService {
  private player: any = null;

  async speak(text: string) {
    try {
      await this.stop();

      const ttsUrl = `${config.apiBaseUrl}/tts?text=${encodeURIComponent(text)}`;
      this.player = createAudioPlayer(ttsUrl);
      this.player.play();
    } catch (error) {
      console.error('TTS execution failed:', error);
    }
  }

  async stop() {
    if (this.player) {
      try {
        this.player.pause();
        this.player.release();
      } catch (e) {
        // Ignore already stopped or released states
      }
      this.player = null;
    }
  }
}

export const ttsService = new TtsService();
