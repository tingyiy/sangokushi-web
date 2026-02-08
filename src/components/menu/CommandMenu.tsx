import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { CommandCategory } from '../../types';
import { FormationDialog } from '../FormationDialog';
import { TransportDialog } from '../TransportDialog';
import { hasSkill } from '../../utils/skills';

const categories: CommandCategory[] = ['內政', '軍事', '人事', '外交', '謀略', '結束'];

export function CommandMenu() {
  const {
    selectedCityId, cities, officers, factions, playerFaction,
    activeCommandCategory, setActiveCommandCategory,
    developCommerce, developAgriculture, reinforceDefense,
    developFloodControl, developTechnology, trainTroops, manufacture, disasterRelief,
    recruitOfficer, searchOfficer, recruitPOW, rewardOfficer, executeOfficer, dismissOfficer, appointGovernor, appointAdvisor,
    draftTroops, transferOfficer,
    improveRelations, formAlliance, requestJointAttack, proposeCeasefire, demandSurrender, breakAlliance, exchangeHostage,
    counterEspionage, inciteRebellion, arson, spy, gatherIntelligence, rumor,
    endTurn, addLog,
  } = useGameStore();

  const [dialog, setDialog] = useState<{ type: 'formation' | 'transport', targetCityId: number } | null>(null);

  const city = cities.find(c => c.id === selectedCityId);
  const isOwnCity = city?.factionId === playerFaction?.id;
  const governor = officers.find(o => o.cityId === selectedCityId && o.isGovernor);

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

  const pows = selectedCityId !== null
    ? officers.filter(o => o.cityId === selectedCityId && o.factionId === -1)
    : [];
  
  const ownOfficers = selectedCityId !== null
    ? officers.filter(o => o.cityId === selectedCityId && o.factionId === playerFaction?.id)
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
              <button className="btn btn-action" onClick={() => developCommerce(city.id)}>商業開發（500金）</button>
              <button className="btn btn-action" onClick={() => developAgriculture(city.id)}>農業開發（500金）</button>
              <button className="btn btn-action" onClick={() => reinforceDefense(city.id)}>強化城防（300金）</button>
              <button className="btn btn-action" onClick={() => developFloodControl(city.id)}>治水（500金）</button>
              <button className="btn btn-action" onClick={() => developTechnology(city.id)}>技術開發（800金）</button>
              <button className="btn btn-action" onClick={() => trainTroops(city.id)}>訓練（500糧）</button>
              
              <div className="sub-menu">
                <h5>製造 (1000金)</h5>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, '製造') || (city.technology || 0) < 30} onClick={() => manufacture(city.id, 'crossbows')}>弩</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, '製造') || (city.technology || 0) < 40} onClick={() => manufacture(city.id, 'warHorses')}>軍馬</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, '製造') || (city.technology || 0) < 60} onClick={() => manufacture(city.id, 'batteringRams')}>衝車</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, '製造') || (city.technology || 0) < 80} onClick={() => manufacture(city.id, 'catapults')}>投石機</button>
              </div>
              
              <button className="btn btn-action" onClick={() => disasterRelief(city.id)}>賑災（500金+1000糧）</button>
            </>
          )}

          {activeCommandCategory === '軍事' && (
            <>
              <button className="btn btn-action" onClick={() => draftTroops(city.id, 1000)}>徵兵 1000</button>
              <button className="btn btn-action" onClick={() => draftTroops(city.id, 5000)}>徵兵 5000</button>
              
              <div className="sub-menu">
                <h5>輸送</h5>
                {city.adjacentCityIds.map(adjId => {
                  const adjCity = cities.find(c => c.id === adjId);
                  if (!adjCity || adjCity.factionId !== playerFaction?.id) return null;
                  return (
                    <button key={adjId} className="btn btn-action btn-small" onClick={() => setDialog({ type: 'transport', targetCityId: adjId })}>
                      至 {adjCity.name}
                    </button>
                  );
                })}
              </div>

              <div className="sub-menu">
                <h5>出征</h5>
                {city.adjacentCityIds.map(adjId => {
                  const adjCity = cities.find(c => c.id === adjId);
                  if (!adjCity || adjCity.factionId === playerFaction?.id) return null;
                  return (
                    <button key={adjId} className="btn btn-action" onClick={() => setDialog({ type: 'formation', targetCityId: adjId })}>
                      出征 {adjCity.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeCommandCategory === '人事' && (
            <>
              <button className="btn btn-action" onClick={() => searchOfficer(city.id)}>搜索</button>
              
              {unaffiliated.length > 0 && (
                <div className="sub-menu">
                  <h5>招攬</h5>
                  {unaffiliated.map(o => (
                    <button key={o.id} className="btn btn-action btn-small" onClick={() => recruitOfficer(o.id)}>{o.name}</button>
                  ))}
                </div>
              )}

              {pows.length > 0 && (
                <div className="sub-menu">
                  <h5>處置俘虜</h5>
                  {pows.map(o => (
                    <div key={o.id} style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-action btn-small" onClick={() => recruitPOW(o.id)}>登用 {o.name}</button>
                      <button className="btn btn-action btn-small btn-danger" onClick={() => executeOfficer(o.id)}>處斬</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="sub-menu">
                <h5>褒賞 (1000金)</h5>
                <div className="scroll-box">
                  {ownOfficers.filter(o => o.loyalty < 100).map(o => (
                    <button key={o.id} className="btn btn-action btn-small" onClick={() => rewardOfficer(o.id, 'gold', 1000)}>{o.name} (忠{o.loyalty})</button>
                  ))}
                </div>
              </div>

              <div className="sub-menu">
                <h5>任命 / 移動</h5>
                <div className="scroll-box">
                  {ownOfficers.map(o => (
                    <div key={o.id} className="officer-row">
                      <span>{o.name}</span>
                      <div className="btn-group">
                        {!o.isGovernor && <button className="btn-tiny" onClick={() => appointGovernor(city.id, o.id)}>太守</button>}
                        <button className="btn-tiny" onClick={() => appointAdvisor(o.id)}>軍師</button>
                        <select className="select-tiny" onChange={(e) => transferOfficer(o.id, parseInt(e.target.value))}>
                           <option value="">移動</option>
                           {city.adjacentCityIds.map(adjId => {
                              const adjCity = cities.find(c => c.id === adjId);
                              if (adjCity && adjCity.factionId === playerFaction?.id) {
                                return <option key={adjId} value={adjId}>{adjCity.name}</option>;
                              }
                              return null;
                           })}
                        </select>
                        {o.id !== playerFaction?.rulerId && <button className="btn-tiny btn-danger" onClick={() => dismissOfficer(o.id)}>追放</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeCommandCategory === '外交' && (
            <div className="diplomacy-list">
              {factions.filter(f => f.id !== playerFaction?.id).map(f => {
                const hostility = playerFaction?.relations?.[f.id] ?? 60;
                const isAlly = playerFaction?.allies?.includes(f.id);
                return (
                  <div key={f.id} className="faction-item">
                     <div className="faction-header">
                        <span style={{ color: f.color, fontWeight: 'bold' }}>{f.name}</span>
                        <span className="hostility">敵對: {hostility} {isAlly && <span style={{color: '#ffd700'}}>★</span>}</span>
                     </div>
                     <div className="faction-actions">
                        <button className="btn-tiny" onClick={() => improveRelations(f.id)}>贈呈</button>
                        {!isAlly ? (
                          <button className="btn-tiny" onClick={() => formAlliance(f.id)}>結盟</button>
                        ) : (
                          <button className="btn-tiny btn-danger" onClick={() => breakAlliance(f.id)}>破棄</button>
                        )}
                        {isAlly && (
                          <button className="btn-tiny" onClick={() => requestJointAttack(f.id, city.adjacentCityIds[0])}>共同</button>
                        )}
                        <button className="btn-tiny" onClick={() => proposeCeasefire(f.id)}>停戰</button>
                        <button className="btn-tiny" onClick={() => demandSurrender(f.id)}>勸降</button>
                        <button className="btn-tiny" onClick={() => exchangeHostage(ownOfficers[0]?.id, f.id)} disabled={ownOfficers.length === 0}>人質</button>
                     </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeCommandCategory === '謀略' && (
            <div className="strategy-list">
              {city.adjacentCityIds.map(adjId => {
                const adjCity = cities.find(c => c.id === adjId);
                if (!adjCity || adjCity.factionId === playerFaction?.id || !adjCity.factionId) return null;
                const targetFaction = factions.find(f => f.id === adjCity.factionId);
                const targetOfficers = officers.filter(o => o.cityId === adjId && o.factionId === adjCity.factionId);
                
                return (
                  <div key={adjCity.id} className="strategy-city-item">
                    <div className="strategy-city-header">
                       <span className="city-name">{adjCity.name}</span>
                       <span className="faction-name" style={{ color: targetFaction?.color }}>{targetFaction?.name}</span>
                    </div>
                    <div className="strategy-actions">
                       <button className="btn-tiny" onClick={() => rumor(adjCity.id)} title="流言">流言</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, '燒討')} onClick={() => arson(adjCity.id)} title="放火">放火</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, '驅虎')} onClick={() => inciteRebellion(adjCity.id)} title="煽動">煽動</button>
                       <button className="btn-tiny" disabled={!governor || (!hasSkill(governor, '情報') && !hasSkill(governor, '諜報'))} onClick={() => spy(adjCity.id)} title="諜報">諜報</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, '情報')} onClick={() => gatherIntelligence(adjCity.id)} title="密偵">密偵</button>
                       {targetOfficers.length > 0 && (
                         <button className="btn-tiny" disabled={!governor || !hasSkill(governor, '做敵')} onClick={() => counterEspionage(adjCity.id, targetOfficers[0].id)} title="反間">反間</button>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {dialog?.type === 'formation' && (
        <FormationDialog targetCityId={dialog.targetCityId} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'transport' && (
        <TransportDialog toCityId={dialog.targetCityId} onClose={() => setDialog(null)} />
      )}

      <style>{`
        .sub-menu {
          margin-top: 10px;
          padding: 8px;
          background: rgba(0,0,0,0.15);
          border-radius: 4px;
          width: 100%;
        }
        .sub-menu h5 { margin: 0 0 5px 0; font-size: 0.9em; color: #aaa; border-bottom: 1px solid #444; }
        .btn-small { font-size: 0.8em; padding: 4px 8px; margin: 2px; width: auto; }
        .btn-tiny { font-size: 0.75em; padding: 2px 6px; margin: 1px; background: #444; color: #eee; border: 1px solid #666; cursor: pointer; border-radius: 2px; }
        .btn-tiny:hover { background: #555; }
        .btn-tiny:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-danger { color: #ff6b6b; border-color: #633; }
        .scroll-box { max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .officer-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 4px; border-bottom: 1px solid #333; font-size: 0.9em; }
        .select-tiny { font-size: 0.75em; background: #333; color: #eee; border: 1px solid #666; }
        .diplomacy-list, .strategy-list { width: 100%; display: flex; flex-direction: column; gap: 6px; }
        .faction-item, .strategy-city-item { background: rgba(0,0,0,0.2); padding: 6px; border-radius: 4px; }
        .faction-header, .strategy-city-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .hostility { font-size: 0.8em; color: #aaa; }
        .faction-actions, .strategy-actions { display: flex; flex-wrap: wrap; gap: 2px; }
        .city-name { font-weight: bold; }
        .faction-name { font-size: 0.8em; }
      `}</style>
    </div>
  );
}
