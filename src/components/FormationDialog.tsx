import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';
import { getMaxTroops } from '../utils/officers';
import type { UnitType } from '../types/battle';

interface Props {
  targetCityId: number;
  onClose: () => void;
}

export function FormationDialog({ targetCityId, onClose }: Props) {
  const { t } = useTranslation();
  const { 
    selectedCityId, cities, officers, playerFaction, startBattle, setBattleFormation 
  } = useGameStore();
  
  const city = cities.find(c => c.id === selectedCityId);
  const targetCity = cities.find(c => c.id === targetCityId);
  
  const cityOfficers = officers.filter(o => o.cityId === selectedCityId && o.factionId === playerFaction?.id && !o.acted);
  
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<number[]>([]);
  const [unitTypes, setUnitTypes] = useState<Record<number, UnitType>>({});
  const [troopCounts, setTroopCounts] = useState<Record<number, number>>({});

  /** Max troops an officer can lead (rank-based cap) */
  const maxTroopsForOfficer = useCallback((officerId: number) => {
    const off = officers.find(o => o.id === officerId);
    if (!off) return 5000;
    const isRuler = off.id === playerFaction?.rulerId;
    return getMaxTroops(off, isRuler);
  }, [officers, playerFaction]);

  /** Total troops allocated to all selected officers */
  const totalAllocated = useMemo(() => {
    return selectedOfficerIds.reduce((sum, id) => sum + (troopCounts[id] || 0), 0);
  }, [selectedOfficerIds, troopCounts]);

  /** Remaining garrison after allocation */
  const remaining = (city?.troops ?? 0) - totalAllocated;

  /** Recalculate default troop shares for all selected officers */
  const recalcDefaults = useCallback((ids: number[]) => {
    if (!city) return {};
    const numOfficers = ids.length;
    if (numOfficers === 0) return {};
    const equalShare = Math.floor(city.troops / numOfficers);
    const newCounts: Record<number, number> = {};
    for (const id of ids) {
      newCounts[id] = Math.min(equalShare, maxTroopsForOfficer(id));
    }
    return newCounts;
  }, [city, maxTroopsForOfficer]);

  const toggleOfficer = (id: number) => {
    if (selectedOfficerIds.includes(id)) {
      const newIds = selectedOfficerIds.filter(oid => oid !== id);
      setSelectedOfficerIds(newIds);
      // Recalculate defaults for remaining officers
      setTroopCounts(recalcDefaults(newIds));
    } else if (selectedOfficerIds.length < 5) {
      const newIds = [...selectedOfficerIds, id];
      setSelectedOfficerIds(newIds);
      if (!unitTypes[id]) {
        setUnitTypes({ ...unitTypes, [id]: 'infantry' });
      }
      // Recalculate defaults for all officers including new one
      setTroopCounts(recalcDefaults(newIds));
    }
  };

  const handleUnitTypeChange = (officerId: number, type: UnitType) => {
    setUnitTypes({ ...unitTypes, [officerId]: type });
  };

  const handleTroopChange = (officerId: number, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      setTroopCounts({ ...troopCounts, [officerId]: 0 });
      return;
    }
    const max = maxTroopsForOfficer(officerId);
    setTroopCounts({ ...troopCounts, [officerId]: Math.min(num, max) });
  };

  const handleStart = () => {
    if (selectedOfficerIds.length === 0) return;
    if (remaining < 0) return; // Over-allocated
    
    setBattleFormation({
      officerIds: selectedOfficerIds,
      unitTypes: selectedOfficerIds.map(id => unitTypes[id] || 'infantry'),
      troops: selectedOfficerIds.map(id => troopCounts[id] || 0),
    });
    
    startBattle(targetCityId);
    onClose();
  };

  if (!city || !targetCity) return null;

  const overAllocated = remaining < 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content formation-dialog">
        <h3>{t('formation.title', { cityName: localizedName(targetCity.name) })}</h3>
        <p>{t('formation.selectPrompt')}</p>
        
        <div className="officer-selection-list">
          {cityOfficers.map(o => {
            const isSelected = selectedOfficerIds.includes(o.id);
            const maxTroop = maxTroopsForOfficer(o.id);
            return (
              <div key={o.id} className={`officer-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleOfficer(o.id)}>
                <div className="officer-info">
                  <span className="name">{localizedName(o.name)}</span>
                  <span className="stats">{t('formation.officerStats', { leadership: o.leadership, war: o.war, intelligence: o.intelligence })}</span>
                </div>
                {isSelected && (
                  <div className="officer-controls" onClick={(e) => e.stopPropagation()}>
                    <select 
                      value={unitTypes[o.id] || 'infantry'} 
                      onChange={(e) => handleUnitTypeChange(o.id, e.target.value as UnitType)}
                    >
                      <option value="infantry">{t('unitType.infantry')}</option>
                      <option value="cavalry" disabled={city.warHorses < 1000}>{t('unitType.cavalry')}</option>
                      <option value="archer" disabled={city.crossbows < 1000}>{t('unitType.archer')}</option>
                    </select>
                    <div className="troop-input-group">
                      <input
                        type="number"
                        min={0}
                        max={maxTroop}
                        step={100}
                        value={troopCounts[o.id] || 0}
                        onChange={(e) => handleTroopChange(o.id, e.target.value)}
                        className="troop-input"
                      />
                      <span className="troop-max">/ {maxTroop.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {cityOfficers.length === 0 && <p>{t('formation.noOfficers')}</p>}
        </div>

        <div className="resource-info">
          <span>{t('formation.garrisonTroops', { count: city.troops.toLocaleString() } as Record<string, unknown>)}</span>
          <span className={overAllocated ? 'over-allocated' : ''}>
            {t('formation.allocatedRemaining', { allocated: totalAllocated.toLocaleString(), remaining: remaining.toLocaleString() } as Record<string, unknown>)}
          </span>
        </div>
        <div className="resource-info">
          <span>{t('formation.weaponsHeld')}</span>
          <span>{t('formation.warHorseCount', { count: city.warHorses })}</span>
          <span>{t('formation.crossbowCount', { count: city.crossbows })}</span>
        </div>

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button
            className="btn btn-confirm"
            onClick={handleStart}
            disabled={selectedOfficerIds.length === 0 || overAllocated || totalAllocated <= 0}
          >
            {t('formation.confirmBattle')}
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
          width: 480px;
          max-width: 95vw;
          border: 2px solid #555;
        }
        .officer-selection-list {
          max-height: 350px;
          overflow-y: auto;
          margin: 15px 0;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
        }
        .officer-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #444;
          cursor: pointer;
          min-height: 44px;
        }
        .officer-item:hover { background: rgba(255,255,255,0.1); }
        .officer-item.selected { background: rgba(70, 130, 180, 0.4); }
        .officer-info { display: flex; flex-direction: column; min-width: 120px; }
        .officer-info .name { font-weight: bold; }
        .officer-info .stats { font-size: 0.85em; color: #ccc; }
        .officer-controls {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
        }
        .troop-input-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .troop-input {
          width: 72px;
          background: #333;
          color: white;
          border: 1px solid #666;
          border-radius: 4px;
          padding: 2px 4px;
          text-align: right;
          font-size: 0.85em;
        }
        .troop-input::-webkit-inner-spin-button,
        .troop-input::-webkit-outer-spin-button {
          opacity: 1;
        }
        .troop-max {
          font-size: 0.75em;
          color: #999;
          min-width: 60px;
        }
        .resource-info {
          font-size: 0.9em;
          color: #aaa;
          margin-bottom: 8px;
          display: flex;
          gap: 15px;
        }
        .over-allocated { color: #ff6b6b; font-weight: bold; }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }
        select {
          background: #333;
          color: white;
          border: 1px solid #666;
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 0.85em;
        }
      `}</style>
    </div>
  );
}
