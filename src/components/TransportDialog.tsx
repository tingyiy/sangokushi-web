import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';

interface Props {
  toCityId: number;
  onClose: () => void;
}

export function TransportDialog({ toCityId, onClose }: Props) {
  const { t } = useTranslation();
  const { selectedCityId, cities, officers, playerFaction, transport } = useGameStore();
  const fromCity = cities.find(c => c.id === selectedCityId);
  const toCity = cities.find(c => c.id === toCityId);

  // Available officers: own faction, in source city, not yet acted
  const availableOfficers = fromCity
    ? officers.filter(o => o.cityId === fromCity.id && o.factionId === playerFaction?.id && !o.acted)
    : [];
  
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(
    availableOfficers.length > 0 ? availableOfficers[0].id : null
  );
  const [gold, setGold] = useState<number>(0);
  const [food, setFood] = useState<number>(0);
  const [troops, setTroops] = useState<number>(0);

  const handleTransport = () => {
    if (!fromCity || !toCity || !selectedOfficerId) return;
    const resources: { gold?: number; food?: number; troops?: number } = {};
    if (gold > 0) resources.gold = gold;
    if (food > 0) resources.food = food;
    if (troops > 0) resources.troops = troops;
    if (Object.keys(resources).length === 0) return;
    transport(fromCity.id, toCity.id, resources, selectedOfficerId);
    onClose();
  };

  if (!fromCity || !toCity) return null;

  const hasAny = gold > 0 || food > 0 || troops > 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content transport-dialog">
        <h3>{t('transport.title', { cityName: localizedName(toCity.name) })}</h3>

        <div className="input-group">
          <label>{t('transport.officer')}</label>
          {availableOfficers.length === 0 ? (
            <span style={{ color: '#ff6b6b' }}>{t('transport.noOfficer')}</span>
          ) : (
            <select
              value={selectedOfficerId ?? ''}
              onChange={(e) => setSelectedOfficerId(parseInt(e.target.value))}
            >
              {availableOfficers.map(o => (
                <option key={o.id} value={o.id}>
                  {localizedName(o.name)}（{t('stat.leadership')}{o.leadership} {t('stat.war')}{o.war}）
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className="input-group">
          <label>{t('transport.goldOption', { amount: fromCity.gold })}</label>
          <input 
            type="number" 
            value={gold} 
            onChange={(e) => setGold(Math.min(fromCity.gold, Math.max(0, parseInt(e.target.value) || 0)))}
            max={fromCity.gold}
            min={0}
          />
          <div className="slider">
            <input type="range" min="0" max={fromCity.gold} value={gold} onChange={(e) => setGold(parseInt(e.target.value))} />
          </div>
        </div>

        <div className="input-group">
          <label>{t('transport.foodOption', { amount: fromCity.food })}</label>
          <input 
            type="number" 
            value={food} 
            onChange={(e) => setFood(Math.min(fromCity.food, Math.max(0, parseInt(e.target.value) || 0)))}
            max={fromCity.food}
            min={0}
          />
          <div className="slider">
            <input type="range" min="0" max={fromCity.food} value={food} onChange={(e) => setFood(parseInt(e.target.value))} />
          </div>
        </div>

        <div className="input-group">
          <label>{t('transport.troopsOption', { amount: fromCity.troops })}</label>
          <input 
            type="number" 
            value={troops} 
            onChange={(e) => setTroops(Math.min(fromCity.troops, Math.max(0, parseInt(e.target.value) || 0)))}
            max={fromCity.troops}
            min={0}
          />
          <div className="slider">
            <input type="range" min="0" max={fromCity.troops} value={troops} onChange={(e) => setTroops(parseInt(e.target.value))} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-confirm" onClick={handleTransport} disabled={!hasAny || !selectedOfficerId}>
            {t('transport.confirm')}
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
          width: 350px;
          border: 2px solid #555;
        }
        .input-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        input[type="number"], select {
          background: #333;
          color: white;
          border: 1px solid #666;
          padding: 8px;
          border-radius: 4px;
        }
        .slider { margin-top: 5px; }
        .slider input { width: 100%; }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}
