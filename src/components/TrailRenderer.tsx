import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../state/useGameStore';

const LANE_WIDTH = 3;
const MAX_PARTICLES = 4000;

// ── Particle ───────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number; z: number;
  age: number; maxAge: number;
  vx: number; vy: number;
  // Non-uniform scale — lets us make tall flames, Z-streaks, fat blobs, etc.
  sx: number; sy: number; sz: number;
  // Rotation around Z (tumbling flames) and around Y (side spin)
  rotZ: number; rotSpeedZ: number;
  startR: number; startG: number; startB: number;
  r: number; g: number; b: number; a: number;
  // 'late' fade: stays bright until 70% life, then snaps out (fire look)
  fadeCurve: 'linear' | 'late';
}

// ── Trail config ───────────────────────────────────────────────────────────
interface TrailConfig {
  colorStart: [number, number, number];
  colorEnd: [number, number, number];
  colorCore?: [number, number, number];   // optional bright core color
  spawnRate: number;
  maxAge: number;
  fadeCurve: 'linear' | 'late';
  // Spawn area
  scatterX: number; scatterY: number;
  // Velocity
  vxRange: number; vyBase: number; vyRange: number;
  // Particle shape  (base ± range for each axis)
  sxBase: number; sxRange: number;
  syBase: number; syRange: number;
  szBase: number; szRange: number;
  // Rotation
  rotSpeedRange: number;
  // Core layer: fraction of particles that spawn as bright small cores
  coreRatio: number;
  coreSxBase: number; coreSyBase: number; coreSzBase: number;
  // Ring-burst feature (for Sonic): emit a ring of N particles every ringInterval s
  ringInterval?: number;
  ringCount?: number;
  ringRadius?: number;
  ringSxBase?: number; ringSyBase?: number; ringSzBase?: number;
  ringMaxAge?: number;
  ringColorStart?: [number, number, number];
  ringColorEnd?: [number, number, number];
}

const TRAIL_CONFIGS: Record<string, TrailConfig> = {
  // ── FIRE ─────────────────────────────────────────────────────────────────
  // Reference: comet/fireball with tongue flames rising upward
  trail_fire: {
    colorStart: [1.0, 0.85, 0.15],   // yellow-white core
    colorEnd:   [0.5, 0.02, 0.0],    // deep red smoke
    colorCore:  [1.0, 1.0, 0.7],
    spawnRate: 45,
    maxAge: 0.65,
    fadeCurve: 'late',
    scatterX: 0.35, scatterY: 0.1,
    vxRange: 0.4, vyBase: 2.2, vyRange: 1.8,   // strong upward drift
    // Tall, thin flame tongues
    sxBase: 0.12, sxRange: 0.18,
    syBase: 0.35, syRange: 0.45,
    szBase: 0.10, szRange: 0.10,
    rotSpeedRange: 4.0,   // fast tumble = realistic fire flicker
    coreRatio: 0.25,
    coreSxBase: 0.07, coreSyBase: 0.07, coreSzBase: 0.07,
  },

  // ── WATER ────────────────────────────────────────────────────────────────
  trail_water: {
    colorStart: [0.3, 1.0, 1.0],
    colorEnd:   [0.0, 0.15, 0.75],
    spawnRate: 28,
    maxAge: 0.85,
    fadeCurve: 'linear',
    scatterX: 0.45, scatterY: 0.15,
    vxRange: 1.0, vyBase: 0.25, vyRange: 0.5,  // splash sideways
    sxBase: 0.13, sxRange: 0.14,
    syBase: 0.13, syRange: 0.14,
    szBase: 0.09, szRange: 0.09,
    rotSpeedRange: 2.5,
    coreRatio: 0.2,
    coreSxBase: 0.06, coreSyBase: 0.06, coreSzBase: 0.06,
  },

  // ── COSMIC ───────────────────────────────────────────────────────────────
  // Reference: nebula swirl — large spread glowing wisps, purple→teal
  trail_cosmic: {
    colorStart: [0.95, 0.2, 1.0],    // vivid purple
    colorEnd:   [0.0, 0.75, 0.65],   // teal
    spawnRate: 22,
    maxAge: 1.6,
    fadeCurve: 'late',
    scatterX: 0.55, scatterY: 0.3,
    vxRange: 0.7, vyBase: 0.05, vyRange: 0.4,
    // Large glowing blobs
    sxBase: 0.28, sxRange: 0.32,
    syBase: 0.28, syRange: 0.32,
    szBase: 0.18, szRange: 0.18,
    rotSpeedRange: 1.2,
    coreRatio: 0.3,
    coreSxBase: 0.12, coreSyBase: 0.12, coreSzBase: 0.12,
  },

  // ── SONIC ────────────────────────────────────────────────────────────────
  // Reference: jet afterburner — tight Z-streaks + expanding vapor rings
  trail_sonic: {
    colorStart: [1.0, 1.0, 1.0],     // white hot
    colorEnd:   [0.1, 0.45, 1.0],    // electric blue
    spawnRate: 70,
    maxAge: 0.22,
    fadeCurve: 'linear',
    scatterX: 0.12, scatterY: 0.08,
    vxRange: 0.05, vyBase: 0.0, vyRange: 0.05,
    // Very elongated along Z (the direction of travel) → jet streak
    sxBase: 0.055, sxRange: 0.04,
    syBase: 0.055, syRange: 0.04,
    szBase: 0.90,  szRange: 1.10,
    rotSpeedRange: 0.0,
    coreRatio: 0.15,
    coreSxBase: 0.04, coreSyBase: 0.04, coreSzBase: 0.04,
    // ── Sonic ring-burst every 0.12s ──────────────────────────────────────
    ringInterval: 0.12,
    ringCount: 18,
    ringRadius: 0.55,
    ringSxBase: 0.05, ringSyBase: 0.05, ringSzBase: 0.05,
    ringMaxAge: 0.20,
    ringColorStart: [1.0, 1.0, 1.0],
    ringColorEnd:   [0.1, 0.45, 1.0],
  },
};

// ── Component ──────────────────────────────────────────────────────────────
export const TrailRenderer: React.FC = () => {
  const particlesRef   = useRef<Particle[]>([]);
  const meshRef        = useRef<THREE.InstancedMesh>(null);
  const colorAttrRef   = useRef<THREE.BufferAttribute | null>(null);
  const ringTimerRef   = useRef<number>(0);

  const equippedTrail  = useGameStore((s) => s.equippedTrail);
  const playerLane     = useGameStore((s) => s.playerLane);
  const isDucking      = useGameStore((s) => s.isDucking);
  const isJumping      = useGameStore((s) => s.isJumping);
  const speed          = useGameStore((s) => s.speed);
  const gameState      = useGameStore((s) => s.gameState);

  const trailConfig = useMemo(() => {
    if (!equippedTrail) return null;
    const id = equippedTrail.replace('cosmetic_', '');
    return TRAIL_CONFIGS[id] ?? null;
  }, [equippedTrail]);

  // Clear particles when trail changes or game resets
  useEffect(() => {
    particlesRef.current = [];
    ringTimerRef.current = 0;
  }, [equippedTrail, gameState]);

  // Init per-instance color attribute
  useEffect(() => {
    if (!meshRef.current) return;
    const colors = new Float32Array(MAX_PARTICLES * 4);
    meshRef.current.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 4),
    );
    colorAttrRef.current = meshRef.current.geometry.getAttribute(
      'color',
    ) as THREE.BufferAttribute;
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const dummy = useMemo(() => new THREE.Matrix4(), []);
  const dummyPos  = useMemo(() => new THREE.Vector3(), []);
  const dummyQuat = useMemo(() => new THREE.Quaternion(), []);
  const dummyEul  = useMemo(() => new THREE.Euler(), []);
  const dummyScl  = useMemo(() => new THREE.Vector3(), []);

  const spawnParticle = (
    cfg: TrailConfig,
    px: number, py: number,
    isCore: boolean,
    overrides?: Partial<Particle>,
  ): Particle => {
    const sx = isCore
      ? cfg.coreSxBase
      : cfg.sxBase + Math.random() * cfg.sxRange;
    const sy = isCore
      ? cfg.coreSyBase
      : cfg.syBase + Math.random() * cfg.syRange;
    const sz = isCore
      ? cfg.coreSzBase
      : cfg.szBase + Math.random() * cfg.szRange;

    const cr = isCore && cfg.colorCore ? cfg.colorCore[0] : cfg.colorStart[0];
    const cg = isCore && cfg.colorCore ? cfg.colorCore[1] : cfg.colorStart[1];
    const cb = isCore && cfg.colorCore ? cfg.colorCore[2] : cfg.colorStart[2];

    return {
      x: px + (Math.random() - 0.5) * cfg.scatterX,
      y: py + (Math.random() - 0.5) * cfg.scatterY,
      z: -0.45,
      age: 0,
      maxAge: cfg.maxAge * (0.8 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * cfg.vxRange * 2,
      vy: cfg.vyBase + Math.random() * cfg.vyRange,
      sx, sy, sz,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedZ: (Math.random() - 0.5) * cfg.rotSpeedRange * 2,
      startR: cr, startG: cg, startB: cb,
      r: cr, g: cg, b: cb,
      a: 1.0,
      fadeCurve: cfg.fadeCurve,
      ...overrides,
    };
  };

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (!trailConfig || gameState !== 'PLAYING') {
      meshRef.current.count = 0;
      meshRef.current.instanceMatrix.needsUpdate = true;
      return;
    }

    const dt = Math.min(delta, 0.05);
    const cfg = trailConfig;
    const particles = particlesRef.current;
    const playerX = playerLane * LANE_WIDTH;
    const playerY = isDucking ? -0.15 : isJumping ? 0.6 : 0;

    // ── Spawn regular particles ──────────────────────────────────────────
    const base  = Math.floor(cfg.spawnRate * dt);
    const extra = Math.random() < (cfg.spawnRate * dt - base) ? 1 : 0;
    const spawnCount = base + extra;

    for (let i = 0; i < spawnCount && particles.length < MAX_PARTICLES; i++) {
      const isCore = Math.random() < cfg.coreRatio;
      particles.push(spawnParticle(cfg, playerX, playerY, isCore));
    }

    // ── Sonic ring burst ─────────────────────────────────────────────────
    if (cfg.ringInterval && cfg.ringCount) {
      ringTimerRef.current += dt;
      if (ringTimerRef.current >= cfg.ringInterval) {
        ringTimerRef.current = 0;
        const N = cfg.ringCount;
        const R = cfg.ringRadius ?? 0.5;
        for (let i = 0; i < N && particles.length < MAX_PARTICLES; i++) {
          const angle = (i / N) * Math.PI * 2;
          const rx = Math.cos(angle) * R;
          const ry = Math.sin(angle) * R;
          particles.push(spawnParticle(
            cfg,
            playerX, playerY,
            false,
            {
              x: playerX + rx,
              y: playerY + ry,
              z: -0.5,
              vx: rx * 2.5,
              vy: ry * 2.5,
              sx: cfg.ringSxBase ?? 0.05,
              sy: cfg.ringSyBase ?? 0.05,
              sz: cfg.ringSzBase ?? 0.05,
              maxAge: cfg.ringMaxAge ?? 0.18,
              startR: cfg.ringColorStart?.[0] ?? cfg.colorStart[0],
              startG: cfg.ringColorStart?.[1] ?? cfg.colorStart[1],
              startB: cfg.ringColorStart?.[2] ?? cfg.colorStart[2],
              r: cfg.ringColorStart?.[0] ?? cfg.colorStart[0],
              g: cfg.ringColorStart?.[1] ?? cfg.colorStart[1],
              b: cfg.ringColorStart?.[2] ?? cfg.colorStart[2],
            },
          ));
        }
      }
    }

    // ── Update & render ──────────────────────────────────────────────────
    let visibleCount = 0;
    const colorAttr = colorAttrRef.current;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;

      if (p.age > p.maxAge) {
        particles.splice(i, 1);
        continue;
      }

      // Physics
      p.z  -= speed * dt;          // drift behind player (world scroll)
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.rotZ += p.rotSpeedZ * dt;

      const progress = p.age / p.maxAge;

      // Fade curve
      const alpha = p.fadeCurve === 'late'
        ? progress < 0.65
          ? 1.0 - progress * 0.15        // stays mostly bright
          : (1.0 - progress) / 0.35      // quick fade at end
        : 1.0 - progress;                // linear
      p.a = Math.max(0, alpha);

      // Color interpolation (always from original startColor)
      p.r = p.startR * (1 - progress) + cfg.colorEnd[0] * progress;
      p.g = p.startG * (1 - progress) + cfg.colorEnd[1] * progress;
      p.b = p.startB * (1 - progress) + cfg.colorEnd[2] * progress;

      // Size: flames grow a bit at first, then shrink (gives "lick" feel)
      const sizeMult = p.fadeCurve === 'late'
        ? progress < 0.3 ? 1.0 + progress * 0.8 : 1.24 - progress * 0.9
        : 1.0 - progress * 0.4;

      // Build instance matrix with per-particle rotation and non-uniform scale
      dummyPos.set(p.x, p.y, -p.z);
      dummyEul.set(0, 0, p.rotZ);
      dummyQuat.setFromEuler(dummyEul);
      dummyScl.set(
        p.sx * sizeMult,
        p.sy * sizeMult,
        p.sz * sizeMult,
      );
      dummy.compose(dummyPos, dummyQuat, dummyScl);
      meshRef.current!.setMatrixAt(visibleCount, dummy);

      if (colorAttr) {
        colorAttr.setXYZW(visibleCount, p.r, p.g, p.b, p.a);
      }

      visibleCount++;
    }

    meshRef.current.count = visibleCount;
    if (colorAttr) colorAttr.needsUpdate = true;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      frustumCulled={false}
    >
      {/*
        SphereGeometry with non-uniform matrix scaling becomes an ellipsoid:
          - Fire:   sy >> sx  → tall flame tongue
          - Sonic:  sz >> sx  → elongated Z-streak (jet exhaust)
          - Cosmic: sx≈sy big → fat glow blob
          - Water:  sx≈sy med → droplet
        Additive blending makes overlapping particles accumulate glow — no solid edges.
      */}
      <sphereGeometry args={[1, 7, 7]} />
      <meshBasicMaterial
        vertexColors
        transparent
        toneMapped={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};
