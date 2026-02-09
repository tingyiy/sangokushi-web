import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { City } from '../types';

/**
 * DomesticStatusPanel Component - Phase 7.7
 * Displays a summary table of all cities owned by the player faction.
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SortKey = keyof Pick<City, 'name' | 'population' | 'gold' | 'food' | 'commerce' | 'agriculture' | 'defense' | 'troops' | 'morale' | 'training'>;

export function DomesticStatusPanel({ isOpen, onClose }: Props) {
  const { cities, playerFaction } = useGameStore();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const ownCities = useMemo(() => {
    const list = cities.filter(c => c.factionId === playerFaction?.id);
    return [...list].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      const numA = valA as number;
      const numB = valB as number;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });
  }, [cities, playerFaction, sortKey, sortOrder]);

  if (!isOpen) return null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="status-panel-overlay">
      <div className="status-panel">
        <div className="panel-header">
          <h3>全勢力狀況一覽</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="panel-body">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>城市名 {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('population')}>人口 {sortKey === 'population' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('gold')}>金錢 {sortKey === 'gold' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('food')}>糧草 {sortKey === 'food' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('commerce')}>商業 {sortKey === 'commerce' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('agriculture')}>農業 {sortKey === 'agriculture' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('defense')}>防禦 {sortKey === 'defense' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('troops')}>士兵 {sortKey === 'troops' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('morale')}>士氣 {sortKey === 'morale' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('training')}>訓練 {sortKey === 'training' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody>
              {ownCities.map((city: City) => (
                <tr key={city.id}>
                  <td>{city.name}</td>
                  <td>{city.population.toLocaleString()}</td>
                  <td>{city.gold.toLocaleString()}</td>
                  <td>{city.food.toLocaleString()}</td>
                  <td>{city.commerce}</td>
                  <td>{city.agriculture}</td>
                  <td>{city.defense}</td>
                  <td>{city.troops.toLocaleString()}</td>
                  <td>{city.morale}</td>
                  <td>{city.training}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .status-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .status-panel {
          background: #1a1a2e;
          width: 90vw;
          max-height: 80vh;
          border: 2px solid #4a6a8a;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          color: white;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          padding: 15px 20px;
          background: #2a4a6a;
          border-bottom: 1px solid #4a6a8a;
        }
        .panel-body {
          padding: 20px;
          overflow-y: auto;
        }
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 10px;
          text-align: right;
          border-bottom: 1px solid #333;
        }
        th {
          background: #222;
          color: #aaa;
        }
        tr:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        td:first-child, th:first-child {
          text-align: left;
        }
      `}</style>
    </div>
  );
}
