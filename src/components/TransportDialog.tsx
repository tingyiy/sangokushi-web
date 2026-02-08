import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface Props {
  toCityId: number;
  onClose: () => void;
}

export function TransportDialog({ toCityId, onClose }: Props) {
  const { selectedCityId, cities, transport } = useGameStore();
  const fromCity = cities.find(c => c.id === selectedCityId);
  const toCity = cities.find(c => c.id === toCityId);
  
  const [resource, setResource] = useState<'gold' | 'food' | 'troops'>('gold');
  const [amount, setAmount] = useState<number>(0);

  const handleTransport = () => {
    if (!fromCity || !toCity || amount <= 0) return;
    transport(fromCity.id, toCity.id, resource, amount);
    onClose();
  };

  if (!fromCity || !toCity) return null;

  const maxAmount = fromCity[resource];

  return (
    <div className="modal-overlay">
      <div className="modal-content transport-dialog">
        <h3>資源輸送：{toCity.name}</h3>
        
        <div className="input-group">
          <label>資源類型</label>
          <select value={resource} onChange={(e) => {
            setResource(e.target.value as 'gold' | 'food' | 'troops');
            setAmount(0);
          }}>
            <option value="gold">金 (現有: {fromCity.gold})</option>
            <option value="food">糧 (現有: {fromCity.food})</option>
            <option value="troops">兵 (現有: {fromCity.troops})</option>
          </select>
        </div>

        <div className="input-group">
          <label>輸送數量</label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(Math.min(maxAmount, Math.max(0, parseInt(e.target.value) || 0)))}
            max={maxAmount}
            min={0}
          />
          <div className="slider">
             <input 
                type="range" 
                min="0" 
                max={maxAmount} 
                value={amount} 
                onChange={(e) => setAmount(parseInt(e.target.value))} 
             />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>取消</button>
          <button className="btn btn-confirm" onClick={handleTransport} disabled={amount <= 0}>
            輸送
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
