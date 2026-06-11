export type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER' | 'GARAGE';

export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export type ObstacleType = 'HURDLE' | 'BARRICADE' | 'PEDESTRIAN' | 'TOKEN' | 'OVERHEAD';

export interface ShopItem {
  id: string;
  category: 'enhancement' | 'consumable' | 'cosmetic';
  name: string;
  description: string;
  icon: string;
  cost: number;
  maxLevel: number; // For enhancements: max upgrade level. For consumables: max stack. For cosmetics: always 1.
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  lane: number; // -1 (Left), 0 (Center), 1 (Right)
  localZ: number; // Local Z offset within the tile (-10 to 10)
  width: number;
  height: number;
  depth: number;
}

export interface TrackTile {
  id: string;
  z: number; // Global Z coordinate of the tile center
  obstacles: Obstacle[];
}

export interface GameStore {
  gameState: GameState;
  score: number;
  highScore: number;
  speed: number;
  playerLane: number; // -1, 0, 1
  isJumping: boolean;
  isDucking: boolean;
  isShieldActive: boolean; // Visual indicator for HUD when shield absorbed a hit
  tiles: TrackTile[];
  timeOfDay: TimeOfDay;
  currency: number;
  pedestrianHits: number;
  inventory: Record<string, number>; // itemId -> count/level
  equippedTrail: string | null; // cosmetic trail ID

  addCurrency: (amount: number) => void;
  unlockItem: (itemId: string, cost: number, maxLevel: number) => boolean;
  consumeItem: (itemId: string) => void;
  setIsShieldActive: (active: boolean) => void;
  equipTrail: (trailId: string | null) => void;
  startGame: () => void;
  gameOver: () => void;
  restartGame: () => void;
  setPlayerLane: (lane: number) => void;
  setIsJumping: (jumping: boolean) => void;
  setIsDucking: (ducking: boolean) => void;
  tick: (dt: number) => void;
  resetTrack: () => void;
  returnToMenu: () => void;
  enterGarage: () => void;
  exitGarage: () => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  removeObstacle: (id: string) => void;
}
