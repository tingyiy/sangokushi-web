import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { UnitType } from '../types/battle';

interface Props {
  targetCityId: number;
  onClose: () => void;
}

export function FormationDialog({ targetCityId, onClose }: Props) {
  const { 
    selectedCityId, cities, officers, playerFaction, startBattle, setBattleFormation 
  } = useGameStore();
  
  const city = cities.find(c => c.id === selectedCityId);
  const targetCity = cities.find(c => c.id === targetCityId);
  
  const cityOfficers = officers.filter(o => o.cityId === selectedCityId && o.factionId === playerFaction?.id && o.stamina >= 30);
  
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<number[]>([]);
  const [unitTypes, setUnitTypes] = useState<Record<number, UnitType>>({});

  const toggleOfficer = (id: number) => {
    if (selectedOfficerIds.includes(id)) {
      setSelectedOfficerIds(selectedOfficerIds.filter(oid => oid !== id));
    } else if (selectedOfficerIds.length < 5) {
      setSelectedOfficerIds([...selectedOfficerIds, id]);
      if (!unitTypes[id]) {
        setUnitTypes({ ...unitTypes, [id]: 'infantry' });
      }
    }
  };

  const handleUnitTypeChange = (officerId: number, type: UnitType) => {
    setUnitTypes({ ...unitTypes, [officerId]: type });
  };

  const handleStart = () => {
    if (selectedOfficerIds.length === 0) return;
    
    setBattleFormation({
      officerIds: selectedOfficerIds,
      unitTypes: selectedOfficerIds.map(id => unitTypes[id] || 'infantry'),
    });
    
    startBattle(targetCityId);
    onClose();
  };

  if (!city || !targetCity) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content formation-dialog">
        <h3>出征準備：{targetCity.name}</h3>
        <p>選擇參戰武將（最多5人，體力需30以上）</p>
        
        <div className="officer-selection-list">
          {cityOfficers.map(o => (
            <div key={o.id} className={`officer-item ${selectedOfficerIds.includes(o.id) ? 'selected' : ''}`} onClick={() => toggleOfficer(o.id)}>
              <div className="officer-info">
                <span className="name">{o.name}</span>
                <span className="stats">統 {o.leadership} 武 {o.war} 智 {o.intelligence}</span>
              </div>
              {selectedOfficerIds.includes(o.id) && (
                <select 
                  value={unitTypes[o.id] || 'infantry'} 
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleUnitTypeChange(o.id, e.target.value as UnitType)}
                >
                  <option value="infantry">步兵</option>
                  <option value="cavalry" disabled={city.warHorses < 1000}>騎兵 (需軍馬)</option>
                  <option value="archer" disabled={city.crossbows < 1000}>弓兵 (需弩)</option>
                </select>
              )}
            </div>
          ))}
          {cityOfficers.length === 0 && <p>城中無可用將領（體力不足或無人在城）。</p>}
        </div>

        <div className="resource-info">
          <span>持有武器：</span>
          <span>軍馬: {city.warHorses}</span>
          <span>弩: {city.crossbows}</span>
        </div>

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>取消</button>
          <button className="btn btn-confirm" onClick={handleStart} disabled={selectedOfficerIds.length === 0}>
            確認出陣
          </button>
        </div>
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #2a2a2a;
          color: white;
          padding: 20px;
          border-radius: 8px;
          width: 400px;
          max-width: 90vw;
          border: 2px solid #555;
        }
        .officer-selection-list {
          max-height: 300px;
          overflow-y: auto;
          margin: 15px 0;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
        }
        .officer-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid #444;
          cursor: pointer;
        }
        .officer-item:hover { background: rgba(255,255,255,0.1); }
        .officer-item.selected { background: rgba(70, 130, 180, 0.4); }
        .officer-info { display: flex; flex-direction: column; }
        .officer-info .name { font-weight: bold; }
        .officer-info .stats { font-size: 0.85em; color: #ccc; }
        .resource-info {
          font-size: 0.9em;
          color: #aaa;
          margin-bottom: 15px;
          display: flex;
          gap: 15px;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        select {
          background: #333;
          color: white;
          border: 1px solid #666;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
