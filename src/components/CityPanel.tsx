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
        aria-label="關閉城市資訊"
      >
        ×
      </button>
      {/* City name with faction color */}
      <h3 className="city-name" style={{ color: faction?.color ?? '#9ca3af' }}>
        {city.name}
        {faction && <span className="city-faction">（{faction.name}）</span>}
        {!faction && <span className="city-faction">（空城）</span>}
      </h3>

      {/* City illustration - Phase 0.5 */}
      <CityIllustration city={city} />

      {/* City stats - Phase 1.2: All 14 attributes */}
      <div className="city-stats">
        <div className="stat-row">
          <span>人口</span><span>{isRevealed ? city.population.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>兵力</span><span>{isRevealed ? city.troops.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>金</span><span>{isRevealed ? city.gold.toLocaleString() : '????'}</span>
        </div>
        <div className="stat-row">
          <span>糧</span><span>{isRevealed ? city.food.toLocaleString() : '????'}</span>
        </div>
        {isRevealed ? (
          <>
            <div className="stat-row">
              <span>商業</span><span>{city.commerce}</span>
            </div>
            <div className="stat-row">
              <span>農業</span><span>{city.agriculture}</span>
            </div>
            <div className="stat-row">
              <span>防禦</span><span>{city.defense}</span>
            </div>
            <div className="stat-row">
              <span>治水</span><span>{city.floodControl}</span>
            </div>
            <div className="stat-row">
              <span>技術</span><span>{city.technology}</span>
            </div>
            <div className="stat-row">
              <span>民忠</span><span>{city.peopleLoyalty}</span>
            </div>
            <div className="stat-row">
              <span>士氣</span><span>{city.morale}</span>
            </div>
            <div className="stat-row">
              <span>訓練</span><span>{city.training}</span>
            </div>
          </>
        ) : (
          <div className="stat-row unknown-stats">
            <span style={{ fontStyle: 'italic', color: '#666' }}>其餘情報未知</span>
          </div>
        )}
      </div>

      {/* Phase 1.2: Weapon inventory - only show for own cities */}
      {isOwnCity && (
        <div className="weapon-section">
          <h5>武器庫存</h5>
          <div className="stat-row"><span>弩</span><span>{city.crossbows}</span></div>
          <div className="stat-row"><span>軍馬</span><span>{city.warHorses}</span></div>
          <div className="stat-row"><span>衝車</span><span>{city.batteringRams}</span></div>
          <div className="stat-row"><span>投石機</span><span>{city.catapults}</span></div>
        </div>
      )}

      {/* Affiliated officers with portraits, skills, and treasures - Phase 0.5, 1.1, 1.4 */}
      {isRevealed && affiliated.length > 0 && (
        <div className="officer-section">
          <h4>武將</h4>
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
                  {o.isGovernor && <span className="governor-badge">太守</span>}
                  {o.name}
                </span>
                <span className="officer-stats">
                  統{o.leadership} 武{o.war} 智{o.intelligence} 政{o.politics} 魅{o.charisma}
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
                    <span className="officer-loyalty">忠{o.loyalty}</span>
                    <span className="officer-stamina" style={{ color: o.stamina < 20 ? '#ff6b6b' : '#4ade80' }}>體{o.stamina}</span>
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
          <h4>在野武將</h4>
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
                  統{o.leadership} 武{o.war} 智{o.intelligence} 政{o.politics} 魅{o.charisma}
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
