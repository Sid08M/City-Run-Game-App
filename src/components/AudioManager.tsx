import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Decoupled global event triggers to emit sounds from anywhere
export const gameAudio = {
  playJump: () => {
    window.dispatchEvent(new CustomEvent('game-audio-trigger', { detail: 'jump' }));
  },
  playCrash: () => {
    // Ensure any existing crash sound is stopped before playing a new one
    window.dispatchEvent(new CustomEvent('game-audio-stop', { detail: 'crash' }));
    window.dispatchEvent(new CustomEvent('game-audio-trigger', { detail: 'crash' }));
  },
  playCoin: () => {
    // Coin sound can be synthesized; no stop needed as it's short
    window.dispatchEvent(new CustomEvent('game-audio-trigger', { detail: 'coin' }));
  },
  playShieldBreak: () => {
    window.dispatchEvent(new CustomEvent('game-audio-trigger', { detail: 'shieldbreak' }));
  },
};

// Shared AudioContext – browsers limit active contexts to ~6.
// Reusing one prevents silent muting after repeated sound calls.
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') return sharedAudioCtx;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedAudioCtx = new AudioContextClass();
  return sharedAudioCtx;
};

// Web Audio API Synth fallback so sounds function perfectly even without assets
const playSyntheticSound = (type: 'jump' | 'crash' | 'coin' | 'shieldbreak') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Resume if suspended (browsers suspend contexts until user gesture)
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'jump') {
      // Snappy upward frequency sweep for jump
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'crash') {
      // Low descending noise/buzz rumble for crash
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.4);
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'coin') {
      // Short bright ding for coin collection (800Hz to 1200Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.07);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'shieldbreak') {
      // Metallic high ping that descends — shield absorbing an impact
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (error) {
    console.error('Failed to trigger synth fallback:', error);
  }
};

export const AudioManager: React.FC = () => {
  const { camera } = useThree();
  const listenerRef = useRef(new THREE.AudioListener());
  
  const jumpSound = useRef<THREE.PositionalAudio | null>(null);
  const crashSound = useRef<THREE.PositionalAudio | null>(null);

  useEffect(() => {
    const listener = listenerRef.current;
    camera.add(listener);

    // Instantiate ThreeJS PositionalAudio objects
    jumpSound.current = new THREE.PositionalAudio(listener);
    crashSound.current = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();

    // Load Jump MP3 buffer
    audioLoader.load(
      '/audio/jump.mp3',
      (buffer) => {
        if (jumpSound.current) {
          jumpSound.current.setBuffer(buffer);
          jumpSound.current.setRefDistance(12);
          jumpSound.current.setVolume(0.75);
        }
      },
      undefined,
      () => {
        console.warn('AudioManager: /audio/jump.mp3 placeholder missing. Using browser synth.');
      }
    );

    // Load Crash MP3 buffer
    audioLoader.load(
      '/audio/crash.mp3',
      (buffer) => {
        if (crashSound.current) {
          crashSound.current.setBuffer(buffer);
          crashSound.current.setRefDistance(12);
          crashSound.current.setVolume(1.0);
        }
      },
      undefined,
      () => {
        console.warn('AudioManager: /audio/crash.mp3 placeholder missing. Using browser synth.');
      }
    );

    const handleAudioTrigger = (e: Event) => {
      const type = (e as CustomEvent).detail as 'jump' | 'crash' | 'coin' | 'shieldbreak';
      if (type === 'jump') {
        const sound = jumpSound.current;
        if (sound && sound.buffer) {
          if (sound.isPlaying) sound.stop();
          sound.play();
        } else {
          playSyntheticSound('jump');
        }
      } else if (type === 'crash') {
        const sound = crashSound.current;
        if (sound && sound.buffer) {
          if (sound.isPlaying) sound.stop();
          sound.play();
        } else {
          playSyntheticSound('crash');
        }
      } else if (type === 'coin') {
        playSyntheticSound('coin');
      } else if (type === 'shieldbreak') {
        playSyntheticSound('shieldbreak');
      }
    };

    const handleAudioStop = (e: Event) => {
      const type = (e as CustomEvent).detail as 'crash';
      if (type === 'crash') {
        const sound = crashSound.current;
        if (sound && sound.isPlaying) {
          sound.stop();
        }
      }
    };

    window.addEventListener('game-audio-trigger', handleAudioTrigger);
    window.addEventListener('game-audio-stop', handleAudioStop);

    return () => {
      camera.remove(listener);
      window.removeEventListener('game-audio-trigger', handleAudioTrigger);
      window.removeEventListener('game-audio-stop', handleAudioStop);
    };
  }, [camera]);

  return null;
};
