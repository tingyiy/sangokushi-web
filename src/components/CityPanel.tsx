import { useGameStore } from '../store/gameStore';

export function CityPanel() {
  const { cities, officers, factions, selectedCityId, playerFaction } = useGameStore();

  if (selectedCityId === null) {
    return (
      <div className="city-panel">
        <p className="panel-hint">點擊地圖上的城市查看資訊</p>
      </div>
    );
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

  return (
    <div className="city-panel">
      <h3 className="city-name" style={{ color: faction?.color ?? '#9ca3af' }}>
        {city.name}
        {faction && <span className="city-faction">（{faction.name}）</span>}
        {!faction && <span className="city-faction">（空城）</span>}
      </h3>

      <div className="city-stats">
        <div className="stat-row">
          <span>人口</span><span>{city.population.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span>兵力</span><span>{city.troops.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span>金</span><span>{city.gold.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span>糧</span><span>{city.food.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span>商業</span><span>{city.commerce}</span>
        </div>
        <div className="stat-row">
          <span>農業</span><span>{city.agriculture}</span>
        </div>
        <div className="stat-row">
          <span>防禦</span><span>{city.defense}</span>
        </div>
      </div>

      {affiliated.length > 0 && (
        <div className="officer-section">
          <h4>武將</h4>
          <div className="officer-list">
            {affiliated.map(o => (
              <div key={o.id} className="officer-row">
                <span className="officer-name">
                  {o.isGovernor && <span className="governor-badge">太守</span>}
                  {o.name}
                </span>
                <span className="officer-stats">
                  統{o.leadership} 武{o.war} 智{o.intelligence} 政{o.politics} 魅{o.charisma}
                </span>
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

      {isOwnCity && unaffiliated.length > 0 && (
        <div className="officer-section">
          <h4>在野武將</h4>
          <div className="officer-list">
            {unaffiliated.map(o => (
              <div key={o.id} className="officer-row unaffiliated">
                <span className="officer-name">{o.name}</span>
                <span className="officer-stats">
                  統{o.leadership} 武{o.war} 智{o.intelligence} 政{o.politics} 魅{o.charisma}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
