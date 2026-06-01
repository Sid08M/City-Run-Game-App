import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Obstacle as ObstacleType } from '../types/game';
import * as THREE from 'three';

interface ObstacleProps {
  obstacle: ObstacleType;
}

export const Obstacle: React.FC<ObstacleProps> = ({ obstacle }) => {
  const { lane, localZ, type, width, height, depth } = obstacle;
  const x = lane * 3; // lane width constant matches Player lane width
  const z = localZ;
  if (type === 'TOKEN') {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
      if (meshRef.current) {
        meshRef.current.rotation.y += delta * 3; // spin fast
        meshRef.current.rotation.x += delta * 1;
      }
    });
    // gold material
    const material = <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} emissive="#ffea00" emissiveIntensity={0.6} />;
    return (
      <group position={[x, height / 2, z]}>
        <mesh ref={meshRef}>
          <cylinderGeometry args={[0.4, 0.4, 0.2, 32]} />
          {material}
        </mesh>
      </group>
    );
  }

  if (type === 'OVERHEAD') {
    // Left & Right posts and a suspended yellow/black warning stripes beam
    const pillarGeometry = <cylinderGeometry args={[0.06, 0.06, height, 8]} />;
    const pillarMaterial = <meshStandardMaterial color="#444446" metalness={0.8} roughness={0.2} />;
    
    return (
      <group position={[x, 0, z]}>
        {/* Left post */}
        <mesh position={[-1.3, height / 2, 0]} castShadow>
          {pillarGeometry}
          {pillarMaterial}
        </mesh>
        {/* Right post */}
        <mesh position={[1.3, height / 2, 0]} castShadow>
          {pillarGeometry}
          {pillarMaterial}
        </mesh>
        {/* Suspended Solid Barrier Beam (leaves clearance underneath from Y=0 to Y=1.1, solid block above) */}
        <mesh position={[0, height - 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[width - 0.2, 1.2, depth]} />
          <meshStandardMaterial color="#ffcc00" roughness={0.4} metalness={0.1} /> {/* Vibrant warning yellow */}
        </mesh>
        {/* Danger stripes on the beam */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((stripeX, index) => (
          <mesh key={index} position={[stripeX, height - 0.8, depth / 2 + 0.01]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.15, 1.5, 0.01]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
        ))}
      </group>
    );
  }



  // Choose material/color based on type
  let color = '#ffffff';
  let geometry = <boxGeometry args={[width, height, depth]} />;

  if (type === 'HURDLE') {
    // Plastic orange-and-white construction barricade (small hurdle)
    color = '#ff8800'; // orange
    geometry = (
      <boxGeometry args={[width, height, depth]} />
    );
  } else if (type === 'BARRICADE') {
    // Heavy grey concrete jersey barrier
    color = '#7d7d7d'; // concrete grey
  } else if (type === 'PEDESTRIAN') {
    // Yellow-vested worker (simple stacked primitives)
    color = '#ffd700'; // bright yellow vest
    geometry = (
      <boxGeometry args={[width, height, depth]} />
    );
  }

  return (
    <group position={[x, height / 2, z]}> {/* lift so base sits on road */}
      <mesh>
        {geometry}
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Add simple head for pedestrian */}
      {type === 'PEDESTRIAN' && (
        <mesh position={[0, height / 2 + 0.6, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color="#ffdbac" /> {/* skin tone */}
        </mesh>
      )}
    </group>
  );
};
