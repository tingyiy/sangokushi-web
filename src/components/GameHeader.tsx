import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import SaveLoadMenu from './SaveLoadMenu';

/**
 * GameHeader Component
 * Displays game status and provides access to save/load functionality.
 * Phase 0.2: Integrated save/load buttons.
 * Phase 7.7: Added Domestic Status Panel.
 */
interface Props {
  onShowStatus: () => void;
}

export function GameHeader({ onShowStatus }: Props) {
  const { year, month, playerFaction, cities, officers } = useGameStore();
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);

  const ownCities = cities.filter(c => c.factionId === playerFaction?.id);
  const totalTroops = ownCities.reduce((s, c) => s + c.troops, 0);
  const totalGold = ownCities.reduce((s, c) => s + c.gold, 0);
  const totalFood = ownCities.reduce((s, c) => s + c.food, 0);
  const officerCount = officers.filter(o => o.factionId === playerFaction?.id).length;

  return (
    <>
      <div className="game-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#1a1a2e', color: '#fff' }}>
        <div className="header-left" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span className="header-date" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{year}年{month}月</span>
          <span className="header-faction" style={{ color: playerFaction?.color || '#fff', fontSize: '1.1rem' }}>
            {playerFaction?.name}
          </span>
        </div>
        
        <div className="header-center" style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={onShowStatus}
            style={{
              padding: '5px 15px',
              background: '#2a6a4a',
              color: '#fff',
              border: '1px solid #4a8a6a',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            情報
          </button>
          <button
            onClick={() => setShowSaveMenu(true)}
            style={{
              padding: '5px 15px',
              background: '#2a4a6a',
              color: '#fff',
              border: '1px solid #4a6a8a',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            儲存
          </button>
          <button
            onClick={() => setShowLoadMenu(true)}
            style={{
              padding: '5px 15px',
              background: '#4a4a5a',
              color: '#fff',
              border: '1px solid #6a6a7a',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            載入
          </button>
        </div>

        <div className="header-right" style={{ display: 'flex', gap: '15px' }}>
          <span>城{ownCities.length}</span>
          <span>將{officerCount}</span>
          <span>兵{totalTroops.toLocaleString()}</span>
          <span>金{totalGold.toLocaleString()}</span>
          <span>糧{totalFood.toLocaleString()}</span>
        </div>
      </div>

      <SaveLoadMenu
        isOpen={showSaveMenu}
        onClose={() => setShowSaveMenu(false)}
        mode="save"
      />
      <SaveLoadMenu
        isOpen={showLoadMenu}
        onClose={() => setShowLoadMenu(false)}
        mode="load"
      />
    </>
  );
}
