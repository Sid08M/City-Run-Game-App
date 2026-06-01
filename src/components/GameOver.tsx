import React from 'react';
import { useGameStore } from '../state/useGameStore';

export const GameOver: React.FC = () => {
  const score = useGameStore((state) => state.score);
  const highScore = useGameStore((state) => state.highScore);
  const restartGame = useGameStore((state) => state.restartGame);
  const returnToMenu = useGameStore((state) => state.returnToMenu);

  const finalScore = Math.floor(score);
  
  // Since we save high score before displaying this screen, 
  // finalScore matches highScore if we broke/tied the record.
  const isNewRecord = finalScore >= highScore && finalScore > 0;

  return (
    <div className="gameover-overlay">
      <div className="glass-panel gameover-content">
        <h2 className="crash-title">CRASH DETECTED</h2>

        {isNewRecord && (
          <div className="new-record-alert">
            NEW DISTANCE RECORD SECURED
          </div>
        )}

        <div className="stats-grid">
          <div className="grid-stat">
            <span className="stat-label">FINAL RANGE</span>
            <span className="stat-value" style={{ color: '#ff00aa' }}>{finalScore}m</span>
          </div>
          <div className="grid-stat">
            <span className="stat-label">RECORD HIGH</span>
            <span className="stat-value" style={{ color: '#ffea00' }}>{highScore}m</span>
          </div>
        </div>

        <button className="btn-neon btn-neon-pink" onClick={restartGame}>
          REBOOT COURIER
        </button>
        
        <button 
          className="btn-neon" 
          onClick={returnToMenu} 
          style={{ marginTop: '1rem', width: '100%', padding: '0.8rem 2rem', fontSize: '1rem' }}
        >
          RETURN TO MENU
        </button>
      </div>
    </div>
  );
};
