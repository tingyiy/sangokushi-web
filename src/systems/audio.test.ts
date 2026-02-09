import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioSystem } from './audio';

describe('AudioSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset private state if needed? audioSystem is singleton.
    // We can't easily reset it without exposing internals.
  });

  it('initializes with no current BGM', () => {
    expect(audioSystem['currentBGM']).toBeNull();
  });

  it('can set mute', () => {
    audioSystem.setMute(true);
    expect(audioSystem['isMuted']).toBe(true);
    audioSystem.setMute(false);
    expect(audioSystem['isMuted']).toBe(false);
  });

  // playBGM is hard to test because it uses new Audio() and .play() 
  // which might not be fully implemented in jsdom.
  it('stopBGM pauses current audio', () => {
    const mockAudio = { pause: vi.fn() } as unknown as HTMLAudioElement;
    audioSystem['currentBGM'] = mockAudio;
    audioSystem.stopBGM();
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(audioSystem['currentBGM']).toBeNull();
  });
});
