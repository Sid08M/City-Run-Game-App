import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { Moon } from './Moon';

export const SceneEnvironment: React.FC = () => {
  const timeOfDay = useGameStore(state => state.timeOfDay ?? 'MORNING');

  // Define realistic presets based on timeOfDay, default to MORNING if undefined
  const presets = {

    MORNING: {
      ambient: 0.8,
      directional: { intensity: 1.0, color: '#ffd9b3' },
      fogColor: '#a3d8ff',
      backgroundColor: '#a3d8ff',
      fogNear: 5,
      fogFar: 50,
    },
    AFTERNOON: {
      ambient: 1.0,
      directional: { intensity: 1.2, color: '#ffffff' },
      fogColor: '#c0c0c0',
      backgroundColor: '#c0c0c0',
      fogNear: 5,
      fogFar: 50,
    },
    EVENING: {
      ambient: 0.6,
      directional: { intensity: 0.9, color: '#ffbb66' },
      fogColor: '#ff9966',
      backgroundColor: '#ff9966',
      fogNear: 5,
      fogFar: 50,
    },
    NIGHT: {
      ambient: 0.3,
      directional: { intensity: 0.5, color: '#ccd9ff' },
      fogColor: '#050508',
      backgroundColor: '#050508',
      fogNear: 5,
      fogFar: 50,
    },
  }[timeOfDay];

  return (
    <>
      {/* Set scene background color */}
      <color attach="background" args={[presets.backgroundColor]} />
      {/* Fog */}
      <fog attach="fog" args={[presets.fogColor, presets.fogNear, presets.fogFar]} />
      {/* Ambient Light */}
      <ambientLight intensity={presets.ambient} color={presets.directional.color} />
      {/* Directional Light (Sun or Moon) */}
      <directionalLight
        castShadow
        position={[10, 20, 5]}
        intensity={presets.directional.intensity}
        color={presets.directional.color}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={100}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* Night-specific moon */}
      {timeOfDay === 'NIGHT' && <Moon />}
    </>
  );
};
