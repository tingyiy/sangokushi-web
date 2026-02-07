import React from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * DefeatScreen Component
 * Displayed when the player's faction loses all cities.
 * Phase 0.3: Defeat condition implementation.
 */
const DefeatScreen: React.FC = () => {
  const { playerFaction, year, month, setPhase, factions } = useGameStore();

  const handleReturnToTitle = () => {
    setPhase('title');
  };

  // Find which faction conquered the player
  const conqueringFaction = factions.find(f => 
    f.id !== playerFaction?.id && !f.isPlayer
  );

  return (
    <div
      className="defeat-screen"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a0000 0%, #2d0000 50%, #1a0500 100%)',
        color: '#888',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        fontFamily: 'serif',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          color: '#666',
          textShadow: '0 0 20px rgba(100, 100, 100, 0.5)',
          animation: 'fadeIn 2s ease-in',
        }}
      >
        勢力覆滅
      </div>

      <div
        style={{
          fontSize: '1.5rem',
          color: '#999',
          marginBottom: '1rem',
        }}
      >
        {playerFaction?.name} 已無立足之地
      </div>

      <div
        style={{
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '3rem',
        }}
      >
        {year}年{month}月 · 霸業未成
      </div>

      <div
        style={{
          padding: '20px 40px',
          background: 'rgba(50, 0, 0, 0.3)',
          border: '2px solid #444',
          borderRadius: '10px',
          maxWidth: '600px',
          marginBottom: '3rem',
        }}
      >
        <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#888' }}>
          戰場無情，勝敗乃兵家常事。
          <br />
          雖未達成霸業，但您的奮戰精神
          <br />
          已足以名留青史...
        </p>
        {conqueringFaction && (
          <p style={{ fontSize: '1rem', marginTop: '1rem', color: '#777' }}>
            {conqueringFaction.name} 最終統一天下
          </p>
        )}
      </div>

      <button
        onClick={handleReturnToTitle}
        style={{
          padding: '15px 40px',
          fontSize: '1.2rem',
          background: '#444',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        返回主選單
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DefeatScreen;
