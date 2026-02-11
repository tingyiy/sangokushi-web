import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';

/**
 * VictoryScreen Component
 * Displayed when the player achieves victory by conquering all cities.
 * Phase 0.3: Victory condition implementation.
 */
const VictoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { playerFaction, year, month, setPhase, cities } = useGameStore();

  const handleReturnToTitle = () => {
    setPhase('title');
  };

  const totalCities = cities.length;

  return (
    <div
      className="victory-screen"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#ffd700',
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
          textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
          animation: 'fadeIn 2s ease-in',
        }}
      >
        {t('victory.title')}
      </div>

      <div
        style={{
          fontSize: '1.5rem',
          color: '#fff',
          marginBottom: '1rem',
        }}
      >
        {t('victory.congratulations', { factionName: playerFaction?.name })}
      </div>

      <div
        style={{
          fontSize: '1.2rem',
          color: '#aaa',
          marginBottom: '3rem',
        }}
      >
        {t('victory.dateAndCities', { year, month, totalCities })}
      </div>

      <div
        style={{
          padding: '20px 40px',
          background: 'rgba(255, 215, 0, 0.1)',
          border: '2px solid #ffd700',
          borderRadius: '10px',
          maxWidth: '600px',
          marginBottom: '3rem',
        }}
      >
        <p style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
          {t('victory.flavorLine1')}
          <br />
          {t('victory.flavorLine2')}
          <br />
          {t('victory.flavorLine3')}
        </p>
      </div>

      <button
        onClick={handleReturnToTitle}
        style={{
          padding: '15px 40px',
          fontSize: '1.2rem',
          background: '#ffd700',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {t('common.returnToTitle')}
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

export default VictoryScreen;
