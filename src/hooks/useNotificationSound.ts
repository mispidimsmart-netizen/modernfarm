/**
 * useNotificationSound — plays alert chimes for sensor alerts and acknowledgements.
 *
 * S3.3 — Hybrid playback strategy:
 *   1. Try to play a polished synthesised .mp3 chime from /sounds/.
 *      These have proper attack/decay envelopes and harmonic overtones, so
 *      they sound like a real instrument instead of a robotic 8-bit beep.
 *   2. If the mp3 fails to load (offline cold-start, file 404, decode error)
 *      fall back to the original Web Audio API oscillator pattern, so users
 *      always get *some* feedback even when the network is gone.
 *
 * Files live in /public/sounds/ and are served by the SW cache.
 */
import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'danger' | 'warning' | 'info' | 'success';

const SOUND_FILES: Record<SoundType, string> = {
  danger: '/sounds/danger.mp3',
  warning: '/sounds/warning.mp3',
  info: '/sounds/info.mp3',
  success: '/sounds/success.mp3',
};

const SOUND_VOLUME: Record<SoundType, number> = {
  danger: 0.9,
  warning: 0.7,
  info: 0.55,
  success: 0.6,
};

// Pre-defined oscillator fallbacks — used only when the .mp3 chime can't play.
const SOUND_CONFIGS: Record<SoundType, { frequencies: number[]; durations: number[]; volume: number }> = {
  danger:  { frequencies: [880, 0, 880, 0, 880, 0, 1100, 0, 1100], durations: [150, 50, 150, 50, 150, 100, 200, 50, 300], volume: 0.7 },
  warning: { frequencies: [587, 0, 659, 0, 587],                    durations: [200, 100, 200, 100, 300],                  volume: 0.5 },
  info:    { frequencies: [523, 659, 784],                          durations: [150, 150, 250],                            volume: 0.4 },
  success: { frequencies: [523, 659, 784, 1047],                    durations: [100, 100, 100, 300],                       volume: 0.4 },
};

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  // Cache one HTMLAudioElement per sound type so we don't re-fetch the file
  // every time. SW will serve from cache on the second hit anyway.
  const audioElsRef = useRef<Partial<Record<SoundType, HTMLAudioElement>>>({});

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const getAudioElement = useCallback((type: SoundType): HTMLAudioElement => {
    let el = audioElsRef.current[type];
    if (!el) {
      el = new Audio(SOUND_FILES[type]);
      el.preload = 'auto';
      audioElsRef.current[type] = el;
    }
    return el;
  }, []);

  /** Oscillator fallback — bit-crunchy but always available. */
  const playOscillatorFallback = useCallback((type: SoundType, loops?: number) => {
    try {
      const context = initAudioContext();
      const config = SOUND_CONFIGS[type];
      const repeatCount = loops ?? (type === 'danger' ? 3 : 1);
      let currentTime = context.currentTime;
      const singleDuration = config.durations.reduce((a, b) => a + b, 0);
      const gap = type === 'danger' ? 350 : 200;

      for (let r = 0; r < repeatCount; r++) {
        for (let i = 0; i < config.frequencies.length; i++) {
          const freq = config.frequencies[i];
          const dur = config.durations[i];
          if (freq !== 0) {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain); gain.connect(context.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, currentTime);
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(config.volume, currentTime + 0.01);
            gain.gain.linearRampToValueAtTime(config.volume * 0.8, currentTime + dur / 1000 - 0.05);
            gain.gain.linearRampToValueAtTime(0, currentTime + dur / 1000);
            osc.start(currentTime);
            osc.stop(currentTime + dur / 1000);
          }
          currentTime += dur / 1000;
        }
        if (r < repeatCount - 1) currentTime += gap / 1000;
      }
      const total = singleDuration * repeatCount + gap * (repeatCount - 1);
      setTimeout(() => { isPlayingRef.current = false; }, total + 100);
    } catch (err) {
      console.error('Oscillator fallback failed:', err);
      isPlayingRef.current = false;
    }
  }, [initAudioContext]);

  /** Play notification sound. Prefers polished mp3, falls back to oscillator. */
  const playSound = useCallback(async (type: SoundType = 'info', loops?: number) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    const repeatCount = loops ?? (type === 'danger' ? 3 : 1);
    const el = getAudioElement(type);
    el.volume = SOUND_VOLUME[type];

    try {
      // Reset to start each time so quick repeats don't cut off the previous play.
      el.currentTime = 0;
      await el.play();

      let played = 1;
      const onEnded = () => {
        if (played < repeatCount) {
          played++;
          // Small gap between repeats so danger triple-beep is intelligible.
          setTimeout(() => {
            try { el.currentTime = 0; el.play().catch(() => {}); } catch {}
          }, type === 'danger' ? 250 : 150);
        } else {
          el.removeEventListener('ended', onEnded);
          isPlayingRef.current = false;
        }
      };
      el.addEventListener('ended', onEnded);
    } catch (err) {
      // mp3 unavailable / blocked / decode error → use oscillator
      console.warn('mp3 chime failed, using oscillator fallback:', err);
      playOscillatorFallback(type, loops);
    }
  }, [getAudioElement, playOscillatorFallback]);

  const playDangerAlarm = useCallback(() => playSound('danger'), [playSound]);
  const playWarningSound = useCallback(() => playSound('warning'), [playSound]);
  const playInfoSound = useCallback(() => playSound('info'), [playSound]);
  const playSuccessSound = useCallback(() => playSound('success'), [playSound]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return {
    playSound,
    playDangerAlarm,
    playWarningSound,
    playInfoSound,
    playSuccessSound,
    initAudioContext,
  };
};

export default useNotificationSound;
