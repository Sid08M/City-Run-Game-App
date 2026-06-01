import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { TrackTile } from './TrackTile';

export const Track: React.FC = () => {
  const tiles = useGameStore((state) => state.tiles);

  return (
    <group>
      {tiles.map((tile) => (
        <TrackTile key={tile.id} tile={tile} />
      ))}
    </group>
  );
};
