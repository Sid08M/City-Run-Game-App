import type { ShopItem } from '../types/game';

export const SHOP_ITEMS: Record<string, ShopItem> = {
  // ── Category 1: Enhancements (can be leveled up) ──
  enhancement_magnet: {
    id: 'enhancement_magnet',
    category: 'enhancement',
    name: 'Electromagnet',
    description: 'Expands token collection radius by 0.5 units per level (max 5).',
    icon: '🧲',
    cost: 150,
    maxLevel: 5,
  },
  enhancement_speed: {
    id: 'enhancement_speed',
    category: 'enhancement',
    name: 'Overdrive Thrusters',
    description: 'Increases base running speed by 0.2 units per level (max 5).',
    icon: '⚡',
    cost: 200,
    maxLevel: 5,
  },

  // ── Category 2: Consumables (stackable, consumable) ──
  consumable_shield: {
    id: 'consumable_shield',
    category: 'consumable',
    name: 'Titanium Plating',
    description: 'Absorbs one fatal collision, granting 1.5s invulnerability. Stackable.',
    icon: '🛡️',
    cost: 100,
    maxLevel: 99, // Stack limit
  },

  // ── Category 3: Cosmetics (trails) ──
  cosmetic_trail_fire: {
    id: 'cosmetic_trail_fire',
    category: 'cosmetic',
    name: 'Fire Trail',
    description: 'Leave a blazing trail of orange and red particles.',
    icon: '🔥',
    cost: 500,
    maxLevel: 1,
  },
  cosmetic_trail_water: {
    id: 'cosmetic_trail_water',
    category: 'cosmetic',
    name: 'Water Trail',
    description: 'Leave a cool cyan and blue particle stream.',
    icon: '💧',
    cost: 500,
    maxLevel: 1,
  },
  cosmetic_trail_cosmic: {
    id: 'cosmetic_trail_cosmic',
    category: 'cosmetic',
    name: 'Cosmic Trail',
    description: 'Leave a mystical purple and magenta glow.',
    icon: '✨',
    cost: 1000,
    maxLevel: 1,
  },
  cosmetic_trail_sonic: {
    id: 'cosmetic_trail_sonic',
    category: 'cosmetic',
    name: 'Sonic Trail',
    description: 'Leave a bright white and blue blur effect.',
    icon: '⚡',
    cost: 2000,
    maxLevel: 1,
  },
  cosmetic_trail_lightning: {
    id: 'cosmetic_trail_lightning',
    category: 'cosmetic',
    name: 'Lightning Trail',
    description: 'Unleash crackling electric bolts that branch and flicker behind you.',
    icon: '🌩️',
    cost: 3500,
    maxLevel: 1,
  },
};

export const ENHANCEMENTS = Object.values(SHOP_ITEMS).filter(
  (item) => item.category === 'enhancement'
);
export const CONSUMABLES = Object.values(SHOP_ITEMS).filter(
  (item) => item.category === 'consumable'
);
export const COSMETICS = Object.values(SHOP_ITEMS).filter(
  (item) => item.category === 'cosmetic'
);
