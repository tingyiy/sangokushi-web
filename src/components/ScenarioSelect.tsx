import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { scenarios } from '../data/scenarios';

/**
 * ScenarioSelect Component - Phase 0.5
 * RTK IV style scenario selection screen
 * Dark green patterned background with centered modal box
 */
export function ScenarioSelect() {
  const { t } = useTranslation();
  const { selectScenario, setPhase } = useGameStore();

  return (
    <div className="scenario-screen brocade-bg">
      <div className="scenario-box rtk-frame">
        <div className="scenario-header">
          <h2>{t('scenario.selectPrompt')}</h2>
          <button className="btn btn-abort" onClick={() => setPhase('title')}>
            {t('common.abort')}
          </button>
        </div>
        <div className="scenario-list">
          {scenarios.map(sc => (
            <div
              key={sc.id}
              className="scenario-row"
              onClick={() => selectScenario(sc)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  selectScenario(sc);
                }
              }}
            >
              <span className="scenario-year">{t('scenario.yearLabel', { year: sc.year })}</span>
              <span className="scenario-name">{sc.name}・{sc.subtitle}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
