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
  private missingTracks: Set<string> = new Set();
  private pendingTrack: keyof typeof tracks | null = null;
  private interactionListenerAdded = false;

  playBGM(track: keyof typeof tracks) {
    if (this.isMuted) return;
    if (this.currentTrackName === track) return;
    if (this.missingTracks.has(track)) return;

    this.pendingTrack = track;

    if (this.currentBGM) {
      this.currentBGM.pause();
    }

    try {
      const src = tracks[track];
      const audio = new Audio();
      audio.loop = true;

      audio.addEventListener('error', () => {
        // File doesn't exist — never retry this track
        this.missingTracks.add(track);
        if (this.currentBGM === audio) {
          this.currentBGM = null;
          this.currentTrackName = null;
        }
      }, { once: true });

      audio.src = src;
      this.currentBGM = audio;
      this.currentTrackName = track;
      audio.play().catch(() => {
        // Autoplay blocked — keep the track pending so we can
        // resume on first user interaction
        this.ensureInteractionListener();
      });
    } catch (_e) {
      // Audio API unavailable in this environment
      this.missingTracks.add(track);
    }
  }

  stopBGM() {
    this.pendingTrack = null;
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

  /** Listen for first user interaction to resume blocked audio */
  private ensureInteractionListener() {
    if (this.interactionListenerAdded) return;
    this.interactionListenerAdded = true;

    const resume = () => {
      this.interactionListenerAdded = false;
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
      // Retry the pending track
      if (this.pendingTrack && !this.isMuted) {
        if (this.currentBGM && this.currentTrackName === this.pendingTrack) {
          this.currentBGM.play().catch(() => { /* still blocked, give up */ });
        } else {
          const track = this.pendingTrack;
          this.currentTrackName = null; // force replay
          this.playBGM(track);
        }
      }
    };

    document.addEventListener('click', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
  }
}

export const audioSystem = new AudioSystem();
