import { create } from 'zustand';
import type { GameStore, TrackTile, Obstacle, ObstacleType } from '../types/game';

const TILE_LENGTH = 30;
const POOL_SIZE = 5;
const BASE_SPEED = 18;
const MAX_SPEED = 45;

// ── Inventory helpers ──────────────────────────────────────────────────────
const loadInventory = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem('cityrun_inventory') || '{}');
  } catch {
    return {};
  }
};

const saveInventory = (inv: Record<string, number>) => {
  localStorage.setItem('cityrun_inventory', JSON.stringify(inv));
};

// ── Equipped Trail helpers ──────────────────────────────────────────────────
const loadEquippedTrail = (): string | null => {
  try {
    return localStorage.getItem('cityrun_equipped_trail');
  } catch {
    return null;
  }
};

const saveEquippedTrail = (trailId: string | null) => {
  if (trailId) {
    localStorage.setItem('cityrun_equipped_trail', trailId);
  } else {
    localStorage.removeItem('cityrun_equipped_trail');
  }
};

// Helper to generate obstacles for a tile, ensuring they are solvable
const generateObstaclesForTile = (tileZ: number, isInitial: boolean = false): Obstacle[] => {
  // First two tiles should have no obstacles to give the player a fair start
  if (isInitial && Math.abs(tileZ) <= 30) {
    return [];
  }

  const obstacles: Obstacle[] = [];
  const sectors = [-10, 0, 10]; // 3 positions along the 30-unit tile

  sectors.forEach((localZ) => {
    // 60% chance to spawn obstacles at this sector
    if (Math.random() > 0.6) return;

    // Track what is intended for each of the 3 lanes in this row/sector
    const laneIntended: { [lane: number]: ObstacleType | null } = {
      [-1]: null,
      [0]: null,
      [1]: null,
    };

    // Pick number of obstacles (1 or 2, never 3 to guarantee an escape lane)
    const numObstacles = Math.random() > 0.7 ? 2 : 1;
    const lanes = [-1, 0, 1];

    // Shuffle lanes
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }

    const activeLanes = lanes.slice(0, numObstacles);

    activeLanes.forEach((lane) => {
      const rand = Math.random();
      if (rand < 0.35) {
        laneIntended[lane] = 'HURDLE';
      } else if (rand < 0.7) {
        laneIntended[lane] = 'BARRICADE';
      } else {
        laneIntended[lane] = 'OVERHEAD';
      }
    });

    // Spawn PEDESTRIAN in the remaining empty lanes (with 35% probability)
    const emptyLanes = lanes.filter((l) => !activeLanes.includes(l));
    if (emptyLanes.length > 0 && Math.random() < 0.35) {
      const pedestrianLane = emptyLanes[Math.floor(Math.random() * emptyLanes.length)];
      laneIntended[pedestrianLane] = 'PEDESTRIAN';
    }

    // --- GOLDEN PATH INTERVENTION ---
    // A lane is 'blocked' if its obstacle type is 'BARRICADE', 'PEDESTRIAN', or 'OVERHEAD' (non-jumpable)
    const isBlocked = (type: ObstacleType | null) => type === 'BARRICADE' || type === 'PEDESTRIAN' || type === 'OVERHEAD';
    if (isBlocked(laneIntended[-1]) && isBlocked(laneIntended[0]) && isBlocked(laneIntended[1])) {
      // Overwrite one random lane to be jumpable (HURDLE) or clear it completely (null)
      const lanesToOverwrite = [-1, 0, 1];
      const chosenLane = lanesToOverwrite[Math.floor(Math.random() * 3)];
      laneIntended[chosenLane] = Math.random() > 0.5 ? 'HURDLE' : null;
    }

    // --- GENERATE VALIDATED OBSTACLES ---
    const allLanes = [-1, 0, 1];
    allLanes.forEach((lane) => {
      const type = laneIntended[lane];
      if (type && type !== 'TOKEN') {
        const isBarricade = type === 'BARRICADE';
        const isPedestrian = type === 'PEDESTRIAN';
        const isOverhead = type === 'OVERHEAD';
        obstacles.push({
          id: `${isPedestrian ? 'ped' : (isOverhead ? 'ovh' : 'obs')}_${tileZ}_${localZ}_${lane}_${Math.random().toString(36).substr(2, 5)}`,
          type,
          lane,
          localZ,
          width: isPedestrian ? 0.8 : (isOverhead ? 3.0 : 1.8),
          height: isBarricade ? 3.0 : (isPedestrian ? 1.8 : (isOverhead ? 2.5 : 0.8)),
          depth: isPedestrian ? 0.6 : (isOverhead ? 0.8 : 0.8),
        });
      }
    });

    // --- TOKEN PRESERVATION ---
    // Spawn TOKEN in any remaining empty lanes (20% chance each)
    const finalEmptyLanes = allLanes.filter((lane) => laneIntended[lane] === null);
    finalEmptyLanes.forEach((lane) => {
      if (Math.random() < 0.2) {
        obstacles.push({
          id: `tok_${tileZ}_${localZ}_${lane}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'TOKEN',
          lane,
          localZ,
          width: 0.6,
          height: 0.5,
          depth: 0.6,
        });
      }
    });
  });

  return obstacles;
};

// Initial tiles setup
const createInitialTiles = (): TrackTile[] => {
  const tiles: TrackTile[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const z = -i * TILE_LENGTH;
    tiles.push({
      id: `tile_${i}_${Date.now()}`,
      z,
      obstacles: generateObstaclesForTile(z, true),
    });
  }
  return tiles;
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'MENU',
  score: 0,
  highScore: parseInt(localStorage.getItem('cityrun_highscore') || '0', 10),
  currency: Math.max(9999, parseInt(localStorage.getItem('cityrun_currency') || '0', 10)),
  inventory: loadInventory(),
  equippedTrail: loadEquippedTrail(),
  speed: BASE_SPEED,
  playerLane: 0,
  isJumping: false,
  isDucking: false,
  isShieldActive: false,
  tiles: createInitialTiles(),
  timeOfDay: 'AFTERNOON',
  pedestrianHits: 0,

  // ── Currency ──────────────────────────────────────────────────────────────
  addCurrency: (amount) => {
    set((state) => {
      const newCurrency = state.currency + amount;
      localStorage.setItem('cityrun_currency', newCurrency.toString());
      return { currency: newCurrency };
    });
  },

  // ── Shop ──────────────────────────────────────────────────────────────────
  unlockItem: (itemId, cost, maxLevel) => {
    const { currency, inventory } = get();
    const currentLevel = inventory[itemId] || 0;
    if (currentLevel >= maxLevel) return false; // Already maxed
    if (currency < cost) return false;          // Not enough bolts
    const newCurrency = currency - cost;
    const newInventory = { ...inventory, [itemId]: currentLevel + 1 };
    localStorage.setItem('cityrun_currency', newCurrency.toString());
    saveInventory(newInventory);
    set({ currency: newCurrency, inventory: newInventory });
    return true;
  },

  consumeItem: (itemId) => {
    const { inventory } = get();
    const current = inventory[itemId] || 0;
    if (current <= 0) return;
    const newInventory = { ...inventory, [itemId]: current - 1 };
    saveInventory(newInventory);
    set({ inventory: newInventory });
  },

  equipTrail: (trailId) => {
    saveEquippedTrail(trailId);
    set({ equippedTrail: trailId });
  },

  setIsShieldActive: (active) => {
    set({ isShieldActive: active });
  },

  // ── Game lifecycle ────────────────────────────────────────────────────────
  startGame: () => {
    const { inventory } = get();
    // Overdrive Thrusters: each level adds 0.2 to the starting speed
    const speedBonus = (inventory['enhancement_speed'] || 0) * 0.2;
    set({
      gameState: 'PLAYING',
      score: 0,
      speed: BASE_SPEED + speedBonus,
      playerLane: 0,
      isJumping: false,
      isDucking: false,
      isShieldActive: false,
      tiles: createInitialTiles(),
      pedestrianHits: 0,
    });
  },

  gameOver: () => {
    const { score, highScore } = get();
    const finalScore = Math.floor(score);
    if (finalScore > highScore) {
      localStorage.setItem('cityrun_highscore', finalScore.toString());
      set({ highScore: finalScore });
    }
    set({ gameState: 'GAME_OVER' });
  },

  restartGame: () => {
    get().startGame();
  },

  setPlayerLane: (lane) => {
    // Clamp to -1, 0, 1
    const clampedLane = Math.max(-1, Math.min(1, lane));
    set({ playerLane: clampedLane });
  },

  setIsJumping: (jumping) => {
    set({ isJumping: jumping });
  },

  setIsDucking: (ducking) => {
    set({ isDucking: ducking });
  },

  resetTrack: () => {
    set({ tiles: createInitialTiles() });
  },

  returnToMenu: () => {
    set({
      gameState: 'MENU',
      score: 0,
      speed: BASE_SPEED,
      playerLane: 0,
      isJumping: false,
      isDucking: false,
      isShieldActive: false,
      tiles: createInitialTiles(),
      pedestrianHits: 0,
    });
  },

  enterGarage: () => {
    set({ gameState: 'GARAGE' });
  },

  exitGarage: () => {
    set({ gameState: 'MENU' });
  },

  setTimeOfDay: (time) => {
    set({ timeOfDay: time });
  },

  removeObstacle: (id) => {
    const { tiles } = get();
    const updatedTiles = tiles.map((tile) => ({
      ...tile,
      obstacles: tile.obstacles.filter((obs) => obs.id !== id),
    }));
    set({ tiles: updatedTiles });
  },

  tick: (dt) => {
    const { gameState, speed, tiles, score, inventory } = get();
    if (gameState !== 'PLAYING') return;

    // 1. Update score (distance traveled)
    const newScore = score + speed * dt;

    // 2. Distance-Based Scaling: every 150 meters, add 3 km/h (1.0 unit of internal speed)
    //    Overdrive Thrusters raise the effective base speed so the bonus is on top of that.
    const speedBonus = (inventory['enhancement_speed'] || 0) * 0.2;
    const effectiveBase = BASE_SPEED + speedBonus;
    const speedGained = Math.floor(newScore / 150) * 1.0;
    const newSpeed = Math.min(MAX_SPEED, effectiveBase + speedGained);

    // 3. Move tiles along positive Z (treadmill)
    const updatedTiles = tiles.map((tile) => ({
      ...tile,
      z: tile.z + speed * dt,
    }));

    // Check for tiles that passed behind the player (e.g., Z > 30)
    const activeTiles = updatedTiles.map((tile) => {
      if (tile.z > 30) {
        // Find the furthest tile (most negative Z)
        let furthestZ = 0;
        updatedTiles.forEach((t) => {
          if (t.z < furthestZ) furthestZ = t.z;
        });

        // Reposition to the far end
        const newZ = furthestZ - TILE_LENGTH;
        return {
          id: `tile_recycled_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          z: newZ,
          obstacles: generateObstaclesForTile(newZ, false),
        };
      }
      return tile;
    });

    set({
      score: newScore,
      speed: newSpeed,
      tiles: activeTiles,
    });
  },
}));
