import { useGameStore } from '../../store/gameStore';
import type { CommandCategory } from '../../types';

const categories: CommandCategory[] = ['內政', '軍事', '人事', '外交', '謀略', '結束'];

export function CommandMenu() {
  const {
    selectedCityId, cities, officers, factions, playerFaction,
    activeCommandCategory, setActiveCommandCategory,
    developCommerce, developAgriculture, reinforceDefense,
    recruitOfficer, draftTroops, startDuel, endTurn, addLog,
    improveRelations, formAlliance, rumor,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {factions.filter(f => f.id !== playerFaction?.id).map(f => {
                const hostility = playerFaction?.relations?.[f.id] ?? 60;
                const isAlly = playerFaction?.allies?.includes(f.id);
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: f.color, fontWeight: 'bold' }}>{f.name}</span>
                        <span style={{ fontSize: '0.85em', color: '#ccc' }}>敵對: {hostility} {isAlly && <span style={{color: '#ffd700'}}>★</span>}</span>
                     </div>
                     <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-action" style={{ fontSize: '0.8em', padding: '4px 8px', margin: 0, width: 'auto' }} onClick={() => improveRelations(f.id)}>
                          贈呈
                        </button>
                        {!isAlly && (
                          <button className="btn btn-action" style={{ fontSize: '0.8em', padding: '4px 8px', margin: 0, width: 'auto' }} onClick={() => formAlliance(f.id)}>
                            結盟
                          </button>
                        )}
                     </div>
                  </div>
                );
              })}
              {factions.filter(f => f.id !== playerFaction?.id).length === 0 && (
                <p className="no-action">天下已統一。</p>
              )}
            </div>
          )}
          {activeCommandCategory === '謀略' && (
            
          {activeCommandCategory === '謀略' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {city.adjacentCityIds.map(adjId => {
                const adjCity = cities.find(c => c.id === adjId);
                if (!adjCity || adjCity.factionId === playerFaction?.id || !adjCity.factionId) return null;
                const targetFaction = factions.find(f => f.id === adjCity.factionId);
                return (
                  <div key={adjCity.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontWeight: 'bold' }}>{adjCity.name}</span>
                       <span style={{ fontSize: '0.8em', color: targetFaction?.color }}>{targetFaction?.name}</span>
                    </div>
                    <button className="btn btn-action" style={{ fontSize: '0.8em', padding: '4px 8px', margin: 0, width: 'auto' }} onClick={() => rumor(adjCity.id)}>
                      流言 (500金)
                    </button>
                  </div>
                );
              })}
              {city.adjacentCityIds.every(adjId => {
                const adjCity = cities.find(c => c.id === adjId);
                return !adjCity || adjCity.factionId === playerFaction?.id || !adjCity.factionId;
              }) && (
                <p className="no-action">周邊無可施計的敵城。</p>
              )}
            </div>
          )}

          )}
        </div>
      )}
    </div>
  );
}
