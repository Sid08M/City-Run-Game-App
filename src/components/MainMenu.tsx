import React from 'react';
import { useGameStore } from '../state/useGameStore';

export const MainMenu: React.FC = () => {
  const highScore = useGameStore((state) => state.highScore);
  const startGame = useGameStore((state) => state.startGame);
  const enterGarage = useGameStore((state) => state.enterGarage);
  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeOfDay(e.target.value as any);
  };

  return (
    <div className="menu-overlay">
      <div className="glass-panel menu-content">
        <div className="game-title-container">
          <h1 className="game-title">City Run</h1>
          <div className="game-subtitle">Parkour Courier</div>
        </div>

        <div className="high-score-display">
          <span>HIGH SCORE:</span>
          <span className="high-score-val">{highScore}</span>
        </div>

        {/* Time of Day selector */}
        <div className="time-of-day-selector" style={{ marginBottom: '1rem' }}>
          <label htmlFor="timeSelect" style={{ color: '#fff', marginRight: '0.5rem' }}>Time of Day:</label>
          <select id="timeSelect" value={timeOfDay} onChange={handleChange}>
            <option value="MORNING">Morning</option>
            <option value="AFTERNOON">Afternoon</option>
            <option value="EVENING">Evening</option>
            <option value="NIGHT">Night</option>
          </select>
        </div>

        <button className="btn-neon" onClick={startGame}>
          START RUN
        </button>

        <button className="btn-secondary" onClick={enterGarage}>
          GARAGE
        </button>

        <div className="controls-guide">
          <div className="guide-title">OPERATIONAL INTERFACE</div>
          <div className="guide-keys">
            <div className="key-item">
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <span className="kbd">A</span>
                <span className="kbd">D</span>
              </div>
              <span>LANE SWITCH</span>
            </div>
            
            <div className="key-item">
              <span className="kbd">SPACE / W</span>
              <span>JUMP HURDLE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
