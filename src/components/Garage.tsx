import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { ENHANCEMENTS, CONSUMABLES, COSMETICS, SHOP_ITEMS } from '../data/shopItems';
import '../styles/garage.css';

interface ShopItemDisplayProps {
  itemId: string;
  onPurchase: (itemId: string, cost: number, maxLevel: number) => void;
}

interface CosmeticItemDisplayProps {
  itemId: string;
  onPurchase: (itemId: string, cost: number) => void;
}

const CosmeticItemDisplay: React.FC<CosmeticItemDisplayProps> = ({ itemId, onPurchase }) => {
  const item = SHOP_ITEMS[itemId];
  const currency = useGameStore((state) => state.currency);
  const inventory = useGameStore((state) => state.inventory);
  const equippedTrail = useGameStore((state) => state.equippedTrail);
  const unlockItem = useGameStore((state) => state.unlockItem);
  const equipTrail = useGameStore((state) => state.equipTrail);

  const isOwned = (inventory[itemId] || 0) > 0;
  const isEquipped = equippedTrail === itemId;
  const canAfford = currency >= item.cost;

  const handlePurchase = () => {
    if (!isOwned && canAfford) {
      const success = unlockItem(itemId, item.cost, item.maxLevel);
      if (success) {
        onPurchase(itemId, item.cost);
        // Auto-equip on purchase
        equipTrail(itemId);
      }
    }
  };

  const handleEquip = () => {
    if (isOwned && !isEquipped) {
      equipTrail(itemId);
    } else if (isEquipped) {
      equipTrail(null);
    }
  };

  return (
    <div className="shop-item cosmetic-item">
      <div className="shop-item-header">
        <span className="shop-item-icon">{item.icon}</span>
        <div className="shop-item-title">
          <h3 className="shop-item-name">{item.name}</h3>
          <span className={`cosmetic-status ${isEquipped ? 'equipped' : isOwned ? 'owned' : ''}`}>
            {isEquipped ? '✓ EQUIPPED' : isOwned ? 'Owned' : 'Unowned'}
          </span>
        </div>
      </div>

      <p className="shop-item-description">{item.description}</p>

      <div className="shop-item-footer">
        {!isOwned && (
          <>
            <div className="shop-item-cost">
              <span className="cost-icon">💰</span>
              <span className={`cost-amount ${!canAfford ? 'insufficient' : ''}`}>
                {item.cost}
              </span>
            </div>
            <button
              className={`btn-purchase ${!canAfford ? 'disabled' : ''}`}
              onClick={handlePurchase}
              disabled={!canAfford}
            >
              {canAfford ? 'BUY' : 'LOW $'}
            </button>
          </>
        )}
        {isOwned && (
          <button
            className={`btn-equip ${isEquipped ? 'equipped' : ''}`}
            onClick={handleEquip}
          >
            {isEquipped ? 'UNEQUIP' : 'EQUIP'}
          </button>
        )}
      </div>
    </div>
  );
};

const ShopItemDisplay: React.FC<ShopItemDisplayProps> = ({ itemId, onPurchase }) => {
  const item = SHOP_ITEMS[itemId];
  const currency = useGameStore((state) => state.currency);
  const inventory = useGameStore((state) => state.inventory);
  const unlockItem = useGameStore((state) => state.unlockItem);

  const currentLevel = inventory[itemId] || 0;
  const isMaxed = currentLevel >= item.maxLevel;
  const canAfford = currency >= item.cost;
  const isDisabled = isMaxed || !canAfford;

  const handlePurchase = () => {
    if (!isDisabled) {
      const success = unlockItem(itemId, item.cost, item.maxLevel);
      if (success) {
        onPurchase(itemId, item.cost, item.maxLevel);
      }
    }
  };

  return (
    <div className="shop-item">
      <div className="shop-item-header">
        <span className="shop-item-icon">{item.icon}</span>
        <div className="shop-item-title">
          <h3 className="shop-item-name">{item.name}</h3>
          {item.category === 'enhancement' && (
            <span className="shop-item-level">Lvl {currentLevel}/{item.maxLevel}</span>
          )}
          {item.category === 'consumable' && (
            <span className="shop-item-quantity">Qty: {currentLevel}</span>
          )}
        </div>
      </div>

      <p className="shop-item-description">{item.description}</p>

      <div className="shop-item-footer">
        <div className="shop-item-cost">
          <span className="cost-icon">💰</span>
          <span className={`cost-amount ${!canAfford && !isMaxed ? 'insufficient' : ''}`}>
            {item.cost}
          </span>
        </div>
        <button
          className={`btn-purchase ${isDisabled ? 'disabled' : ''}`}
          onClick={handlePurchase}
          disabled={isDisabled}
        >
          {isMaxed && item.category === 'enhancement' && 'MAXED'}
          {isMaxed && item.category === 'consumable' && 'FULL'}
          {!isMaxed && canAfford && 'BUY'}
          {!isMaxed && !canAfford && 'LOW $'}
        </button>
      </div>
    </div>
  );
};

export const Garage: React.FC = () => {
  const returnToMenu = useGameStore((state) => state.returnToMenu);
  const currency = useGameStore((state) => state.currency);

  const handlePurchase = (itemId: string, cost: number, _maxLevel?: number) => {
    console.log(`Purchased ${itemId}. Cost: ${cost}`);
  };

  return (
    <div className="garage-overlay">
      <div className="garage-panel">
        <div className="garage-header">
          <h1 className="garage-title">GARAGE</h1>
          <button className="btn-close" onClick={returnToMenu}>✕</button>
        </div>

        <div className="garage-currency">
          <span className="currency-icon">💰</span>
          <span className="currency-amount">{Math.floor(currency)}</span>
          <span className="currency-label">Bolts</span>
        </div>

        {/* Enhancements Section */}
        <section className="garage-section">
          <h2 className="section-title">⚙️ ENHANCEMENTS</h2>
          <p className="section-description">Permanent upgrades that stack across runs</p>
          <div className="shop-grid">
            {ENHANCEMENTS.map((enhancement) => (
              <ShopItemDisplay
                key={enhancement.id}
                itemId={enhancement.id}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </section>

        {/* Consumables Section */}
        <section className="garage-section">
          <h2 className="section-title">🔧 CONSUMABLES</h2>
          <p className="section-description">Single-use items that refresh your inventory each run</p>
          <div className="shop-grid">
            {CONSUMABLES.map((consumable) => (
              <ShopItemDisplay
                key={consumable.id}
                itemId={consumable.id}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </section>

        {/* Cosmetics Section */}
        <section className="garage-section">
          <h2 className="section-title">🎨 COSMETICS</h2>
          <p className="section-description">Vehicle trails and visual effects</p>
          <div className="shop-grid">
            {COSMETICS.map((cosmetic) => (
              <CosmeticItemDisplay
                key={cosmetic.id}
                itemId={cosmetic.id}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </section>

        <div className="garage-footer">
          <button className="btn-neon" onClick={returnToMenu}>
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
