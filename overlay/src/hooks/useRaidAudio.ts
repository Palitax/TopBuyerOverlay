import { useCallback, useRef, useEffect } from 'react';
import { Howl } from 'howler';

export function useRaidAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const howlsRef = useRef<{ [key: string]: Howl }>({});

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

  // Initialize Howler instances with error fallback to Web Audio synthesis
  useEffect(() => {
    const sounds = [
      { key: 'slash', src: '/sounds/slash.mp3' },
      { key: 'crit', src: '/sounds/crit_impact.mp3' },
      { key: 'boss_defeat', src: '/sounds/boss_defeat.mp3' },
      { key: 'chest_open', src: '/sounds/chest_open.mp3' },
      { key: 'enrage', src: '/sounds/enrage.mp3' }
    ];

    sounds.forEach(({ key, src }) => {
      try {
        howlsRef.current[key] = new Howl({
          src: [src],
          html5: false,
          preload: true,
          onloaderror: () => {
            // Silence load error since we have a synthesis fallback
          }
        });
      } catch (e) {}
    });

    return () => {
      Object.values(howlsRef.current).forEach((howl) => howl.unload());
    };
  }, []);

  /**
   * High-Fidelity Synthesizer Fallback for Standard Slash Hit
   */
  const playSynthSlash = useCallback(
    (volume: number = 0.7) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // White noise blade whoosh
        const bufferSize = ctx.sampleRate * 0.12;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(600, now + 0.12);
        filter.Q.setValueAtTime(3.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);

        // Metallic sword clash transient
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
        oscGain.gain.setValueAtTime(volume * 0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch (err) {}
    },
    [getAudioContext]
  );

  /**
   * High-Fidelity Synthesizer Fallback for Critical / Epic / Legendary Hit
   */
  const playSynthCrit = useCallback(
    (volume: number = 0.85) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Deep fiery sub-bass impact drop
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(240, now);
        sub.frequency.exponentialRampToValueAtTime(40, now + 0.35);

        subGain.gain.setValueAtTime(volume * 0.9, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 0.4);

        // Glass / Armor Shatter Crunch
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const crunchGain = ctx.createGain();

        osc1.type = 'square';
        osc1.frequency.setValueAtTime(1400, now);
        osc1.frequency.exponentialRampToValueAtTime(180, now + 0.2);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1750, now);
        osc2.frequency.exponentialRampToValueAtTime(260, now + 0.2);

        crunchGain.gain.setValueAtTime(volume * 0.6, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc1.connect(crunchGain);
        osc2.connect(crunchGain);
        crunchGain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      } catch (err) {}
    },
    [getAudioContext]
  );

  /**
   * High-Fidelity Synthesizer Fallback for Boss Defeat (Apocalyptic dissolve)
   */
  const playSynthDefeat = useCallback(
    (volume: number = 1.0) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Roaring seismic shockwave
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 1.8);

        gain.gain.setValueAtTime(volume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.1);

        // Ascending celestial victory chords
        const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          const start = now + 0.3 + idx * 0.12;

          noteOsc.type = 'triangle';
          noteOsc.frequency.setValueAtTime(freq, start);

          noteGain.gain.setValueAtTime(0, start);
          noteGain.gain.linearRampToValueAtTime(volume * 0.35, start + 0.04);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);

          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);

          noteOsc.start(start);
          noteOsc.stop(start + 1.5);
        });
      } catch (err) {}
    },
    [getAudioContext]
  );

  /**
   * High-Fidelity Synthesizer Fallback for Chest Open / KGA Reward
   */
  const playSynthChest = useCallback(
    (volume: number = 0.9) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Magical Harp / Chime Arpeggio
        const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
        arpeggio.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + i * 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0, noteTime);
          gain.gain.linearRampToValueAtTime(volume * 0.3, noteTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.8);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + 0.9);
        });
      } catch (err) {}
    },
    [getAudioContext]
  );

  /**
   * Main Play Functions with Howler -> Synth Fallback
   */
  const playSlash = useCallback(
    (volume: number = 0.7) => {
      const howl = howlsRef.current['slash'];
      if (howl && howl.state() === 'loaded') {
        howl.volume(volume);
        howl.play();
      } else {
        playSynthSlash(volume);
      }
    },
    [playSynthSlash]
  );

  const playCrit = useCallback(
    (volume: number = 0.85) => {
      const howl = howlsRef.current['crit'];
      if (howl && howl.state() === 'loaded') {
        howl.volume(volume);
        howl.play();
      } else {
        playSynthCrit(volume);
      }
    },
    [playSynthCrit]
  );

  const playDefeat = useCallback(
    (volume: number = 1.0) => {
      const howl = howlsRef.current['boss_defeat'];
      if (howl && howl.state() === 'loaded') {
        howl.volume(volume);
        howl.play();
      } else {
        playSynthDefeat(volume);
      }
    },
    [playSynthDefeat]
  );

  const playChest = useCallback(
    (volume: number = 0.9) => {
      const howl = howlsRef.current['chest_open'];
      if (howl && howl.state() === 'loaded') {
        howl.volume(volume);
        howl.play();
      } else {
        playSynthChest(volume);
      }
    },
    [playSynthChest]
  );

  return {
    playSlash,
    playCrit,
    playDefeat,
    playChest
  };
}
