import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';

/**
 * EventDialog Component - Phase 6.4
 * Displays turn-based events and handles interactive events like officer visits.
 */
export function EventDialog() {
  const { t } = useTranslation();
  const { pendingEvents, popEvent, officers, playerFaction } = useGameStore();

  if (pendingEvents.length === 0) return null;

  const event = pendingEvents[0];

  const handleRecruit = () => {
    if (event.type === 'officerVisit' && event.officerId && playerFaction) {
      // Direct recruitment from visit
      useGameStore.setState(state => ({
        officers: state.officers.map(o => 
          o.id === event.officerId 
            ? { ...o, factionId: playerFaction.id, loyalty: 60 } 
            : o
        )
      }));
      useGameStore.getState().addLog(t('event.officerRecruited', { name: localizedName(officers.find(o => o.id === event.officerId)?.name ?? '') }));
    }
    popEvent();
  };

  const isInteractive = event.type === 'officerVisit';

  return (
    <div className="event-dialog-overlay">
      <div className="event-dialog">
        <div className="event-header">
          <h3>{event.name}</h3>
        </div>
        <div className="event-body">
          <p className="event-description">{event.description}</p>
        </div>
        <div className="event-footer">
          {isInteractive ? (
            <div className="button-group">
              <button className="btn btn-primary" onClick={handleRecruit}>{t('event.recruitButton')}</button>
              <button className="btn btn-secondary" onClick={popEvent}>{t('event.declineButton')}</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={popEvent}>{t('common.ok')}</button>
          )}
        </div>
      </div>

      <style>{`
        .event-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 3000;
        }
        .event-dialog {
          background: #1e293b;
          width: 400px;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          overflow: hidden;
          color: white;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .event-header {
          background: #2a4a6a;
          padding: 15px 20px;
          border-bottom: 1px solid #3b82f6;
        }
        .event-body {
          padding: 30px 20px;
          text-align: center;
          line-height: 1.6;
        }
        .event-footer {
          padding: 15px 20px;
          background: #0f172a;
          display: flex;
          justify-content: center;
        }
        .button-group {
          display: flex;
          gap: 15px;
          width: 100%;
        }
        .btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #475569; color: white; }
      `}</style>
    </div>
  );
}
