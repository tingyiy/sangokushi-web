import { useGameStore } from '../store/gameStore';
import type { Officer } from '../types';

/**
 * GovernorAssignmentModal Component - Phase 7.9
 * Forced modal at turn start if a city lacks a governor.
 */
export function GovernorAssignmentModal() {
  const { cities, officers, playerFaction, pendingGovernorAssignmentCityId, appointGovernor } = useGameStore();

  if (pendingGovernorAssignmentCityId === null) return null;

  const city = cities.find(c => c.id === pendingGovernorAssignmentCityId);
  const eligibleOfficers = officers.filter(o => o.cityId === pendingGovernorAssignmentCityId && o.factionId === playerFaction?.id);

  const handleAppoint = (officerId: number) => {
    appointGovernor(pendingGovernorAssignmentCityId, officerId);
    
    // Check for NEXT city without gov
    const nextCity = cities.find(c => {
        if (c.factionId !== playerFaction?.id) return false;
        if (c.id === pendingGovernorAssignmentCityId) return false; // Already handled
        const hasGov = officers.some(o => o.cityId === c.id && o.factionId === playerFaction?.id && o.isGovernor);
        const hasAnyOfficer = officers.some(o => o.cityId === c.id && o.factionId === playerFaction?.id);
        return !hasGov && hasAnyOfficer;
    });

    useGameStore.setState({ pendingGovernorAssignmentCityId: nextCity?.id || null });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>任命太守</h3>
        <p>{city?.name} 目前沒有太守，請從以下武將中挑選一位擔任：</p>
        
        <div className="officer-selection-list">
          {eligibleOfficers.map((o: Officer) => (
            <div key={o.id} className="officer-selection-row" onClick={() => handleAppoint(o.id)}>
              <span className="name">{o.name}</span>
              <span className="stats">統{o.leadership} 武{o.war} 智{o.intelligence} 政{o.politics} 魅{o.charisma}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }
        .modal-content {
          background: #1e293b;
          padding: 30px;
          border-radius: 8px;
          width: 450px;
          color: white;
          border: 1px solid #3b82f6;
        }
        .officer-selection-list {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 300px;
          overflow-y: auto;
        }
        .officer-selection-row {
          padding: 12px;
          background: #334155;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          transition: background 0.2s;
        }
        .officer-selection-row:hover {
          background: #475569;
        }
        .stats {
          font-size: 0.85rem;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
