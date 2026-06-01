import React from 'react';
import { useGameStore } from './state/useGameStore';
import { useKeyboard } from './hooks/useKeyboard';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/HUD';
import { GameOver } from './components/GameOver';
import './styles/ui.css';

const App: React.FC = () => {
  // Bind standard gameplay inputs globally
  useKeyboard();

  const gameState = useGameStore((state) => state.gameState);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#050508' }}>
      {/* 3D Game Canvas is always mounted to render a gorgeous glowing backdrop in the menus */}
      <GameCanvas />

      {/* HTML Overlays Layer */}
      <div className="game-ui-container">
        {gameState === 'MENU' && <MainMenu />}
        
        {gameState === 'PLAYING' && <HUD />}
        
        {gameState === 'GAME_OVER' && <GameOver />}
      </div>
    </div>
  );
};

export default App;
