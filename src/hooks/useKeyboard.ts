import { useEffect } from 'react';
import { useGameStore } from '../state/useGameStore';

export const useKeyboard = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const state = useGameStore.getState();
      
      // Only process inputs during active gameplay
      if (state.gameState !== 'PLAYING') return;

      switch (event.key) {
        // Lane switching Left
        case 'ArrowLeft':
        case 'a':
        case 'A':
          state.setPlayerLane(state.playerLane - 1);
          break;

        // Lane switching Right
        case 'ArrowRight':
        case 'd':
        case 'D':
          state.setPlayerLane(state.playerLane + 1);
          break;

        // Jump (Disabled when ducking)
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          if (!state.isJumping && !state.isDucking) {
            state.setIsJumping(true);
          }
          break;

        // Duck (Held down, disabled when jumping)
        case 'ArrowDown':
        case 's':
        case 'S':
          if (!state.isJumping) {
            state.setIsDucking(true);
          }
          break;

        default:
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.gameState !== 'PLAYING') return;

      switch (event.key) {
        // Stop ducking on release
        case 'ArrowDown':
        case 's':
        case 'S':
          state.setIsDucking(false);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
};
