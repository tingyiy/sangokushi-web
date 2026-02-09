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
  private currentTrackName: string | null = null;
  private isMuted: boolean = false;

  playBGM(track: keyof typeof tracks) {
    if (this.isMuted) return;
    
    if (this.currentTrackName === track) return;

    if (this.currentBGM) {
      this.currentBGM.pause();
    }

    try {
      const src = tracks[track];
      this.currentBGM = new Audio(src);
      this.currentBGM.loop = true;
      this.currentTrackName = track;
      this.currentBGM.play().catch(e => console.warn('Audio playback failed:', e));
    } catch (e) {
      console.warn('Audio system unavailable:', e);
    }
  }

  stopBGM() {
    if (this.currentBGM) {
      this.currentBGM.pause();
      this.currentBGM = null;
      this.currentTrackName = null;
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (mute) this.stopBGM();
  }
}

export const audioSystem = new AudioSystem();
