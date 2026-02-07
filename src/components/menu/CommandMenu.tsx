import { useGameStore } from '../../store/gameStore';
import type { CommandCategory } from '../../types';

const categories: CommandCategory[] = ['內政', '軍事', '人事', '外交', '謀略', '結束'];

export function CommandMenu() {
  const {
    selectedCityId, cities, officers, factions, playerFaction,
    activeCommandCategory, setActiveCommandCategory,
    developCommerce, developAgriculture, reinforceDefense,
    recruitOfficer, draftTroops, startDuel, endTurn, addLog,
  } = useGameStore();

  const city = cities.find(c => c.id === selectedCityId);
  const isOwnCity = city?.factionId === playerFaction?.id;

  const handleCategory = (cat: CommandCategory) => {
    if (cat === '結束') {
      endTurn();
      return;
    }
    if (!isOwnCity) {
      addLog('這不是你的城市。');
      return;
    }
    setActiveCommandCategory(cat === activeCommandCategory ? null : cat);
  };

  const unaffiliated = selectedCityId !== null
    ? officers.filter(o => o.cityId === selectedCityId && o.factionId === null)
    : [];

  return (
    <div className="command-menu">
      <div className="command-categories">
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn btn-cmd ${activeCommandCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {activeCommandCategory && isOwnCity && city && (
        <div className="command-actions">
          {activeCommandCategory === '內政' && (
            <>
              <button className="btn btn-action" onClick={() => developCommerce(city.id)}>
                商業開發（500金）
              </button>
              <button className="btn btn-action" onClick={() => developAgriculture(city.id)}>
                農業開發（500金）
              </button>
              <button className="btn btn-action" onClick={() => reinforceDefense(city.id)}>
                強化城防（300金）
              </button>
            </>
          )}
          {activeCommandCategory === '軍事' && (
            <>
              <button className="btn btn-action" onClick={() => draftTroops(city.id, 1000)}>
                徵兵 1000
              </button>
              <button className="btn btn-action" onClick={() => draftTroops(city.id, 5000)}>
                徵兵 5000
              </button>
              <button className="btn btn-action" onClick={() => draftTroops(city.id, 10000)}>
                徵兵 10000
              </button>
              <button className="btn btn-action" onClick={startDuel}>
                向鄰國發起單挑
              </button>
            </>
          )}
          {activeCommandCategory === '人事' && (
            <>
              {unaffiliated.length > 0 ? (
                unaffiliated.map(o => (
                  <button
                    key={o.id}
                    className="btn btn-action"
                    onClick={() => recruitOfficer(o.id)}
                  >
                    招攬 {o.name}
                  </button>
                ))
              ) : (
                <p className="no-action">此城無在野武將可招攬。</p>
              )}
            </>
          )}
          {activeCommandCategory === '外交' && (
            <p className="no-action">外交功能開發中…</p>
          )}
          {activeCommandCategory === '謀略' && (
            <p className="no-action">謀略功能開發中…</p>
          )}
        </div>
      )}
    </div>
  );
}
