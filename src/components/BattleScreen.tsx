import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import BattleMap from './map/BattleMap';
import type { BattleTactic } from '../utils/unitTypes';
import { calculateTacticSuccess, BATTLE_TACTICS, getAttackRange } from '../utils/unitTypes';
import { getDistance } from '../utils/hex';
import type { BattleWeather } from '../types/battle';

const WEATHER_LABELS: Record<BattleWeather, string> = {
  sunny: '晴', rain: '雨', cloudy: '陰', storm: '暴風'
};

const WIND_LABELS = ['↑北', '↗東北', '↘東南', '↓南', '↙西南', '↖西北'];

const STATUS_LABELS: Record<string, string> = {
  active: '可行動', done: '已行動', routed: '潰走', confused: 'confusion'
};

const BattleScreen: React.FC = () => {
  const { setPhase, addLog, cities, factions, resolveBattle, initMidBattleDuel, retreat } = useGameStore();
  const battle = useBattleStore();
  const [showResults, setShowResults] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const playerFactionId = battle.playerFactionId;

  const activeUnit = battle.units.find(u => u.id === battle.activeUnitId);
  const isPlayerTurn = battle.turnPhase === 'player';
  const inspectedUnit = battle.units.find(u => u.id === battle.inspectedUnitId);

  // Player unit counts
  const playerUnits = battle.units.filter(u => u.factionId === playerFactionId && u.troops > 0 && u.status !== 'routed');
  const activePlayerUnits = playerUnits.filter(u => u.status === 'active');
  const donePlayerUnits = playerUnits.filter(u => u.status === 'done');

  // Auto-scroll battle log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battle.battleLog.length]);

  // Drive enemy phase: step through enemy units with a delay so the player can see actions
  useEffect(() => {
    if (battle.turnPhase !== 'enemy' || battle.isFinished) return;
    const timer = setTimeout(() => {
      const hasMore = battle.stepEnemyPhase();
      // If no more enemy units, stepEnemyPhase calls nextDay() which sets turnPhase back to 'player'
      // The effect will not re-fire since turnPhase changes
      void hasMore; // React will re-render and re-trigger if turnPhase is still 'enemy'
    }, 400);
    return () => clearTimeout(timer);
  }, [battle.turnPhase, battle.isFinished, battle.units, battle.activeUnitId]);

  // Battle end handler
  useEffect(() => {
    if (battle.isFinished && battle.winnerFactionId !== null && !showResults) {
      const winner = factions.find(f => f.id === battle.winnerFactionId);
      const loserFactionId = battle.winnerFactionId === battle.attackerId ? battle.defenderId : battle.attackerId;
      addLog(`戰鬥結束！勝利者：${winner?.name || '無'}`);

      const battleUnitsData = battle.units.map(u => ({
        officerId: u.officerId,
        troops: u.troops,
        factionId: u.factionId,
        status: u.status,
      }));

      resolveBattle(
        battle.winnerFactionId,
        loserFactionId,
        battle.defenderCityId,
        battleUnitsData,
        battle.capturedOfficerIds,
        battle.routedOfficerIds
      );
      setShowResults(true);
    }
  }, [battle.isFinished, battle.winnerFactionId, battle.attackerId, battle.defenderId, battle.defenderCityId, battle.units, factions, addLog, resolveBattle, battle.capturedOfficerIds, battle.routedOfficerIds, showResults]);

  const handleRetreat = () => {
    if (window.confirm('確定要撤退嗎？撤退將判定為敗北。')) {
      retreat();
    }
  };

  const handleEndTurn = () => {
    battle.endPlayerPhase();
  };

  // Tactic helpers
  const getAvailableTactics = (): string[] => {
    if (!activeUnit) return [];
    return activeUnit.officer.skills.filter(s =>
      (BATTLE_TACTICS as readonly string[]).includes(s)
    );
  };

  const handleTactic = (tactic: string) => {
    if (!activeUnit) return;
    const enemies = battle.units.filter(u => u.factionId !== activeUnit.factionId && u.troops > 0 && u.status !== 'routed');
    const target = enemies.length > 0 ? enemies.reduce((best, e) => {
      const d = getDistance({ q: e.x, r: e.y }, { q: activeUnit.x, r: activeUnit.y });
      const bestD = getDistance({ q: best.x, r: best.y }, { q: activeUnit.x, r: activeUnit.y });
      return d < bestD ? e : best;
    }) : undefined;

    battle.executeTactic(
      activeUnit.id,
      tactic as BattleTactic,
      target?.id,
      target ? { q: target.x, r: target.y } : undefined
    );
  };

  // Contextual button helpers (only when a unit is selected)
  const adjacentGate = activeUnit ? battle.gates.find(g =>
    getDistance({ q: activeUnit.x, r: activeUnit.y }, { q: g.q, r: g.r }) <= 1
  ) : null;

  const adjacentEnemy = activeUnit ? battle.units.find(u =>
    u.factionId !== activeUnit.factionId && u.troops > 0 && u.status !== 'routed' &&
    getDistance({ q: activeUnit.x, r: activeUnit.y }, { q: u.x, r: u.y }) <= 1
  ) : null;

  const canAttack = activeUnit && activeUnit.status === 'active' && battle.units.some(u =>
    u.factionId !== activeUnit.factionId && u.troops > 0 && u.status !== 'routed' &&
    getDistance({ q: activeUnit.x, r: activeUnit.y }, { q: u.x, r: u.y }) <= getAttackRange(activeUnit.type)
  );

  const canMove = activeUnit && activeUnit.status === 'active' && !activeUnit.hasMoved;

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1a1a', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', background: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '0.85rem' }}>
          第 {battle.day} / {battle.maxDays} 日 | {WEATHER_LABELS[battle.weather]} | 風向：{WIND_LABELS[battle.windDirection] || '?'}
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
          {factions.find(f => f.id === battle.attackerId)?.name} 攻打 {cities.find(c => c.id === battle.defenderCityId)?.name}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isPlayerTurn && (
            <button onClick={handleEndTurn} className="cmd-btn" style={{ background: '#1565c0' }}>
              結束回合 ({activePlayerUnits.length} 待命)
            </button>
          )}
          <button onClick={handleRetreat} style={{ background: '#600', color: 'white', padding: '4px 12px', border: 'none', cursor: 'pointer', borderRadius: 3 }}>
            撤退
          </button>
        </div>
      </div>

      {/* Main area: map + sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <BattleMap playerFactionId={playerFactionId} />
          {/* Mode indicator overlay */}
          {battle.mode !== 'idle' && (
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 4, fontSize: '0.85rem' }}>
              {battle.mode === 'move' && '選擇移動目標（藍色區域）'}
              {battle.mode === 'attack' && '選擇攻擊目標（紅色標記）'}
              {battle.mode === 'tactic' && '選擇計略目標'}
              <button onClick={() => battle.setMode('idle')} style={{ marginLeft: 10, background: '#555', color: '#fff', border: 'none', padding: '2px 8px', cursor: 'pointer', borderRadius: 3 }}>
                取消
              </button>
            </div>
          )}
          {/* Enemy phase overlay */}
          {!isPlayerTurn && !battle.isFinished && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.7)', padding: '12px 24px', borderRadius: 8, fontSize: '1.1rem', color: '#f88' }}>
              敵方行動中...
            </div>
          )}
        </div>

        {/* Right sidebar: battle log + inspected unit */}
        <div style={{ width: 220, background: '#222', borderLeft: '1px solid #444', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Unit roster summary */}
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #444', fontSize: '0.75rem', color: '#aaa' }}>
            我方：{activePlayerUnits.length} 可行動 / {donePlayerUnits.length} 已行動
          </div>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #444', fontSize: '0.8rem', fontWeight: 'bold' }}>戰鬥記錄</div>
          <div ref={logRef} style={{ flex: 1, overflow: 'auto', padding: '4px 8px', fontSize: '0.75rem', lineHeight: 1.4 }}>
            {battle.battleLog.map((msg, i) => (
              <div key={i} style={{ marginBottom: 2, color: msg.startsWith('──') ? '#aaa' : '#ddd' }}>{msg}</div>
            ))}
          </div>
          {inspectedUnit && (
            <div style={{ padding: '6px 8px', borderTop: '1px solid #444', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: 'bold' }}>{inspectedUnit.officer.name} ({inspectedUnit.factionId === playerFactionId ? '我方' : '敵方'})</div>
              <div>兵力: {inspectedUnit.troops}/{inspectedUnit.maxTroops}</div>
              <div>士氣: {inspectedUnit.morale} | 狀態: {STATUS_LABELS[inspectedUnit.status]}</div>
              <div>統{inspectedUnit.officer.leadership} 武{inspectedUnit.officer.war} 智{inspectedUnit.officer.intelligence}</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: active unit + commands */}
      <div style={{ height: 100, background: '#222', borderTop: '2px solid #444', display: 'flex', padding: '6px 10px', flexShrink: 0, gap: 12 }}>
        {activeUnit && activeUnit.factionId === playerFactionId && activeUnit.status === 'active' ? (
          <>
            <div style={{ width: 180, border: '1px solid #555', padding: '6px 8px', background: '#333', borderRadius: 4, fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                {activeUnit.officer.name}
              </div>
              <div>兵力: {activeUnit.troops}/{activeUnit.maxTroops}</div>
              <div>士氣: {activeUnit.morale} | {activeUnit.hasMoved ? '已移動' : '可移動'}</div>
            </div>

            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <button
                onClick={() => battle.setMode(battle.mode === 'move' ? 'idle' : 'move')}
                disabled={!canMove}
                className="cmd-btn"
                style={battle.mode === 'move' ? { background: '#1565c0' } : canMove ? {} : { opacity: 0.4 }}
              >
                移動
              </button>
              <button
                onClick={() => battle.setMode(battle.mode === 'attack' ? 'idle' : 'attack')}
                disabled={!canAttack}
                className="cmd-btn"
                style={battle.mode === 'attack' ? { background: '#c62828' } : canAttack ? {} : { opacity: 0.4 }}
              >
                攻擊
              </button>
              <button
                onClick={() => battle.setMode(battle.mode === 'tactic' ? 'idle' : 'tactic')}
                className="cmd-btn"
                style={battle.mode === 'tactic' ? { background: '#6a1b9a' } : {}}
              >
                計略
              </button>
              {adjacentGate && (
                <button onClick={() => battle.attackGate(activeUnit.id, adjacentGate.q, adjacentGate.r)} className="cmd-btn" style={{ background: '#a52a2a' }}>攻門</button>
              )}
              {adjacentEnemy && (
                <button onClick={() => initMidBattleDuel(activeUnit.officer, adjacentEnemy.officer)} className="cmd-btn" style={{ background: '#d4af37', color: 'black' }}>單挑</button>
              )}

              {/* Tactics popup */}
              {battle.mode === 'tactic' && (
                <div style={{
                  position: 'absolute', bottom: 50, left: 0, background: '#333',
                  border: '1px solid #666', padding: 6, display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, zIndex: 100, borderRadius: 4,
                }}>
                  {getAvailableTactics().map(tactic => {
                    const chance = calculateTacticSuccess(tactic as BattleTactic, activeUnit.officer.intelligence);
                    return (
                      <button key={tactic} onClick={() => handleTactic(tactic)}
                        className="tactic-btn" title={`成功率: ${Math.round(chance)}%`}>
                        {tactic}<br /><span style={{ fontSize: '0.65rem', color: '#aaa' }}>{Math.round(chance)}%</span>
                      </button>
                    );
                  })}
                  {getAvailableTactics().length === 0 && (
                    <div style={{ gridColumn: '1 / -1', color: '#888', padding: 8, textAlign: 'center' }}>無可用計略</div>
                  )}
                  <button onClick={() => battle.setMode('idle')} style={{ gridColumn: '1 / -1', background: '#555', color: '#fff', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 3 }}>
                    取消
                  </button>
                </div>
              )}
            </div>
          </>
        ) : isPlayerTurn ? (
          <div style={{ margin: 'auto', color: '#aaa', fontSize: '0.9rem' }}>
            點選地圖上的我方武將來下達指令，或按「結束回合」結束本日行動。
          </div>
        ) : (
          <div style={{ margin: 'auto', color: '#f88', fontSize: '0.9rem' }}>
            敵方行動中...
          </div>
        )}
      </div>

      {/* Results overlay */}
      {showResults && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{ background: '#333', border: '1px solid #666', padding: 24, borderRadius: 8, maxWidth: 400, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 12px' }}>
              {battle.winnerFactionId === playerFactionId ? '勝利！' : '敗北...'}
            </h2>
            <div style={{ textAlign: 'left', fontSize: '0.85rem', lineHeight: 1.8 }}>
              <div>勝方：{factions.find(f => f.id === battle.winnerFactionId)?.name}</div>
              {battle.capturedOfficerIds.length > 0 && (
                <div>俘虜：{battle.capturedOfficerIds.map(id => battle.units.find(u => u.officerId === id)?.officer.name).filter(Boolean).join('、')}</div>
              )}
              <div>攻方殘兵：{battle.units.filter(u => u.factionId === battle.attackerId).reduce((s, u) => s + u.troops, 0)}</div>
              <div>守方殘兵：{battle.units.filter(u => u.factionId === battle.defenderId).reduce((s, u) => s + u.troops, 0)}</div>
            </div>
            <button onClick={() => setPhase('playing')} style={{
              marginTop: 16, padding: '8px 24px', background: '#1565c0', color: 'white',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '1rem'
            }}>
              返回
            </button>
          </div>
        </div>
      )}

      <style>{`
        .cmd-btn {
          padding: 6px 14px;
          background: #444;
          color: white;
          border: 1px solid #666;
          cursor: pointer;
          border-radius: 3px;
          font-size: 0.85rem;
        }
        .cmd-btn:hover:not(:disabled) { background: #555; }
        .cmd-btn:disabled { cursor: default; }
        .tactic-btn {
          background: #222;
          color: #fff;
          border: 1px solid #444;
          cursor: pointer;
          padding: 4px 6px;
          font-size: 0.75rem;
          border-radius: 3px;
        }
        .tactic-btn:hover { background: #444; }
      `}</style>
    </div>
  );
};

export default BattleScreen;
