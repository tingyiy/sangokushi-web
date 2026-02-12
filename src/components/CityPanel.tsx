import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import type { OfficerView } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';
import { Portrait } from './Portrait';
import { CityIllustration } from './CityIllustration';
import { treasures } from '../data/treasures';

/**
 * CityPanel Component
 * Uses store-level getCityView() for fog-of-war gating.
 * This component is "dumb" — it renders whatever the store returns.
 * Null fields mean "hidden by fog of war."
 */
export function CityPanel() {
  const { t } = useTranslation();
  const { cities, selectedCityId, getCityView, selectCity } = useGameStore();

  if (selectedCityId === null) {
    return null;
  }

  const rawCity = cities.find(c => c.id === selectedCityId);
  if (!rawCity) return null;

  const view = getCityView(selectedCityId);
  if (!view) return null;

  return (
    <div className="city-panel city-panel-overlay">
      <button
        className="city-panel-close"
        onClick={() => selectCity(null)}
        aria-label={t('city.closeAriaLabel')}
      >
        &times;
      </button>
      {/* City name with faction color — always visible (map is public) */}
      <h3 className="city-name" style={{ color: view.factionColor ?? '#9ca3af' }}>
        {localizedName(view.name)}
        {view.factionName && <span className="city-faction">{t('city.factionSuffix', { name: localizedName(view.factionName) })}</span>}
        {!view.factionName && <span className="city-faction">{t('city.emptyCity')}</span>}
      </h3>

      {/* City illustration — only for revealed cities */}
      {view.isRevealed && <CityIllustration city={rawCity} />}

      {/* City stats — null fields shown as ???? */}
      <div className="city-stats">
        <div className="stat-row">
          <span>{t('city.population')}</span><span>{view.population !== null ? view.population.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>{t('city.troops')}</span><span>{view.troops !== null ? view.troops.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>{t('city.gold')}</span><span>{view.gold !== null ? view.gold.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>{t('city.food')}</span><span>{view.food !== null ? view.food.toLocaleString() : '????'}</span>
        </div>
        {view.commerce !== null ? (
          <>
            <div className="stat-row">
              <span>{t('city.commerce')}</span><span>{view.commerce}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.agriculture')}</span><span>{view.agriculture}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.defense')}</span><span>{view.defense}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.floodControl')}</span><span>{view.floodControl}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.technology')}</span><span>{view.technology}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.peopleLoyalty')}</span><span>{view.peopleLoyalty}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.morale')}</span><span>{view.morale}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.training')}</span><span>{view.training}</span>
            </div>
          </>
        ) : (
          <div className="stat-row unknown-stats">
            <span style={{ fontStyle: 'italic', color: '#666' }}>{t('city.unknownStats')}</span>
          </div>
        )}
      </div>

      {/* Weapon inventory — store returns null for non-own cities */}
      {view.crossbows !== null && (
        <div className="weapon-section">
          <h5>{t('city.weaponInventory')}</h5>
          <div className="stat-row"><span>{t('city.crossbows')}</span><span>{view.crossbows}</span></div>
          <div className="stat-row"><span>{t('city.warHorses')}</span><span>{view.warHorses}</span></div>
          <div className="stat-row"><span>{t('city.batteringRams')}</span><span>{view.batteringRams}</span></div>
          <div className="stat-row"><span>{t('city.catapults')}</span><span>{view.catapults}</span></div>
        </div>
      )}

      {/* Affiliated officers — store already filters by visibility */}
      {view.officers.length > 0 && (
        <div className="officer-section">
          <h4>{t('city.officers')}</h4>
          <div className="officer-list">
            {view.officers.map(o => (
              <OfficerRow key={o.id} officer={o} isOwn={view.isOwn} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Unaffiliated officers — store only returns for own cities */}
      {view.unaffiliated.length > 0 && (
        <div className="officer-section">
          <h4>{t('city.unaffiliatedOfficers')}</h4>
          <div className="officer-list">
            {view.unaffiliated.map(o => (
              <OfficerRow key={o.id} officer={o} isOwn={view.isOwn} t={t} unaffiliated />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a single officer row from a fog-gated OfficerView. */
function OfficerRow({ officer: o, isOwn, t, unaffiliated }: {
  officer: OfficerView;
  isOwn: boolean;
  t: (key: string) => string;
  unaffiliated?: boolean;
}) {
  return (
    <div className={`officer-row${unaffiliated ? ' unaffiliated' : ''}`}>
      <Portrait
        portraitId={o.portraitId}
        name={localizedName(o.name)}
        size="small"
        className="officer-portrait"
      />
      <span className="officer-name">
        {o.isGovernor && <span className="governor-badge">{t('city.governorBadge')}</span>}
        {localizedName(o.name)}
      </span>
      <span className="officer-stats">
        {t('stat.leadership')}{o.leadership} {t('stat.war')}{o.war} {t('stat.intelligence')}{o.intelligence} {t('stat.politics')}{o.politics} {t('stat.charisma')}{o.charisma}
      </span>
      <span className="officer-skills">
        {o.skills.slice(0, 3).join('\u00B7')}
        {o.skills.length > 3 && `+${o.skills.length - 3}`}
      </span>
      {o.treasureId !== null && (
        <span className="officer-treasure">
          {treasures.find(t => t.id === o.treasureId)?.name}
        </span>
      )}
      {isOwn && o.stamina !== null && (
        <>
          <span className="officer-loyalty">{t('stat.loyalty')}{o.loyalty}</span>
          <span className="officer-stamina" style={{ color: o.stamina < 20 ? '#ff6b6b' : '#4ade80' }}>{t('stat.stamina')}{o.stamina}</span>
        </>
      )}
    </div>
  );
}
