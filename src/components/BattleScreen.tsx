import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import BattleMap from './map/BattleMap';

/**
 * BattleScreen Component
 * Displays the tactical battle interface and handles battle resolution.
 * Phase 0.1: Integrated with resolveBattle for proper battle consequences.
 */
const BattleScreen: React.FC = () => {
  const { setPhase, addLog, cities, factions, resolveBattle } = useGameStore();
  const battle = useBattleStore();

  useEffect(() => {
    if (battle.isFinished && battle.winnerFactionId !== null) {
      const winner = factions.find(f => f.id === battle.winnerFactionId);
      const loserFactionId = battle.winnerFactionId === battle.attackerId ? battle.defenderId : battle.attackerId;
      addLog(`戰鬥結束！勝利者：${winner?.name || '無'}`);
      
      // Phase 0.1: Resolve battle consequences
      // Prepare battle units data for resolveBattle
      const battleUnitsData = battle.units.map(u => ({
        officerId: u.officerId,
        troops: u.troops,
        factionId: u.factionId,
        status: u.status,
      }));
      
      // Call resolveBattle to handle city transfer, officer capture, etc.
      resolveBattle(
        battle.winnerFactionId,
        loserFactionId,
        battle.defenderCityId,
        battleUnitsData
      );
      
      setTimeout(() => {
        setPhase('playing');
      }, 3000);
    }
  }, [battle.isFinished, battle.winnerFactionId, battle.attackerId, battle.defenderId, battle.defenderCityId, battle.units, factions, addLog, setPhase, resolveBattle]);

  const activeUnit = battle.units.find(u => u.id === battle.activeUnitId);

  return (
    <div className="battle-screen" style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="battle-header" style={{
        padding: '10px',
        background: '#333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>第 {battle.day} 日 | 天氣：{battle.weather === 'sunny' ? '晴' : '雨'}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          {factions.find(f => f.id === battle.attackerId)?.name} 攻打 {cities.find(c => c.id === battle.defenderCityId)?.name}
        </div>
        <div>
           <button onClick={() => setPhase('playing')} style={{ background: '#600', color: 'white' }}>撤退</button>
        </div>
      </div>

      <div className="battle-main" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <BattleMap />
      </div>

      <div className="battle-footer" style={{
        height: '150px',
        background: '#222',
        borderTop: '2px solid #444',
        display: 'flex',
        padding: '10px'
      }}>
        {activeUnit ? (
          <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
            <div className="unit-card" style={{
              width: '200px',
              border: '1px solid #555',
              padding: '10px',
              background: '#333'
            }}>
              <div style={{ fontWeight: 'bold' }}>{activeUnit.officer.name}</div>
              <div>兵力: {activeUnit.troops}</div>
              <div>士氣: {activeUnit.morale}</div>
              <div>狀態: {activeUnit.status === 'active' ? '待命' : '結束'}</div>
            </div>
            
            <div className="battle-commands" style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
               {activeUnit.status === 'active' && (
                 <>
                   <button onClick={() => {/* Handle move mode */}} className="cmd-btn">移動</button>
                   <button onClick={() => {/* Handle attack mode */}} className="cmd-btn">攻擊</button>
                   <button onClick={() => battle.endUnitTurn(activeUnit.id)} className="cmd-btn">待命</button>
                 </>
               )}
            </div>
          </div>
        ) : (
          <div style={{ margin: 'auto' }}>等待下一回合...</div>
        )}
      </div>

      <style>{`
        .cmd-btn {
          padding: 10px 20px;
          background: #444;
          color: white;
          border: 1px solid #666;
          cursor: pointer;
        }
        .cmd-btn:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default BattleScreen;
