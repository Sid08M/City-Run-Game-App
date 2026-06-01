import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../state/useGameStore';
import { Player } from './Player';
import { Track } from './Track';
import { AudioManager } from './AudioManager';
import { SceneEnvironment } from './SceneEnvironment';

// Ticker component drives the store tick
const GameLoopTicker: React.FC = () => {
  const tick = useGameStore(state => state.tick);
  useFrame((_, delta) => {
    tick(Math.min(delta, 0.1));
  });
  return null;
};

// Camera manager follows lane switches and adds subtle shake
const CameraManager: React.FC = () => {
  const playerLane = useGameStore(state => state.playerLane);
  const isJumping = useGameStore(state => state.isJumping);
  const speed = useGameStore(state => state.speed);
  const gameState = useGameStore(state => state.gameState);
  const lookAtTarget = useRef(new THREE.Vector3(0, 1.0, -12));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const camera = state.camera;
    const targetX = playerLane * 3 * 0.45;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 5 * dt);
    const speedRatio = speed / 18.0;
    const targetY = 3.2 + (isJumping ? 0.3 : 0) + (speedRatio - 1) * 0.4;
    const targetZ = 6.2 + (speedRatio - 1) * 0.8;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 4 * dt);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 4 * dt);
    if (gameState === 'PLAYING') {
      const time = state.clock.getElapsedTime();
      const shakeIntensity = Math.max(0, (speed - 25) * 0.003);
      camera.position.x += Math.sin(time * 30) * shakeIntensity;
      camera.position.y += Math.cos(time * 30) * shakeIntensity;
    }
    const targetLookAt = new THREE.Vector3(
      THREE.MathUtils.lerp(lookAtTarget.current.x, playerLane * 3 * 0.6, 6 * dt),
      1.0,
      -12
    );
    lookAtTarget.current.copy(targetLookAt);
    camera.lookAt(lookAtTarget.current);
  });
  return null;
};

export const GameCanvas: React.FC = () => {
  // Rendering the full 3D scene with reactive environment
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 3.2, 6.2], fov: 65, near: 0.1, far: 200 }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#050508'));
        }}
      >
        <SceneEnvironment />
        <Track />
        <Player />
        <CameraManager />
        <GameLoopTicker />
        <AudioManager />
      </Canvas>
    </div>
  );
};
