import React, { useMemo } from 'react';

// Simple Moon component with a directional light representing moonlight
// and a star field made of white points.
export const Moon: React.FC = () => {
  // Create stars positions once
  const stars = useMemo(() => {
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 200; // far away radius
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, []);

  return (
    <>
      {/* Moonlight directional light */}
      <directionalLight
        castShadow
        position={[30, 80, -20]}
        intensity={0.6}
        color="#ccd9ff"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      {/* Star field */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[stars, 3]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.8} color="#ffffff" sizeAttenuation={true} depthWrite={false} />
      </points>
    </>
  );
};
