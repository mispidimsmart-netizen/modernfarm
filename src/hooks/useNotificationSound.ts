import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'danger' | 'warning' | 'info' | 'success';

// Pre-defined notification sounds using Web Audio API
// Farm-themed frequencies and patterns
const SOUND_CONFIGS: Record<SoundType, { frequencies: number[]; durations: number[]; volume: number }> = {
  danger: {
    // Urgent alarm - rapid high-pitched beeps (like a rooster alert)
    frequencies: [880, 0, 880, 0, 880, 0, 1100, 0, 1100],
    durations: [150, 50, 150, 50, 150, 100, 200, 50, 300],
    volume: 0.7,
  },
  warning: {
    // Moderate alert - medium-pitched tones (like a cowbell)
    frequencies: [587, 0, 659, 0, 587],
    durations: [200, 100, 200, 100, 300],
    volume: 0.5,
  },
  info: {
    // Gentle notification - soft chime
    frequencies: [523, 659, 784],
    durations: [150, 150, 250],
    volume: 0.4,
  },
  success: {
    // Positive feedback - ascending pleasant tones
    frequencies: [523, 659, 784, 1047],
    durations: [100, 100, 100, 300],
    volume: 0.4,
  },
};

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize audio context on first interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (required for mobile)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play a tone at specific frequency
  const playTone = useCallback((
    context: AudioContext,
    frequency: number,
    duration: number,
    volume: number,
    startTime: number
  ) => {
    if (frequency === 0) return; // Silent gap

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Farm-themed waveforms
    oscillator.type = 'sine'; // Soft, natural sound
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Smooth envelope to prevent clicks
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume * 0.8, startTime + duration / 1000 - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration / 1000);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration / 1000);
  }, []);

  // Play notification sound based on type. Critical (danger) repeats 3x for emphasis.
  const playSound = useCallback(async (type: SoundType = 'info', loops?: number) => {
    // Prevent overlapping sounds
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    try {
      const context = initAudioContext();
      const config = SOUND_CONFIGS[type];
      const repeatCount = loops ?? (type === 'danger' ? 3 : 1);

      let currentTime = context.currentTime;
      const singleDuration = config.durations.reduce((a, b) => a + b, 0);
      const gapBetweenLoops = type === 'danger' ? 350 : 200;

      for (let r = 0; r < repeatCount; r++) {
        for (let i = 0; i < config.frequencies.length; i++) {
          playTone(
            context,
            config.frequencies[i],
            config.durations[i],
            config.volume,
            currentTime
          );
          currentTime += config.durations[i] / 1000;
        }
        if (r < repeatCount - 1) currentTime += gapBetweenLoops / 1000;
      }

      // Reset playing flag after the whole pattern completes
      const totalDuration = singleDuration * repeatCount + gapBetweenLoops * (repeatCount - 1);
      setTimeout(() => {
        isPlayingRef.current = false;
      }, totalDuration + 100);

    } catch (error) {
      console.error('Error playing notification sound:', error);
      isPlayingRef.current = false;
    }
  }, [initAudioContext, playTone]);

  // Play danger/emergency alarm
  const playDangerAlarm = useCallback(() => playSound('danger'), [playSound]);
  
  // Play warning sound
  const playWarningSound = useCallback(() => playSound('warning'), [playSound]);
  
  // Play info notification
  const playInfoSound = useCallback(() => playSound('info'), [playSound]);
  
  // Play success sound
  const playSuccessSound = useCallback(() => playSound('success'), [playSound]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playSound,
    playDangerAlarm,
    playWarningSound,
    playInfoSound,
    playSuccessSound,
    initAudioContext, // Call this on user interaction to unlock audio
  };
};

export default useNotificationSound;
