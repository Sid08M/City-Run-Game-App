// src/components/LightningTrail.tsx
// Renders a crackling, branching electric bolt trail behind the player.
//
// Visual layers:
//  1. innerMesh  — thin elongated spheres aligned per bolt segment (white core)
//  2. outerMesh  — thick elongated spheres along the same segments (blue glow halo)
//  3. ambientMesh— spherical blobs at each bolt vertex (soft ambient light)
//  4. lineSegs   — 1-px LineSegments on the same paths (sharp crack outline)
//  5. sparkMesh  — flying sparks that shoot off and fall with gravity

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../state/useGameStore';

const LANE_WIDTH   = 3;
const MAX_SEGS     = 600;   // max bolt-segment instances per glow mesh
const MAX_AMB      = 600;   // ambient vertex blobs
const MAX_SPARKS   = 200;
const MAX_LINE_V   = 2000;  // line segment vertex budget (2 per segment)

// ── Procedural radial glow texture ──────────────────────────────────────────
// function createGlowTexture(): THREE.Texture {
//   const S = 64;
//   const c = document.createElement('canvas');
//   c.width = c.height = S;
//   const ctx = c.getContext('2d')!;
//   const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
//   g.addColorStop(0.00, 'rgba(255,255,255,1.0)');
//   g.addColorStop(0.18, 'rgba(160,210,255,0.85)');
//   g.addColorStop(0.50, 'rgba(40, 90, 255,0.35)');
//   g.addColorStop(1.00, 'rgba(0,  10,120,0.0)');
//   ctx.fillStyle = g;
//   ctx.fillRect(0, 0, S, S);
//   return new THREE.CanvasTexture(c);
// }

// ── Midpoint-displacement lightning path ─────────────────────────────────────
// Recursively bisects the straight line (start→end) and offsets each midpoint
// by ±roughness so the result is a jagged polyline (classic fractal lightning).
function boltPath(
  sx: number, sy: number, sz: number,
  ex: number, ey: number, ez: number,
  roughness: number,
  iters: number,
): THREE.Vector3[] {
  let pts = [new THREE.Vector3(sx, sy, sz), new THREE.Vector3(ex, ey, ez)];
  let r = roughness;
  for (let it = 0; it < iters; it++) {
    const next: THREE.Vector3[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(pts[i]);
      const mid = pts[i].clone().lerp(pts[i + 1], 0.5);
      mid.x += (Math.random() - 0.5) * r * 2.0;
      mid.y += (Math.random() - 0.5) * r * 1.0;
      next.push(mid);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    r  *= 0.52; // roughness decays with depth
  }
  return pts;
}

interface Spark {
  x: number; y: number; z: number;
  vx: number; vy: number;
  age: number; maxAge: number;
  sz: number;
}

// ── Component ────────────────────────────────────────────────────────────────
export const LightningTrail: React.FC = () => {
  const equippedTrail = useGameStore((s) => s.equippedTrail);
  const gameState     = useGameStore((s) => s.gameState);
  const playerLane    = useGameStore((s) => s.playerLane);
  const isDucking     = useGameStore((s) => s.isDucking);
  const speed         = useGameStore((s) => s.speed);

  const isActive = equippedTrail === 'cosmetic_trail_lightning';

  // ── Mesh refs ──────────────────────────────────────────────────────────────
  const innerRef   = useRef<THREE.InstancedMesh>(null!); // thin white core
  const outerRef   = useRef<THREE.InstancedMesh>(null!); // thick blue halo
  const ambRef     = useRef<THREE.InstancedMesh>(null!); // vertex ambient blobs
  const sparkRef   = useRef<THREE.InstancedMesh>(null!); // flying sparks
  const lineGeoRef = useRef<THREE.BufferGeometry>(null!);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null!);

  // ── Buffer attribute refs ──────────────────────────────────────────────────
  const linePosRef  = useRef<THREE.BufferAttribute | null>(null);
  const sparkColRef = useRef<THREE.BufferAttribute | null>(null);
  const sparksRef   = useRef<Spark[]>([]);

  // ── Bolt regeneration timer ────────────────────────────────────────────────
  const timerRef    = useRef(0);
  const intervalRef = useRef(0.08);

  // ── Reusable scratch objects (no per-frame GC pressure) ───────────────────
  const dA   = useMemo(() => new THREE.Object3D(), []);
  const dB   = useMemo(() => new THREE.Object3D(), []);
  const dC   = useMemo(() => new THREE.Object3D(), []);
  const dSp  = useMemo(() => new THREE.Object3D(), []);
  const segDir  = useMemo(() => new THREE.Vector3(), []);
  const segMid  = useMemo(() => new THREE.Vector3(), []);
  const segQuat = useMemo(() => new THREE.Quaternion(), []);
  const Z_AXIS  = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  // const glowTex = useMemo(() => createGlowTexture(), []);

  // ── One-time buffer initialisation ────────────────────────────────────────
  useEffect(() => {
    // Line segment position buffer
    const lineArr  = new Float32Array(MAX_LINE_V * 3);
    const lineAttr = new THREE.BufferAttribute(lineArr, 3);
    lineAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeoRef.current.setAttribute('position', lineAttr);
    lineGeoRef.current.setDrawRange(0, 0);
    linePosRef.current = lineAttr;

    // Spark colour attribute
    const colArr  = new Float32Array(MAX_SPARKS * 4);
    const colAttr = new THREE.BufferAttribute(colArr, 4);
    sparkRef.current.geometry.setAttribute('color', colAttr);
    sparkRef.current.count = 0;
    sparkColRef.current    = colAttr;
  }, []);

  // ── Clear all instances when trail or game state changes ─────────────────
  useEffect(() => {
    sparksRef.current = [];
    timerRef.current  = 0;
  }, [equippedTrail, gameState]);

  // ── Bolt generation ────────────────────────────────────────────────────────
  const regenerate = (px: number, py: number) => {
    const lineArr = linePosRef.current?.array as Float32Array;
    if (!lineArr) return;

    // Main bolt: from player pos, extending ~3 units in +Z (behind player/toward camera)
    const mainLen = 2.6 + Math.random() * 1.1;
    const main = boltPath(
      px,  py,  0.15,
      px + (Math.random() - 0.5) * 0.4,
      py + (Math.random() - 0.5) * 0.25,
      mainLen,
      0.42, 4,
    );

    const allBolts: THREE.Vector3[][] = [main];

    // Primary branches forking off the main bolt
    const nBranches = 3 + Math.floor(Math.random() * 3);
    for (let b = 0; b < nBranches; b++) {
      const si  = Math.floor(main.length * 0.15 + Math.random() * main.length * 0.65);
      const sp  = main[Math.min(si, main.length - 1)];
      const ang = (Math.random() - 0.5) * Math.PI * 0.75;
      const bl  = 0.55 + Math.random() * 1.25;

      const branch = boltPath(
        sp.x, sp.y, sp.z,
        sp.x + Math.sin(ang) * bl * 0.75,
        sp.y + (Math.random() - 0.45) * 0.45,
        Math.min(sp.z + Math.abs(Math.cos(ang)) * bl, mainLen + 0.3),
        0.22, 3,
      );
      allBolts.push(branch);

      // Secondary sub-branches (50 % chance)
      if (Math.random() < 0.55 && branch.length > 4) {
        const ssi = Math.floor(branch.length * 0.35 + Math.random() * branch.length * 0.4);
        const ssp = branch[ssi];
        allBolts.push(boltPath(
          ssp.x, ssp.y, ssp.z,
          ssp.x + (Math.random() - 0.5) * 0.85,
          ssp.y + (Math.random() - 0.5) * 0.4,
          ssp.z + 0.2 + Math.random() * 0.5,
          0.12, 2,
        ));
      }
    }

    // ── Write geometry ──────────────────────────────────────────────────────
    let segCount  = 0;
    let ambCount  = 0;
    let lineSeg   = 0;

    for (const bolt of allBolts) {
      for (let i = 0; i < bolt.length - 1; i++) {
        const a = bolt[i];
        const b = bolt[i + 1];

        // Compute segment mid-point, direction, length and quaternion
        segMid.addVectors(a, b).multiplyScalar(0.5);
        segDir.subVectors(b, a);
        const len = segDir.length();
        if (len < 0.001) continue;
        segDir.normalize();

        // Handle near-antiparallel case for setFromUnitVectors
        const dot = segDir.dot(Z_AXIS);
        if (dot < -0.9999) {
          segQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
        } else {
          segQuat.setFromUnitVectors(Z_AXIS, segDir);
        }

        if (segCount < MAX_SEGS) {
          // Inner white core (thin ellipsoid along segment)
          dA.position.copy(segMid);
          dA.quaternion.copy(segQuat);
          dA.scale.set(0.022, 0.022, len * 0.5);
          dA.updateMatrix();
          innerRef.current?.setMatrixAt(segCount, dA.matrix);

          // Outer blue glow halo (thick ellipsoid, same orientation)
          dB.position.copy(segMid);
          dB.quaternion.copy(segQuat);
          dB.scale.set(0.13, 0.13, len * 0.5);
          dB.updateMatrix();
          outerRef.current?.setMatrixAt(segCount, dB.matrix);
          segCount++;
        }

        // LineSegments (1-px bright crack on top of the glow)
        if (lineSeg < MAX_LINE_V / 2) {
          const b6 = lineSeg * 6;
          lineArr[b6]   = a.x; lineArr[b6+1] = a.y; lineArr[b6+2] = a.z;
          lineArr[b6+3] = b.x; lineArr[b6+4] = b.y; lineArr[b6+5] = b.z;
          lineSeg++;
        }
      }

      // Ambient glow blob at each bolt vertex
      for (let i = 0; i < bolt.length && ambCount < MAX_AMB; i++) {
        dC.position.copy(bolt[i]);
        dC.quaternion.identity();
        dC.scale.setScalar(0.07 + Math.random() * 0.09);
        dC.updateMatrix();
        ambRef.current?.setMatrixAt(ambCount, dC.matrix);
        ambCount++;
      }

      // Spawn sparks at 2 random points per bolt
      for (let s = 0; s < 2; s++) {
        if (sparksRef.current.length >= MAX_SPARKS) break;
        const pt = bolt[Math.floor(Math.random() * bolt.length)];
        sparksRef.current.push({
          x: pt.x, y: pt.y, z: pt.z,
          vx: (Math.random() - 0.5) * 2.2,
          vy: (Math.random() - 0.3) * 1.5,
          age: 0,
          maxAge: 0.1 + Math.random() * 0.18,
          sz: 0.02 + Math.random() * 0.02,
        });
      }
    }

    // ── Upload to GPU ───────────────────────────────────────────────────────
    if (innerRef.current) {
      innerRef.current.count = segCount;
      innerRef.current.instanceMatrix.needsUpdate = true;
    }
    if (outerRef.current) {
      outerRef.current.count = segCount;
      outerRef.current.instanceMatrix.needsUpdate = true;
    }
    if (ambRef.current) {
      ambRef.current.count = ambCount;
      ambRef.current.instanceMatrix.needsUpdate = true;
    }
    if (linePosRef.current) linePosRef.current.needsUpdate = true;
    lineGeoRef.current?.setDrawRange(0, lineSeg * 2);

    // Flicker: random opacity each bolt generation (lightning never has constant intensity)
    const flicker = 0.72 + Math.random() * 0.28;
    if (lineMatRef.current) lineMatRef.current.opacity = flicker;

    intervalRef.current = 0.05 + Math.random() * 0.07;
  };

  // ── Frame loop ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // ── Hide everything when not active ────────────────────────────────────
    if (!isActive || gameState !== 'PLAYING') {
      if (innerRef.current)  innerRef.current.count  = 0;
      if (outerRef.current)  outerRef.current.count  = 0;
      if (ambRef.current)    ambRef.current.count    = 0;
      if (sparkRef.current)  sparkRef.current.count  = 0;
      lineGeoRef.current?.setDrawRange(0, 0);
      sparksRef.current = [];
      return;
    }

    const px = playerLane * LANE_WIDTH;
    const py = isDucking ? -0.15 : 0;

    // ── Regenerate bolt geometry at interval ────────────────────────────────
    timerRef.current += dt;
    if (timerRef.current >= intervalRef.current) {
      timerRef.current = 0;
      regenerate(px, py);
    }

    // ── Update spark particles ──────────────────────────────────────────────
    const sparks = sparksRef.current;
    let sc = 0;
    const cArr = sparkColRef.current?.array as Float32Array | undefined;

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      if (s.age > s.maxAge) { sparks.splice(i, 1); continue; }

      // Move with a fraction of world speed so sparks don't snap to player
      s.z += speed * dt * 0.10;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy -= 3.0 * dt; // gravity — sparks arc downward

      const prog = s.age / s.maxAge;
      dSp.position.set(s.x, s.y, s.z);
      dSp.scale.setScalar(s.sz * (1 - prog * 0.55));
      dSp.updateMatrix();
      sparkRef.current!.setMatrixAt(sc, dSp.matrix);

      if (cArr) {
        cArr[sc * 4 + 0] = 0.45 + 0.55 * (1 - prog); // R: white→blue
        cArr[sc * 4 + 1] = 0.75;
        cArr[sc * 4 + 2] = 1.0;
        cArr[sc * 4 + 3] = 1.0 - prog;
      }
      sc++;
    }

    if (sparkRef.current) {
      sparkRef.current.count = sc;
      sparkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (sparkColRef.current) sparkColRef.current.needsUpdate = true;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <group>

      {/*
        Layer 1 — Thin white inner glow
        Each instance is a sphere scaled to (0.022, 0.022, halfLen) and rotated
        to align with its bolt segment → creates a thin glowing "core" rod.
      */}
      <instancedMesh
        ref={innerRef}
        args={[undefined, undefined, MAX_SEGS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color="#ddeeff"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/*
        Layer 2 — Thick blue outer glow halo
        Same segment alignment but much wider (0.13 radius) → soft electric halo.
      */}
      <instancedMesh
        ref={outerRef}
        args={[undefined, undefined, MAX_SEGS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color="#1144ff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/*
        Layer 3 — Ambient vertex blobs
        Soft spherical glow placed at each bolt vertex — creates the diffuse blue
        ambient light you see in the reference image.
      */}
      <instancedMesh
        ref={ambRef}
        args={[undefined, undefined, MAX_AMB]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 5, 5]} />
        <meshBasicMaterial
          color="#0033cc"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/*
        Layer 4 — Sharp 1-px line crack (LineSegments)
        Despite being 1 pixel wide, these are crucial for the "electric crack" look.
        Their sharp edges cut through the soft glow and define the bolt structure.
      */}
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={lineGeoRef} />
        <lineBasicMaterial
          ref={lineMatRef}
          color="#bbddff"
          transparent
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>

      {/*
        Layer 5 — Flying sparks
        Tiny bright particles that shoot off from random bolt vertices,
        arc with gravity, and fade out → the "spray" of sparks in the reference.
      */}
      <instancedMesh
        ref={sparkRef}
        args={[undefined, undefined, MAX_SPARKS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 4, 4]} />
        <meshBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

    </group>
  );
};
