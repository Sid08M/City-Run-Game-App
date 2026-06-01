// src/components/Player.tsx
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../state/useGameStore';
import { gameAudio } from './AudioManager';

const LANE_WIDTH = 3;
const LANE_SWITCH_SPEED = 14;
const JUMP_FORCE = 24;
const GRAVITY = 96;
const COLLISION_WIDTH = 1.2;
const COLLISION_DEPTH = 1.0;

export const Player: React.FC = () => {
  const playerRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const playerLane = useGameStore(state => state.playerLane);
  const isJumping = useGameStore(state => state.isJumping);
  const isDucking = useGameStore(state => state.isDucking);
  const setIsJumping = useGameStore(state => state.setIsJumping);
  const gameOver = useGameStore(state => state.gameOver);
  const removeObstacle = useGameStore(state => state.removeObstacle);
  const pedestrianHits = useGameStore(state => state.pedestrianHits);
  const gameState = useGameStore(state => state.gameState);

  // Temporary flag to avoid processing multiple pedestrian hits within the same frame
  const isProcessingHit = useRef(false);
  const isDead = useRef(false);

  // ── Shield (Titanium Plating) ──
  const isInvulnerable = useRef(false);
  const shieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const velocityY = useRef(0);
  const wasJumping = useRef(false);
  const targetTilt = useRef(0);
  const currentTilt = useRef(0);

  // Reset flags on new game start
  useEffect(() => {
    if (gameState === 'PLAYING') {
      isDead.current = false;
      isProcessingHit.current = false;
      isInvulnerable.current = false;
      if (shieldTimerRef.current) {
        clearTimeout(shieldTimerRef.current);
        shieldTimerRef.current = null;
      }
    }
  }, [gameState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!playerRef.current) return;
    // Strict guard: only process when game is actively playing
    if (useGameStore.getState().gameState !== 'PLAYING') return;
    const pos = playerRef.current.position;

    // Lane Lerp
    const targetX = playerLane * LANE_WIDTH;
    const prevX = pos.x;
    pos.x = THREE.MathUtils.lerp(pos.x, targetX, LANE_SWITCH_SPEED * dt);
    const horizDiff = pos.x - prevX;
    targetTilt.current = -horizDiff * 1.5;
    currentTilt.current = THREE.MathUtils.lerp(currentTilt.current, targetTilt.current, 10 * dt);
    if (meshRef.current) {
      meshRef.current.rotation.z = currentTilt.current;
      meshRef.current.rotation.y = currentTilt.current * 0.5;
      meshRef.current.position.y = isJumping ? 0 : Math.sin(state.clock.getElapsedTime() * 8) * 0.08;

      // Visual Squash for Ducking
      const targetScaleY = isDucking ? 0.4 : 1.0;
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScaleY, 15 * dt);
    }

    // Jump physics
    if (isJumping) {
      if (!wasJumping.current) {
        gameAudio.playJump();
        velocityY.current = JUMP_FORCE;
        wasJumping.current = true;
      }
      velocityY.current -= GRAVITY * dt;
      pos.y += velocityY.current * dt;
      if (pos.y <= 0) {
        pos.y = 0;
        setIsJumping(false);
        velocityY.current = 0;
        wasJumping.current = false;
      }
    } else {
      pos.y = 0;
      wasJumping.current = false;
    }

    // Reset temporary hit flag each frame
    isProcessingHit.current = false;

    // ── Read inventory for enhancements ──
    const storeState = useGameStore.getState();
    const { tiles, inventory } = storeState;

    // ── Electromagnet: dynamic token magnet radius (base 1.2 + 0.5 per level, max level 5) ──
    const magnetLevel = Math.min(inventory['enhancement_magnet'] || 0, 5);
    const magnetRadius = 1.2 + (magnetLevel * 0.5);

    // ── TOKEN collection pass (independent magnet radius, ignores Y) ──
    // Runs first, unblocked by isDead/isProcessingHit so tokens are
    // always collectible while the game state is PLAYING.
    for (const tile of tiles) {
      for (const obs of tile.obstacles) {
        if (obs.type !== 'TOKEN') continue;
        const obsX = obs.lane * LANE_WIDTH;
        const obsZ = tile.z + obs.localZ;
        // 2D distance (XZ only – height irrelevant for pickups)
        const dx = pos.x - obsX;
        const dz = 0 - obsZ; // player Z is always 0
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < magnetRadius) {
          // Remove first, then credit, then sound (safe execution order)
          removeObstacle(obs.id);
          useGameStore.getState().addCurrency(1);
          gameAudio.playCoin();
        }
      }
    }

    // ── Obstacle collision pass (Hurdles, Barricades, Pedestrians, Overhead) ──
    const FORGIVENESS_BUFFER = 0.35; // Allow players to scrape past obstacles
    const playerHeight = isDucking ? 0.4 : 1.0;
    for (const tile of tiles) {
      for (const obs of tile.obstacles) {
        if (obs.type === 'TOKEN') continue; // already handled above
        const obsX = obs.lane * LANE_WIDTH;
        const obsZ = tile.z + obs.localZ;
        const thresholdX = (COLLISION_WIDTH + obs.width) / 2 - FORGIVENESS_BUFFER;
        const thresholdZ = (COLLISION_DEPTH + obs.depth) / 2 - FORGIVENESS_BUFFER;
        const collidesX = Math.abs(pos.x - obsX) < thresholdX;
        const collidesZ = Math.abs(0 - obsZ) < thresholdZ;
        let collidesY = false;
        if (obs.type === 'HURDLE') {
          collidesY = pos.y < obs.height;
        } else if (obs.type === 'BARRICADE') {
          collidesY = true;
        } else if (obs.type === 'PEDESTRIAN') {
          collidesY = true;
        } else if (obs.type === 'OVERHEAD') {
          collidesY = (pos.y + playerHeight) > 0.9;
        }
        if (collidesX && collidesY && collidesZ) {
          if (obs.type === 'PEDESTRIAN') {
            if (!isProcessingHit.current && !isDead.current) {
              isProcessingHit.current = true;
              const newHits = pedestrianHits + 1;
              useGameStore.setState({ pedestrianHits: newHits });
              removeObstacle(obs.id);
              gameAudio.playCrash();
              if (newHits >= 2) {
                gameOver();
                isDead.current = true;
              }
            }
          } else if (obs.type === 'HURDLE' || obs.type === 'BARRICADE' || obs.type === 'OVERHEAD') {
            // ── Shield check: if invulnerable, ignore crash ──
            if (isInvulnerable.current) return;
            if (isDead.current) return;

            // ── Titanium Plating: consume shield to survive ──
            const currentShields = useGameStore.getState().inventory['consumable_shield'] || 0;
            if (currentShields > 0) {
              useGameStore.getState().consumeItem('consumable_shield');
              gameAudio.playShieldBreak();
              useGameStore.getState().setIsShieldActive(true);
              isInvulnerable.current = true;
              // 1.5 seconds of invulnerability
              shieldTimerRef.current = setTimeout(() => {
                isInvulnerable.current = false;
                useGameStore.getState().setIsShieldActive(false);
                shieldTimerRef.current = null;
              }, 1500);
              return; // Do NOT set isDead — survive the hit
            }

            isDead.current = true;
            gameAudio.playCrash();
            gameOver();
            return;
          }
        }
      }
    }
  });

  // Shield visual glow indicator
  const isShieldActive = useGameStore(state => state.isShieldActive);

  return (
    <group ref={playerRef} position={[0, 0, 0]}>
      {/* Trail omitted for brevity */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.9, 0.4, 1.2]} />
        <meshStandardMaterial
          color={isShieldActive ? '#00ff88' : '#00f0ff'}
          emissive={isShieldActive ? '#00aa44' : '#005577'}
          roughness={0.1}
          metalness={0.8}
        />
        {/* Additional visual parts omitted */}
      </mesh>
      <pointLight
        position={[0, -0.5, 0]}
        intensity={isShieldActive ? 3.0 : 1.5}
        color={isShieldActive ? '#00ff88' : '#00f0ff'}
        distance={isShieldActive ? 5 : 3}
      />
    </group>
  );
};
