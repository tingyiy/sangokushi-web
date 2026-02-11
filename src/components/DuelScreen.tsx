import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import './DuelScreen.css';

export const DuelScreen: React.FC = () => {
  const { t } = useTranslation('battle');
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
        <h2>{t('duel.title', { round })}</h2>
      </div>

      <div className="duel-arena">
        <div className="duel-fighter player">
          <h3>{t('duel.playerFighter', { name: p1.name })}</h3>
          <div className="stat">{t('duel.warStat', { value: p1.war })}</div>
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${p1Hp}%`, backgroundColor: p1Hp > 30 ? 'green' : 'red' }}></div>
            <span className="hp-text">{p1Hp}/100</span>
          </div>
        </div>

        <div className="duel-center">
          <div className="vs">VS</div>
        </div>

        <div className="duel-fighter enemy">
          <h3>{t('duel.enemyFighter', { name: p2.name })}</h3>
          <div className="stat">{t('duel.warStat', { value: p2.war })}</div>
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
            <button onClick={() => handleAction('attack')}>{t('duel.attack')}</button>
            <button onClick={() => handleAction('heavy')}>{t('duel.heavyAttack')}</button>
            <button onClick={() => handleAction('defend')}>{t('duel.defend')}</button>
            <button onClick={() => handleAction('flee')}>{t('duel.flee')}</button>
          </>
        ) : (
          <div className="waiting-message">{t('duel.enemyTurn')}</div>
        )}
      </div>

      {duelState.result && (
        <div className="duel-result-overlay">
          <div className="result-box">
            <h2>
              {duelState.result === 'win' && t('duel.resultWin')}
              {duelState.result === 'lose' && t('duel.resultLose')}
              {duelState.result === 'draw' && t('duel.resultDraw')}
              {duelState.result === 'flee' && t('duel.resultFlee')}
            </h2>
            <button onClick={endDuel}>{t('ui:common.return')}</button>
          </div>
        </div>
      )}
    </div>
  );
};
