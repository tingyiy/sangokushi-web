import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';
import './DuelScreen.css';

export const DuelScreen: React.FC = () => {
  const { t } = useTranslation('battle');
  const { duelState, duelAction, duelAiTurn, endDuel } = useGameStore();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [duelState?.logs.length]);

  // Trigger AI counterattack after a short delay when it's the AI's turn
  useEffect(() => {
    if (duelState?.turn === 1 && !duelState.result) {
      const timer = setTimeout(() => duelAiTurn(), 800);
      return () => clearTimeout(timer);
    }
  }, [duelState?.turn, duelState?.result, duelAiTurn]);

  if (!duelState) return null;

  const { p1, p2, p1Hp, p2Hp, logs, round, turn } = duelState;
  const isPlayerTurn = turn === 0;

  const p1Name = localizedName(p1.name);
  const p2Name = localizedName(p2.name);
  // First character for battle flags (surname in Chinese, first letter in English)
  const p1Flag = p1.name[0];
  const p2Flag = p2.name[0];

  const handleAction = (action: 'attack' | 'heavy' | 'defend' | 'flee') => {
    duelAction(action);
  };

  return (
    <div className="duel-screen">
      {/* Animated SVG Arena */}
      <div className="duel-svg-arena">
        <svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#2c3e50' }} />
              <stop offset="100%" style={{ stopColor: '#4a5d73' }} />
            </linearGradient>
            <linearGradient id="armorGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#f4d03f' }} />
              <stop offset="50%" style={{ stopColor: '#d4ac0d' }} />
              <stop offset="100%" style={{ stopColor: '#9a7b0a' }} />
            </linearGradient>
            <linearGradient id="armorRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#e74c3c' }} />
              <stop offset="50%" style={{ stopColor: '#c0392b' }} />
              <stop offset="100%" style={{ stopColor: '#922b21' }} />
            </linearGradient>
            <linearGradient id="horseBrown" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#8b4513' }} />
              <stop offset="100%" style={{ stopColor: '#5d2e0c' }} />
            </linearGradient>
            <linearGradient id="horseWhite" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ecf0f1' }} />
              <stop offset="100%" style={{ stopColor: '#bdc3c7' }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="1000" height="600" fill="url(#skyGrad)" />

          {/* Ground */}
          <rect y="450" width="1000" height="150" fill="#3d2817" />
          <rect y="450" width="1000" height="20" fill="#5d4037" />

          {/* Mountains */}
          <polygon points="0,450 150,250 300,450" fill="#1a252f" opacity="0.6" />
          <polygon points="200,450 400,200 600,450" fill="#1a252f" opacity="0.5" />
          <polygon points="500,450 750,220 1000,450" fill="#1a252f" opacity="0.6" />

          {/* === Left General (Player - Gold Armor) === */}
          <g id="general1">
            <g>
              <animateTransform attributeName="transform" type="translate" dur="3s"
                values="0,0; 20,-10; 0,0; -10,-5; 0,0" repeatCount="indefinite" />

              {/* Horse body */}
              <ellipse cx="250" cy="420" rx="100" ry="40" fill="url(#horseWhite)" />

              {/* Horse legs */}
              <rect x="180" y="440" width="12" height="60" fill="#5d2e0c" rx="3">
                <animate attributeName="y" dur="0.5s" values="440; 450; 440" repeatCount="indefinite" />
              </rect>
              <rect x="200" y="440" width="12" height="60" fill="#5d2e0c" rx="3">
                <animate attributeName="y" dur="0.5s" values="450; 440; 450" repeatCount="indefinite" />
              </rect>
              <rect x="280" y="440" width="12" height="60" fill="#5d2e0c" rx="3">
                <animate attributeName="y" dur="0.5s" values="450; 440; 450" repeatCount="indefinite" />
              </rect>
              <rect x="300" y="440" width="12" height="60" fill="#5d2e0c" rx="3">
                <animate attributeName="y" dur="0.5s" values="440; 450; 440" repeatCount="indefinite" />
              </rect>

              {/* Horse neck and head */}
              <path d="M 320 400 Q 350 380 360 350 Q 365 330 355 325 Q 345 320 340 340 Q 335 360 320 380"
                fill="url(#horseWhite)" />
              <circle cx="360" cy="330" r="15" fill="url(#horseWhite)" />

              {/* Horse tail */}
              <path d="M 150 420 Q 130 440 120 470 Q 115 490 125 485 Q 135 480 140 460 Q 145 440 155 430"
                fill="#5d2e0c">
                <animate attributeName="d" dur="0.3s"
                  values="M 150 420 Q 130 440 120 470 Q 115 490 125 485 Q 135 480 140 460 Q 145 440 155 430;
                          M 150 420 Q 125 445 115 475 Q 110 495 120 490 Q 130 485 135 465 Q 140 445 155 430;
                          M 150 420 Q 130 440 120 470 Q 115 490 125 485 Q 135 480 140 460 Q 145 440 155 430"
                  repeatCount="indefinite" />
              </path>

              {/* Saddle */}
              <ellipse cx="250" cy="400" rx="50" ry="20" fill="#8b4513" />

              {/* General body */}
              <g>
                <rect x="230" y="330" width="40" height="60" rx="5" fill="url(#armorGold)" stroke="#9a7b0a" strokeWidth="2" />
                <circle cx="225" cy="340" r="15" fill="url(#armorGold)" stroke="#9a7b0a" strokeWidth="2" />
                <circle cx="275" cy="340" r="15" fill="url(#armorGold)" stroke="#9a7b0a" strokeWidth="2" />
                <circle cx="250" cy="310" r="20" fill="url(#armorGold)" stroke="#9a7b0a" strokeWidth="2" />
                <rect x="235" y="290" width="30" height="25" fill="url(#armorGold)" stroke="#9a7b0a" strokeWidth="2" />

                {/* Plume */}
                <path d="M 250 290 Q 245 260 250 230 Q 255 260 250 290" fill="#e74c3c" opacity="0.9">
                  <animate attributeName="d" dur="0.2s"
                    values="M 250 290 Q 245 260 250 230 Q 255 260 250 290;
                            M 250 290 Q 255 258 248 228 Q 252 258 250 290;
                            M 250 290 Q 245 260 250 230 Q 255 260 250 290"
                    repeatCount="indefinite" />
                </path>

                {/* Face */}
                <ellipse cx="250" cy="315" rx="12" ry="15" fill="#fdbf60" />

                {/* Weapon */}
                <g>
                  <line x1="270" y1="350" x2="380" y2="320" stroke="#8b4513" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 380 320 L 420 310 L 415 330 Z" fill="#c0c0c0" stroke="#808080" strokeWidth="2" />
                  <line x1="380" y1="320" x2="430" y2="305" stroke="#c0c0c0" strokeWidth="4" />
                  <animateTransform attributeName="transform" type="rotate" dur="2s"
                    values="0 270 350; -30 270 350; 0 270 350; 20 270 350; 0 270 350"
                    repeatCount="indefinite" />
                </g>
              </g>
            </g>

            {/* Player battle flag */}
            <g>
              <rect x="140" y="280" width="8" height="120" fill="#4a3728" />
              <polygon points="144,280 200,260 200,320" fill="#f4d03f">
                <animate attributeName="points" dur="0.4s"
                  values="144,280 200,260 200,320;
                          144,280 195,262 198,318;
                          144,280 200,260 200,320"
                  repeatCount="indefinite" />
              </polygon>
              <text x="155" y="305" fill="#c0392b" fontSize="20" fontWeight="bold" fontFamily="serif">{p1Flag}</text>
            </g>
          </g>

          {/* === Right General (Enemy - Red Armor) === */}
          <g id="general2">
            <g>
              <animateTransform attributeName="transform" type="translate" dur="3s"
                values="0,0; -20,-10; 0,0; 10,-5; 0,0" repeatCount="indefinite" />

              {/* Horse body */}
              <ellipse cx="750" cy="420" rx="100" ry="40" fill="url(#horseBrown)" />

              {/* Horse legs */}
              <rect x="680" y="440" width="12" height="60" fill="#3d1f08" rx="3">
                <animate attributeName="y" dur="0.5s" values="450; 440; 450" repeatCount="indefinite" />
              </rect>
              <rect x="700" y="440" width="12" height="60" fill="#3d1f08" rx="3">
                <animate attributeName="y" dur="0.5s" values="440; 450; 440" repeatCount="indefinite" />
              </rect>
              <rect x="780" y="440" width="12" height="60" fill="#3d1f08" rx="3">
                <animate attributeName="y" dur="0.5s" values="440; 450; 440" repeatCount="indefinite" />
              </rect>
              <rect x="800" y="440" width="12" height="60" fill="#3d1f08" rx="3">
                <animate attributeName="y" dur="0.5s" values="450; 440; 450" repeatCount="indefinite" />
              </rect>

              {/* Horse neck and head */}
              <path d="M 680 400 Q 650 380 640 350 Q 635 330 645 325 Q 655 320 660 340 Q 665 360 680 380"
                fill="url(#horseBrown)" />
              <circle cx="640" cy="330" r="15" fill="url(#horseBrown)" />

              {/* Horse tail */}
              <path d="M 850 420 Q 870 440 880 470 Q 885 490 875 485 Q 865 480 860 460 Q 855 440 845 430"
                fill="#3d1f08">
                <animate attributeName="d" dur="0.3s"
                  values="M 850 420 Q 870 440 880 470 Q 885 490 875 485 Q 865 480 860 460 Q 855 440 845 430;
                          M 850 420 Q 875 445 885 475 Q 890 495 880 490 Q 870 485 865 465 Q 860 445 845 430;
                          M 850 420 Q 870 440 880 470 Q 885 490 875 485 Q 865 480 860 460 Q 855 440 845 430"
                  repeatCount="indefinite" />
              </path>

              {/* Saddle */}
              <ellipse cx="750" cy="400" rx="50" ry="20" fill="#5d2e0c" />

              {/* General body */}
              <g>
                <rect x="730" y="330" width="40" height="60" rx="5" fill="url(#armorRed)" stroke="#922b21" strokeWidth="2" />
                <circle cx="725" cy="340" r="15" fill="url(#armorRed)" stroke="#922b21" strokeWidth="2" />
                <circle cx="775" cy="340" r="15" fill="url(#armorRed)" stroke="#922b21" strokeWidth="2" />
                <circle cx="750" cy="310" r="20" fill="url(#armorRed)" stroke="#922b21" strokeWidth="2" />
                <rect x="735" y="290" width="30" height="25" fill="url(#armorRed)" stroke="#922b21" strokeWidth="2" />

                {/* Plume */}
                <path d="M 750 290 Q 745 260 750 230 Q 755 260 750 290" fill="#f4d03f" opacity="0.9">
                  <animate attributeName="d" dur="0.2s"
                    values="M 750 290 Q 745 260 750 230 Q 755 260 750 290;
                            M 750 290 Q 755 258 748 228 Q 752 258 750 290;
                            M 750 290 Q 745 260 750 230 Q 755 260 750 290"
                    repeatCount="indefinite" />
                </path>

                {/* Face */}
                <ellipse cx="750" cy="315" rx="12" ry="15" fill="#fdbf60" />

                {/* Weapon - Spear */}
                <g>
                  <line x1="730" y1="350" x2="620" y2="320" stroke="#8b4513" strokeWidth="5" strokeLinecap="round" />
                  <polygon points="620,320 605,315 605,325" fill="#c0c0c0" />
                  <line x1="620" y1="320" x2="590" y2="310" stroke="#c0c0c0" strokeWidth="3" />
                  <animateTransform attributeName="transform" type="rotate" dur="2s"
                    values="0 730 350; 25 730 350; 0 730 350; -15 730 350; 0 730 350"
                    repeatCount="indefinite" />
                </g>
              </g>
            </g>

            {/* Enemy battle flag */}
            <g>
              <rect x="852" y="280" width="8" height="120" fill="#4a3728" />
              <polygon points="856,280 800,260 800,320" fill="#e74c3c">
                <animate attributeName="points" dur="0.4s"
                  values="856,280 800,260 800,320;
                          856,280 805,262 802,318;
                          856,280 800,260 800,320"
                  repeatCount="indefinite" />
              </polygon>
              <text x="810" y="305" fill="#f4d03f" fontSize="20" fontWeight="bold" fontFamily="serif">{p2Flag}</text>
            </g>
          </g>

          {/* Clash effects */}
          <g id="clashEffects">
            <circle cx="500" cy="330" r="30" fill="#f39c12" opacity="0" filter="url(#glow)">
              <animate attributeName="opacity" dur="2s" values="0;0;0.8;0;0" keyTimes="0;0.4;0.5;0.6;1" repeatCount="indefinite" />
              <animate attributeName="r" dur="2s" values="10;10;40;50;10" keyTimes="0;0.4;0.5;0.6;1" repeatCount="indefinite" />
            </circle>
            <line x1="500" y1="330" x2="530" y2="310" stroke="#f1c40f" strokeWidth="3" opacity="0">
              <animate attributeName="opacity" dur="2s" values="0;0;1;0;0" keyTimes="0;0.4;0.5;0.6;1" repeatCount="indefinite" />
            </line>
            <line x1="500" y1="330" x2="470" y2="310" stroke="#f1c40f" strokeWidth="3" opacity="0">
              <animate attributeName="opacity" dur="2s" values="0;0;1;0;0" keyTimes="0;0.4;0.5;0.6;1" repeatCount="indefinite" />
            </line>
            <line x1="500" y1="330" x2="500" y2="295" stroke="#f1c40f" strokeWidth="3" opacity="0">
              <animate attributeName="opacity" dur="2s" values="0;0;1;0;0" keyTimes="0;0.4;0.5;0.6;1" repeatCount="indefinite" />
            </line>
          </g>

          {/* Dust clouds */}
          <ellipse cx="250" cy="470" rx="60" ry="15" fill="#8b7355" opacity="0.4">
            <animate attributeName="rx" dur="0.5s" values="60;70;60" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="750" cy="470" rx="60" ry="15" fill="#8b7355" opacity="0.4">
            <animate attributeName="rx" dur="0.5s" values="60;70;60" repeatCount="indefinite" />
          </ellipse>

          {/* Title */}
          <text x="500" y="50" textAnchor="middle" fill="#f4d03f" fontSize="32" fontWeight="bold"
            fontFamily="serif" filter="url(#glow)">
            {t('duel.title', { round })}
          </text>

          {/* "VS / 單挑" center text */}
          <text x="500" y="200" textAnchor="middle" fill="#f4d03f" fontSize="48" fontWeight="bold"
            fontFamily="serif" filter="url(#glow)" opacity="0.9">
            {t('duel.vsLabel')}
            <animate attributeName="opacity" dur="1.5s" values="0.9;0.6;0.9" repeatCount="indefinite" />
          </text>

          {/* Decorative border */}
          <rect x="10" y="10" width="980" height="580" fill="none" stroke="#f4d03f" strokeWidth="3" opacity="0.5" />

          {/* === Player (Left) Name + HP === */}
          <g>
            {/* Name plate */}
            <rect x="110" y="530" width="280" height="55" rx="6" fill="rgba(0,0,0,0.7)" stroke="#4a90e2" strokeWidth="2" />
            <text x="250" y="553" textAnchor="middle" fill="#4a90e2" fontSize="16" fontWeight="bold" fontFamily="serif">
              {t('duel.playerFighter', { name: p1Name })} — {t('duel.warStat', { value: p1.war })}
            </text>
            {/* HP bar background */}
            <rect x="130" y="562" width="240" height="14" rx="3" fill="#333" stroke="#555" strokeWidth="1" />
            {/* HP bar fill */}
            <rect x="130" y="562" width={240 * p1Hp / 100} height="14" rx="3"
              fill={p1Hp > 30 ? '#27ae60' : '#e74c3c'}>
              <animate attributeName="opacity" dur="0.3s" values="1;0.8;1" repeatCount="indefinite"
                {...(p1Hp <= 30 ? {} : { repeatCount: '0' })} />
            </rect>
            {/* HP text */}
            <text x="250" y="574" textAnchor="middle" fill="white" fontSize="11" fontFamily="monospace">
              HP {p1Hp}/100
            </text>
          </g>

          {/* === Enemy (Right) Name + HP === */}
          <g>
            {/* Name plate */}
            <rect x="610" y="530" width="280" height="55" rx="6" fill="rgba(0,0,0,0.7)" stroke="#e24a4a" strokeWidth="2" />
            <text x="750" y="553" textAnchor="middle" fill="#e24a4a" fontSize="16" fontWeight="bold" fontFamily="serif">
              {t('duel.enemyFighter', { name: p2Name })} — {t('duel.warStat', { value: p2.war })}
            </text>
            {/* HP bar background */}
            <rect x="630" y="562" width="240" height="14" rx="3" fill="#333" stroke="#555" strokeWidth="1" />
            {/* HP bar fill */}
            <rect x="630" y="562" width={240 * p2Hp / 100} height="14" rx="3"
              fill={p2Hp > 30 ? '#27ae60' : '#e74c3c'}>
              <animate attributeName="opacity" dur="0.3s" values="1;0.8;1" repeatCount="indefinite"
                {...(p2Hp <= 30 ? {} : { repeatCount: '0' })} />
            </rect>
            {/* HP text */}
            <text x="750" y="574" textAnchor="middle" fill="white" fontSize="11" fontFamily="monospace">
              HP {p2Hp}/100
            </text>
          </g>
        </svg>
      </div>

      {/* Log + Controls below the SVG */}
      <div className="duel-bottom-panel">
        <div className="duel-log" ref={logRef}>
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
              <button className="duel-flee-btn" onClick={() => handleAction('flee')}>{t('duel.flee')}</button>
            </>
          ) : (
            <div className="waiting-message">{t('duel.enemyTurn')}</div>
          )}
        </div>
      </div>

      {/* Result overlay */}
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
