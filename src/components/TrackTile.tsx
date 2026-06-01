import React from 'react';
import type { TrackTile as TrackTileType } from '../types/game';
import { Obstacle } from './Obstacle';

interface TrackTileProps {
  tile: TrackTileType;
}

export const TrackTile: React.FC<TrackTileProps> = ({ tile }) => {
  const { z, obstacles } = tile;

  return (
    <group position={[0, 0, z]}>
      {/* 1. Main Dark Asphalt Road Bed */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[9.0, 0.2, 30]} />
        <meshStandardMaterial
          color="#1a1a1c"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* 2. Left Concrete Shoulder */}
      <mesh receiveShadow position={[-5.25, -0.05, 0]}>
        <boxGeometry args={[1.5, 0.3, 30]} />
        <meshStandardMaterial
          color="#707376"
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* 3. Right Concrete Shoulder */}
      <mesh receiveShadow position={[5.25, -0.05, 0]}>
        <boxGeometry args={[1.5, 0.3, 30]} />
        <meshStandardMaterial
          color="#707376"
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* 4. Left Steel Guardrail */}
      <mesh castShadow position={[-5.9, 0.35, 0]}>
        <boxGeometry args={[0.15, 0.7, 30]} />
        <meshStandardMaterial
          color="#8a8d91"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      {/* Guardrail Support Posts */}
      {[-12, -4, 4, 12].map((postZ) => (
        <mesh key={`post_l_${postZ}`} position={[-5.95, 0.05, postZ]}>
          <boxGeometry args={[0.12, 0.4, 0.2]} />
          <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* 5. Right Steel Guardrail */}
      <mesh castShadow position={[5.9, 0.35, 0]}>
        <boxGeometry args={[0.15, 0.7, 30]} />
        <meshStandardMaterial
          color="#8a8d91"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      {/* Guardrail Support Posts */}
      {[-12, -4, 4, 12].map((postZ) => (
        <mesh key={`post_r_${postZ}`} position={[5.95, 0.05, postZ]}>
          <boxGeometry args={[0.12, 0.4, 0.2]} />
          <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* 6. Realistic Dashed Lane Separators (White dashes at X = -1.5 and X = 1.5) */}
      {[-11.25, -7.5, -3.75, 0, 3.75, 7.5, 11.25].map((dashZ) => (
        <group key={`dashes_${dashZ}`}>
          {/* Left Line Dashes */}
          <mesh position={[-1.5, 0.015, dashZ]}>
            <boxGeometry args={[0.1, 0.01, 1.8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
          {/* Right Line Dashes */}
          <mesh position={[1.5, 0.015, dashZ]}>
            <boxGeometry args={[0.1, 0.01, 1.8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* 7. Flashing Amber Highway Warning Blinkers along Guardrails */}
      {[-12, -4, 4, 12].map((lightZ) => {
        // Subtle offset blink animation using math based on Z so they blink asynchronously!
        const blinkPhase = Math.abs(Math.sin((z + lightZ) * 0.15));
        const amberColor = blinkPhase > 0.55 ? '#ffaa00' : '#442200';
        return (
          <group key={`lights_${lightZ}`}>
            {/* Left Warning Blinker */}
            <mesh position={[-5.9, 0.75, lightZ]}>
              <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
              <meshStandardMaterial color="#222222" roughness={0.5} />
            </mesh>
            <mesh position={[-5.9, 0.83, lightZ]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color={amberColor} />
            </mesh>
            
            {/* Right Warning Blinker */}
            <mesh position={[5.9, 0.75, lightZ]}>
              <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
              <meshStandardMaterial color="#222222" roughness={0.5} />
            </mesh>
            <mesh position={[5.9, 0.83, lightZ]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color={amberColor} />
            </mesh>
          </group>
        );
      })}

      {/* 8. Spanned Obstacles */}
      {obstacles.map((obstacle) => (
        <Obstacle key={obstacle.id} obstacle={obstacle} />
      ))}
    </group>
  );
};
