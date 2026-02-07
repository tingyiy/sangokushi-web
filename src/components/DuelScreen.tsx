import React from 'react';
import { useGameStore } from '../store/gameStore';
import './DuelScreen.css';

export const DuelScreen: React.FC = () => {
  const { duelState, duelAction, endDuel } = useGameStore();

  if (!duelState) return null;

  const { p1, p2, p1Hp, p2Hp, logs, round, turn } = duelState;
  const isPlayerTurn = turn === 0; // 0 for player (p1), 1 for AI (p2)

  const handleAction = (action: 'attack' | 'heavy' | 'defend' | 'flee') => {
    duelAction(action);
  };

  return (
    <div className="duel-screen">
      <div className="duel-header">
        <h2>單挑 - 第 {round} 回合</h2>
      </div>

      <div className="duel-arena">
        <div className="duel-fighter player">
          <h3>{p1.name} (我方)</h3>
          <div className="stat">武力: {p1.war}</div>
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${p1Hp}%`, backgroundColor: p1Hp > 30 ? 'green' : 'red' }}></div>
            <span className="hp-text">{p1Hp}/100</span>
          </div>
        </div>

        <div className="duel-center">
          <div className="vs">VS</div>
        </div>

        <div className="duel-fighter enemy">
          <h3>{p2.name} (敵方)</h3>
          <div className="stat">武力: {p2.war}</div>
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${p2Hp}%`, backgroundColor: p2Hp > 30 ? 'green' : 'red' }}></div>
            <span className="hp-text">{p2Hp}/100</span>
          </div>
        </div>
      </div>

      <div className="duel-log">
        {logs.map((log, i) => (
          <div key={i} className="log-entry">{log}</div>
        ))}
      </div>

      <div className="duel-controls">
        {isPlayerTurn ? (
          <>
            <button onClick={() => handleAction('attack')}>普通攻擊</button>
            <button onClick={() => handleAction('heavy')}>全力一擊</button>
            <button onClick={() => handleAction('defend')}>防禦</button>
            <button onClick={() => handleAction('flee')}>逃跑</button>
          </>
        ) : (
          <div className="waiting-message">敵方行動中...</div>
        )}
      </div>

      {duelState.result && (
        <div className="duel-result-overlay">
          <div className="result-box">
            <h2>
              {duelState.result === 'win' && '勝利！'}
              {duelState.result === 'lose' && '敗北...'}
              {duelState.result === 'draw' && '平局'}
              {duelState.result === 'flee' && '戰鬥結束'}
            </h2>
            <button onClick={endDuel}>返回</button>
          </div>
        </div>
      )}
    </div>
  );
};
