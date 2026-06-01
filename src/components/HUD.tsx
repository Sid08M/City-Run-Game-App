import React from 'react';
import { useGameStore } from '../state/useGameStore';

export const HUD: React.FC = () => {
  const score = useGameStore((state) => state.score);
  const speed = useGameStore((state) => state.speed);
  const pedestrianHits = useGameStore((state) => state.pedestrianHits);
  const currency = useGameStore((state) => state.currency);

  // Speed math to map internal units/sec to simulated km/h (e.g., 18 units = 54 km/h)
  const displaySpeed = Math.floor(speed * 3);
  
  // Speed progress fill percentage (internal base 18, max 45)
  const fillPercentage = Math.min(100, Math.max(0, ((speed - 18) / (45 - 18)) * 100));
  
  // Multiplier scaling up with speed progression
  const multiplier = (speed / 18).toFixed(1);

  return (
    <div className="hud-layout">
      <div className="hud-header">
        {/* Distance / Score Panel */}
        <div className="glass-panel hud-score-panel">
          <div className="stat-label">COURIER RANGE</div>
          <div className="stat-value">{Math.floor(score)}m</div>
        </div>

        {/* Speedometer Gauge Panel */}
        <div className="glass-panel hud-speed-panel">
          <div className="stat-label">VELOCITY SCAN</div>
          <div className="stat-value">{displaySpeed} <span style={{ fontSize: '1rem', color: '#ff00aa' }}>km/h</span></div>
          <div className="speed-gauge-bg">
            <div 
              className="speed-gauge-fill" 
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: '#00f0ff', fontWeight: 600 }}>
            RATE: {multiplier}x
          </div>
        </div>

        {/* Worker Safety Counter */}
        <div className="glass-panel hud-safety-panel">
          <div className="stat-label">WORKER SAFETY</div>
          <div className="stat-value">
            {pedestrianHits} / 2
          </div>
        </div>
        {/* Construction Bolt Counter */}
        <div className="glass-panel hud-bolt-panel">
          <div className="stat-label">CONSTRUCTION BOLTS</div>
          <div className="stat-value">{currency}</div>
        </div>
      </div>
    </div>
  );
};
