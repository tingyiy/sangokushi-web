import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { Portrait } from './Portrait';
import { CityIllustration } from './CityIllustration';
import { treasures } from '../data/treasures';

/**
 * CityPanel Component - Updated Phase 1
 * Displays city information with:
 * - City illustration (procedural SVG based on city stats)
 * - All 14 city attributes (Phase 1.2)
 * - Officer portraits, skills, and treasures (Phase 1.1, 1.4)
 * - Weapon inventory (Phase 1.2)
 */
export function CityPanel() {
  const { t } = useTranslation();
  const {
    cities,
    officers,
    factions,
    selectedCityId,
    playerFaction,
    isCityRevealed,
    selectCity,
  } = useGameStore();

  if (selectedCityId === null) {
    return null;
  }

  const city = cities.find(c => c.id === selectedCityId);
  if (!city) return null;

  const faction = city.factionId !== null
    ? factions.find(f => f.id === city.factionId)
    : null;

  const cityOfficers = officers.filter(o => o.cityId === city.id);
  const affiliated = cityOfficers.filter(o => o.factionId !== null);
  const unaffiliated = cityOfficers.filter(o => o.factionId === null);
  const isOwnCity = city.factionId === playerFaction?.id;
  const isRevealed = isCityRevealed(city.id);

  return (
    <div className="city-panel city-panel-overlay">
      <button
        className="city-panel-close"
        onClick={() => selectCity(null)}
        aria-label={t('city.closeAriaLabel')}
      >
        ×
      </button>
      {/* City name with faction color */}
      <h3 className="city-name" style={{ color: faction?.color ?? '#9ca3af' }}>
        {city.name}
        {faction && <span className="city-faction">{t('city.factionSuffix', { name: faction.name })}</span>}
        {!faction && <span className="city-faction">{t('city.emptyCity')}</span>}
      </h3>

      {/* City illustration - Phase 0.5 */}
      <CityIllustration city={city} />

      {/* City stats - Phase 1.2: All 14 attributes */}
      <div className="city-stats">
        <div className="stat-row">
          <span>{t('city.population')}</span><span>{isRevealed ? city.population.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>{t('city.troops')}</span><span>{isRevealed ? city.troops.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>{t('city.gold')}</span><span>{isRevealed ? city.gold.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>{t('city.food')}</span><span>{isRevealed ? city.food.toLocaleString() : '????'}</span>
        </div>
        {isRevealed ? (
          <>
            <div className="stat-row">
              <span>{t('city.commerce')}</span><span>{city.commerce}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.agriculture')}</span><span>{city.agriculture}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.defense')}</span><span>{city.defense}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.floodControl')}</span><span>{city.floodControl}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.technology')}</span><span>{city.technology}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.peopleLoyalty')}</span><span>{city.peopleLoyalty}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.morale')}</span><span>{city.morale}</span>
            </div>
            <div className="stat-row">
              <span>{t('city.training')}</span><span>{city.training}</span>
            </div>
          </>
        ) : (
          <div className="stat-row unknown-stats">
            <span style={{ fontStyle: 'italic', color: '#666' }}>{t('city.unknownStats')}</span>
          </div>
        )}
      </div>

      {/* Phase 1.2: Weapon inventory - only show for own cities */}
      {isOwnCity && (
        <div className="weapon-section">
          <h5>{t('city.weaponInventory')}</h5>
          <div className="stat-row"><span>{t('city.crossbows')}</span><span>{city.crossbows}</span></div>
          <div className="stat-row"><span>{t('city.warHorses')}</span><span>{city.warHorses}</span></div>
          <div className="stat-row"><span>{t('city.batteringRams')}</span><span>{city.batteringRams}</span></div>
          <div className="stat-row"><span>{t('city.catapults')}</span><span>{city.catapults}</span></div>
        </div>
      )}

      {/* Affiliated officers with portraits, skills, and treasures - Phase 0.5, 1.1, 1.4 */}
      {isRevealed && affiliated.length > 0 && (
        <div className="officer-section">
          <h4>{t('city.officers')}</h4>
          <div className="officer-list">
            {affiliated.map(o => (
              <div key={o.id} className="officer-row">
                {/* Portrait - Phase 0.5 */}
                <Portrait
                  portraitId={o.portraitId}
                  name={o.name}
                  size="small"
                  className="officer-portrait"
                />
                <span className="officer-name">
                  {o.isGovernor && <span className="governor-badge">{t('city.governorBadge')}</span>}
                  {o.name}
                </span>
                <span className="officer-stats">
                  {t('stat.leadership')}{o.leadership} {t('stat.war')}{o.war} {t('stat.intelligence')}{o.intelligence} {t('stat.politics')}{o.politics} {t('stat.charisma')}{o.charisma}
                </span>
                {/* Phase 1.1: Officer skills */}
                <span className="officer-skills">
                  {o.skills.slice(0, 3).join('·')}
                  {o.skills.length > 3 && `+${o.skills.length - 3}`}
                </span>
                {/* Phase 1.4: Treasure display */}
                {o.treasureId && (
                  <span className="officer-treasure">
                    {treasures.find(t => t.id === o.treasureId)?.name}
                  </span>
                )}
                {isOwnCity && (
                  <>
                    <span className="officer-loyalty">{t('stat.loyalty')}{o.loyalty}</span>
                    <span className="officer-stamina" style={{ color: o.stamina < 20 ? '#ff6b6b' : '#4ade80' }}>{t('stat.stamina')}{o.stamina}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unaffiliated officers with portraits - Phase 0.5 */}
      {isOwnCity && unaffiliated.length > 0 && (
        <div className="officer-section">
          <h4>{t('city.unaffiliatedOfficers')}</h4>
          <div className="officer-list">
            {unaffiliated.map(o => (
              <div key={o.id} className="officer-row unaffiliated">
                {/* Portrait - Phase 0.5 */}
                <Portrait
                  portraitId={o.portraitId}
                  name={o.name}
                  size="small"
                  className="officer-portrait"
                />
                <span className="officer-name">{o.name}</span>
                <span className="officer-stats">
                  {t('stat.leadership')}{o.leadership} {t('stat.war')}{o.war} {t('stat.intelligence')}{o.intelligence} {t('stat.politics')}{o.politics} {t('stat.charisma')}{o.charisma}
                </span>
                {/* Phase 1.1: Officer skills for unaffiliated */}
                <span className="officer-skills">
                  {o.skills.slice(0, 3).join('·')}
                  {o.skills.length > 3 && `+${o.skills.length - 3}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
