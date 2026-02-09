/**
 * Audio System - Phase 7.4
 * Handles background music and sound effects.
 */

const tracks = {
  title: '/audio/title.mp3',
  strategy: '/audio/strategy.mp3',
  battle: '/audio/battle.mp3',
  duel: '/audio/duel.mp3',
};

class AudioSystem {
  private currentBGM: HTMLAudioElement | null = null;
  private isMuted: boolean = false;

  playBGM(track: keyof typeof tracks) {
    if (this.isMuted) return;
    
    const src = tracks[track];
    if (this.currentBGM && this.currentBGM.src.endsWith(src)) return;

    if (this.currentBGM) {
      this.currentBGM.pause();
    }

    try {
      this.currentBGM = new Audio(src);
      this.currentBGM.loop = true;
      this.currentBGM.play().catch(e => console.warn('Audio playback failed:', e));
    } catch (e) {
      console.warn('Audio system unavailable:', e);
    }
  }

  stopBGM() {
    if (this.currentBGM) {
      this.currentBGM.pause();
      this.currentBGM = null;
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (mute) this.stopBGM();
  }
}

export const audioSystem = new AudioSystem();
