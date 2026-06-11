# Economy System Implementation Summary

## Overview
The economy system has been fully implemented with Category 1 (Enhancements) and Category 2 (Consumables), integrated into the game state and player mechanics.

---

## 1. Refactored Inventory State

### `types/game.ts`
```typescript
export interface GameStore {
  // ... existing fields
  inventory: Record<string, number>; // itemId -> count/level
  
  addCurrency: (amount: number) => void;
  unlockItem: (itemId: string, cost: number, maxLevel: number) => boolean;
  consumeItem: (itemId: string) => void;
  setIsShieldActive: (active: boolean) => void;
  enterGarage: () => void;
  exitGarage: () => void;
  // ... other actions
}
```

### `useGameStore.ts`
```typescript
// ── Inventory helpers ──────────────────────────────────────────
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

// ── Shop ──────────────────────────────────────────────────────
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

enterGarage: () => {
  set({ gameState: 'GARAGE' });
},

exitGarage: () => {
  set({ gameState: 'MENU' });
},
```

---

## 2. Category 1: Enhancements

### **Electromagnet (`enhancement_magnet`)**
Location: `Player.tsx` (lines 109-111)
```typescript
// ── Electromagnet: dynamic token magnet radius (base 1.2 + 0.5 per level, max level 5) ──
const magnetLevel = Math.min(inventory['enhancement_magnet'] || 0, 5);
const magnetRadius = 1.2 + (magnetLevel * 0.5);

// Token collection with dynamic radius
const dx = pos.x - obsX;
const dz = 0 - obsZ;
const distance = Math.sqrt(dx * dx + dz * dz);
if (distance < magnetRadius) {
  removeObstacle(obs.id);
  useGameStore.getState().addCurrency(1);
  gameAudio.playCoin();
}
```

**Progression:**
- Level 0: 1.2 unit radius
- Level 1: 1.7 unit radius
- Level 2: 2.2 unit radius
- Level 3: 2.7 unit radius
- Level 4: 3.2 unit radius
- Level 5 (MAX): 3.7 unit radius

---

### **Overdrive Thrusters (`enhancement_speed`)**
Location: `useGameStore.ts` (startGame & tick)
```typescript
startGame: () => {
  const { inventory } = get();
  // Overdrive Thrusters: each level adds 0.2 to the starting speed
  const speedBonus = (inventory['enhancement_speed'] || 0) * 0.2;
  set({
    gameState: 'PLAYING',
    score: 0,
    speed: BASE_SPEED + speedBonus, // BASE_SPEED = 18
    // ... other initialization
  });
},

// Also applied in tick() for progressive speed scaling
tick: (dt) => {
  const speedBonus = (inventory['enhancement_speed'] || 0) * 0.2;
  const effectiveBase = BASE_SPEED + speedBonus;
  const speedGained = Math.floor(newScore / 150) * 1.0;
  const newSpeed = Math.min(MAX_SPEED, effectiveBase + speedGained);
  // ...
}
```

**Progression:**
- Level 0: 18 base speed
- Level 1: 18.2 base speed
- Level 2: 18.4 base speed
- Level 3: 18.6 base speed
- Level 4: 18.8 base speed
- Level 5 (MAX): 19.0 base speed

---

## 3. Category 2: Consumables

### **Titanium Plating (`consumable_shield`)**
Location: `Player.tsx` (lines 142-161)
```typescript
// ── Shield (Titanium Plating) ──
const isInvulnerable = useRef(false);
const shieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Reset flags on new game start
useEffect(() => {
  if (gameState === 'PLAYING') {
    isDead.current = false;
    isProcessingHit.current = false;
    isInvulnerable.current = false;
    if (shieldTimerRef.current) {
      clearTimeout(shieldTimerRef.current);
      shieldTimerRef.current = null;
    }
  }
}, [gameState]);

// Cleanup timer on unmount
useEffect(() => {
  return () => {
    if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
  };
}, []);

// In collision handling (HURDLE/BARRICADE/OVERHEAD):
if (obs.type === 'HURDLE' || obs.type === 'BARRICADE' || obs.type === 'OVERHEAD') {
  // ── Shield check: if invulnerable, ignore crash ──
  if (isInvulnerable.current) return;
  if (isDead.current) return;

  // ── Titanium Plating: consume shield to survive ──
  const currentShields = useGameStore.getState().inventory['consumable_shield'] || 0;
  if (currentShields > 0) {
    useGameStore.getState().consumeItem('consumable_shield');
    gameAudio.playShieldBreak();
    useGameStore.getState().setIsShieldActive(true);
    isInvulnerable.current = true;
    // 1.5 seconds of invulnerability
    shieldTimerRef.current = setTimeout(() => {
      isInvulnerable.current = false;
      useGameStore.getState().setIsShieldActive(false);
      shieldTimerRef.current = null;
    }, 1500);
    return; // Do NOT set isDead — survive the hit
  }

  isDead.current = true;
  gameAudio.playCrash();
  gameOver();
  return;
}
```

**Shield Mechanics:**
- Uses one shield per collision
- Grants 1.5 seconds of invulnerability
- Player phases through the current obstacle
- Visual feedback: green glow on player
- Sound effect: metallic descending "shield break" tone
- Can stack up to 99 shields

---

## 4. Shop Data & Garage UI

### `data/shopItems.ts`
```typescript
export const SHOP_ITEMS: Record<string, ShopItem> = {
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
  consumable_shield: {
    id: 'consumable_shield',
    category: 'consumable',
    name: 'Titanium Plating',
    description: 'Absorbs one fatal collision, granting 1.5s invulnerability. Stackable.',
    icon: '🛡️',
    cost: 100,
    maxLevel: 99,
  },
};
```

### `Garage.tsx`
- Displays two sections: ENHANCEMENTS and CONSUMABLES
- Shows item icon, name, description, and cost
- For enhancements: displays current level (e.g., "Lvl 2/5")
- For consumables: displays quantity (e.g., "Qty: 3")
- Currency display at the top showing total "Bolts"
- Purchase buttons with status:
  - "BUY" when affordable and not maxed
  - "MAXED" when enhancement reaches max level
  - "FULL" when consumable reaches max stack
  - "LOW $" when can't afford
- Responsive grid layout
- Styled with cyan/neon theme matching the game

---

## 5. Navigation & State Management

### Updated Game States
```typescript
export type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER' | 'GARAGE';
```

### MainMenu Updates
- Added "GARAGE" button with secondary neon-pink styling
- Button triggers `enterGarage()` action

### App.tsx Updates
- Imported Garage component
- Added conditional render: `{gameState === 'GARAGE' && <Garage />}`

### Garage Component Navigation
- "BACK TO MENU" button calls `exitGarage()` which returns to MENU state

---

## 6. Audio Effects

### AudioManager.tsx
```typescript
export const gameAudio = {
  // ... existing methods
  playShieldBreak: () => {
    window.dispatchEvent(new CustomEvent('game-audio-trigger', { detail: 'shieldbreak' }));
  },
};

// Web Audio synth fallback for shield break
// Metallic high ping that descends — shield absorbing an impact
osc.type = 'sine';
osc.frequency.setValueAtTime(1800, now);
osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);
gainNode.gain.setValueAtTime(0.25, now);
gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
osc.start(now);
osc.stop(now + 0.4);
```

---

## 7. File Structure

```
src/
├── components/
│   ├── Player.tsx            (Enhanced token magnet + shield logic)
│   ├── Garage.tsx            (NEW - Shop UI component)
│   ├── MainMenu.tsx          (Added Garage button)
│   └── AudioManager.tsx      (Added playShieldBreak)
├── data/
│   └── shopItems.ts          (NEW - Shop item definitions)
├── state/
│   └── useGameStore.ts       (Enhanced with unlockItem, consumeItem, enterGarage, exitGarage)
├── types/
│   └── game.ts               (Added GARAGE state, updated interfaces)
├── styles/
│   ├── ui.css                (Added .btn-secondary)
│   └── garage.css            (NEW - Garage component styling)
└── App.tsx                   (Added Garage rendering)
```

---

## 8. LocalStorage Keys

```
cityrun_currency    - Player's current bolt balance
cityrun_inventory   - JSON stringified Record<itemId, level/count>
cityrun_highscore   - Player's best score
```

---

## Summary of Implementation

✅ **Inventory State**: Refactored to `Record<string, number>` with proper persistence
✅ **Electromagnet**: Dynamic token radius (1.2 + 0.5×level, max 5)
✅ **Overdrive Thrusters**: Speed bonus (+0.2 per level, max 5)
✅ **Titanium Plating**: Shield consumable (1 per use, 1.5s invulnerability, stackable to 99)
✅ **Garage UI**: Complete shop interface with categorized items
✅ **Navigation**: Menu → Garage → Menu flow
✅ **Audio**: Shield break sound effect
✅ **Persistence**: All items and currency saved to localStorage

All code compiles successfully with no errors.
