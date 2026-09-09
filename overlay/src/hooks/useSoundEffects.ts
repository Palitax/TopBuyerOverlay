import { useCallback, useRef } from 'react';

export function useSoundEffects() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  /**
   * Sparkling Mana Surge Ping (Harmonic Crystal Chimes)
   */
  const playManaSound = useCallback(
    (volume: number = 0.5) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Arcane triad)

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);

          gain.gain.setValueAtTime(0, now + i * 0.05);
          gain.gain.linearRampToValueAtTime(volume * 0.25, now + i * 0.05 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.45);
        });
      } catch (err) {
        console.warn('Audio playback not allowed or failed:', err);
      }
    },
    [getAudioContext]
  );

  /**
   * Majestic Level-Up / Rank Promotion Fanfare
   */
  const playRankUpSound = useCallback(
    (tier: number = 3, volume: number = 0.6) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const pitchMultiplier = tier >= 5 ? 1.25 : tier === 4 ? 1.1 : 1.0;
        // Higher tiers get richer, higher chords
        const chords = [
          [440 * pitchMultiplier, 554.37 * pitchMultiplier, 659.25 * pitchMultiplier],          // A major
          [554.37 * pitchMultiplier, 659.25 * pitchMultiplier, 830.61 * pitchMultiplier],       // C#m
          [659.25 * pitchMultiplier, 830.61 * pitchMultiplier, 987.77 * pitchMultiplier],       // E major
          [880 * pitchMultiplier, 1108.73 * pitchMultiplier, 1318.51 * pitchMultiplier, 1760 * pitchMultiplier]   // A high triumphant chord
        ];

        chords.forEach((chord, stepIdx) => {
          const stepTime = now + stepIdx * 0.12;
          chord.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = stepIdx === 3 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, stepTime);

            gain.gain.setValueAtTime(0, stepTime);
            gain.gain.linearRampToValueAtTime(volume * 0.2, stepTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, stepTime + (stepIdx === 3 ? 1.2 : 0.3));

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(stepTime);
            osc.stop(stepTime + (stepIdx === 3 ? 1.3 : 0.35));
          });
        });
      } catch (err) {
        console.warn('Audio playback error:', err);
      }
    },
    [getAudioContext]
  );

  return {
    playManaSound,
    playRankUpSound
  };
}
