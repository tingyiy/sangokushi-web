import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { localizedName } from '../../i18n/dataNames';
import type { CommandCategory, OfficerRank } from '../../types';
import { FormationDialog } from '../FormationDialog';
import { TransportDialog } from '../TransportDialog';
import { OfficerSelectionOverlay } from '../OfficerSelectionOverlay';
import { hasSkill } from '../../utils/skills';
import { meetsRankRequirements, hasRankSlot } from '../../utils/officers';

const categories: CommandCategory[] = ['domestic', 'military', 'personnel', 'diplomacy', 'strategy', 'end'];

export function CommandMenu() {
  const { t } = useTranslation();
  const {
    selectedCityId, cities, officers, factions, playerFaction,
    activeCommandCategory, setActiveCommandCategory,
    developCommerce, developAgriculture, reinforceDefense,
    developFloodControl, developTechnology, trainTroops, manufacture, disasterRelief,
    recruitOfficer, searchOfficer, recruitPOW, rewardOfficer, executeOfficer, dismissOfficer, appointGovernor, appointAdvisor,
    draftTroops, transferOfficer,
    improveRelations, formAlliance, requestJointAttack, proposeCeasefire, demandSurrender, breakAlliance, exchangeHostage,
    counterEspionage, inciteRebellion, arson, spy, gatherIntelligence, rumor,
    endTurn, addLog, setTaxRate, promoteOfficer
  } = useGameStore();

  const [dialog, setDialog] = useState<{ type: 'formation' | 'transport', targetCityId: number } | null>(null);
  const [selection, setSelection] = useState<{
    title: string;
    onSelect: (officerId: number) => void;
  } | null>(null);
  const [draftAmount, setDraftAmount] = useState<number>(0);

  const city = cities.find(c => c.id === selectedCityId);
  const isOwnCity = city?.factionId === playerFaction?.id;
  const governor = officers.find(o => o.cityId === selectedCityId && o.isGovernor);

  const handleCategory = (cat: CommandCategory) => {
    if (cat === 'end') {
      endTurn();
      return;
    }
    if (!isOwnCity) return;
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

  const openOfficerSelection = (title: string, action: (officerId: number) => void) => {
    if (ownOfficers.length === 0) {
      addLog(t('command.noOfficersAvailable'));
      return;
    }
    setSelection({ title, onSelect: action });
  };

  const executeWithOfficer = (title: string, action: (officerId: number) => void) => {
    openOfficerSelection(title, (officerId) => {
      const officer = officers.find(o => o.id === officerId);
      if (officer) {
        addLog(t('command.officerExecute', { name: localizedName(officer.name), action: title }));
      }
      action(officerId);
      setSelection(null);
    });
  };

  return (
    <div className="command-menu">
      <div className="command-categories">
        {categories.map(cat => {
          const disabled = cat !== 'end' && !isOwnCity;
          return (
          <button
            key={cat}
            className={`btn btn-cmd ${activeCommandCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategory(cat)}
            disabled={disabled}
          >
            {t(`command.category.${cat}`)}
          </button>
          );
        })}
      </div>

      {activeCommandCategory && isOwnCity && city && (
        <div className="command-actions">
          {activeCommandCategory === 'domestic' && (
            <>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.developCommerce'), (oid) => developCommerce(city.id, oid))}>{t('command.domestic.developCommerce')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.developAgriculture'), (oid) => developAgriculture(city.id, oid))}>{t('command.domestic.developAgriculture')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.reinforceDefense'), (oid) => reinforceDefense(city.id, oid))}>{t('command.domestic.reinforceDefense')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.floodControl'), (oid) => developFloodControl(city.id, oid))}>{t('command.domestic.floodControl')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.developTechnology'), (oid) => developTechnology(city.id, oid))}>{t('command.domestic.developTechnology')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.trainTroops'), (oid) => trainTroops(city.id, oid))}>{t('command.domestic.trainTroops')}</button>
              
              <div className="sub-menu">
                <h5>{t('command.domestic.taxRate')}</h5>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className={`btn-tiny ${city.taxRate === 'low' ? 'active-tax' : ''}`} onClick={() => setTaxRate(city.id, 'low')}>{t('command.domestic.taxLow')}</button>
                  <button className={`btn-tiny ${city.taxRate === 'medium' ? 'active-tax' : ''}`} onClick={() => setTaxRate(city.id, 'medium')}>{t('command.domestic.taxMedium')}</button>
                  <button className={`btn-tiny ${city.taxRate === 'high' ? 'active-tax' : ''}`} onClick={() => setTaxRate(city.id, 'high')}>{t('command.domestic.taxHigh')}</button>
                </div>
              </div>

              <div className="sub-menu">
                <h5>{t('command.domestic.manufacture')}</h5>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 30} onClick={() => executeWithOfficer(t('command.action.manufactureCrossbows'), (oid) => manufacture(city.id, 'crossbows', oid))}>{t('command.domestic.manufactureCrossbows')}</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 40} onClick={() => executeWithOfficer(t('command.action.manufactureWarHorses'), (oid) => manufacture(city.id, 'warHorses', oid))}>{t('command.domestic.manufactureWarHorses')}</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 60} onClick={() => executeWithOfficer(t('command.action.manufactureBatteringRams'), (oid) => manufacture(city.id, 'batteringRams', oid))}>{t('command.domestic.manufactureBatteringRams')}</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 80} onClick={() => executeWithOfficer(t('command.action.manufactureCatapults'), (oid) => manufacture(city.id, 'catapults', oid))}>{t('command.domestic.manufactureCatapults')}</button>
              </div>
              
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.disasterRelief'), (oid) => disasterRelief(city.id, oid))}>{t('command.domestic.disasterRelief')}</button>
            </>
          )}

          {activeCommandCategory === 'military' && (
            <>
              {(() => {
                const maxDraft = Math.floor(city.population * 0.1);
                const troopCap = Math.floor(city.population * 0.12);
                const room = Math.max(0, troopCap - city.troops);
                const maxAllowed = Math.min(maxDraft, room);
                const goldMax = Math.floor(city.gold / 2);
                const foodMax = Math.floor(city.food / 3);
                const effectiveMax = Math.max(0, Math.min(maxAllowed, goldMax, foodMax));
                const atCap = room <= 0;
                const goldCost = draftAmount * 2;
                const foodCost = draftAmount * 3;
                return (
                  <div className="sub-menu">
                    <h5>{t('command.military.draft')}</h5>
                    <div style={{ fontSize: '0.75em', color: '#999', marginBottom: '4px' }}>
                      {t('command.military.draftCapInfo', { cap: troopCap.toLocaleString(), current: city.troops.toLocaleString(), room: room.toLocaleString() })}
                    </div>
                    {atCap ? (
                      <div style={{ fontSize: '0.85em', color: '#ff6b6b' }}>{t('command.military.draftAtCap')}</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            min={0}
                            max={effectiveMax}
                            step={1000}
                            value={draftAmount}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              setDraftAmount(isNaN(v) ? 0 : Math.max(0, Math.min(v, effectiveMax)));
                            }}
                            className="draft-input"
                          />
                          <button className="btn-tiny" onClick={() => setDraftAmount(effectiveMax)}>
                            {t('command.military.draftMax')}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.7em', color: '#888', margin: '3px 0' }}>
                          {t('command.military.draftCost')}
                          {draftAmount > 0 && ` → ${goldCost.toLocaleString()}${t('city.gold')} ${foodCost.toLocaleString()}${t('city.food')}`}
                        </div>
                        <button
                          className="btn btn-action"
                          disabled={draftAmount <= 0}
                          onClick={() => {
                            const amount = draftAmount;
                            executeWithOfficer(t('command.action.draft'), (oid) => draftTroops(city.id, amount, oid));
                            setDraftAmount(0);
                          }}
                        >
                          {t('command.military.draftConfirm')}{draftAmount > 0 ? ` ${draftAmount.toLocaleString()}` : ''}
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
              
              <div className="sub-menu">
                <h5>{t('command.military.transport')}</h5>
                {city.adjacentCityIds.map(adjId => {
                  const adjCity = cities.find(c => c.id === adjId);
                  if (!adjCity || adjCity.factionId !== playerFaction?.id) return null;
                  return (
                    <button key={adjId} className="btn btn-action btn-small" onClick={() => setDialog({ type: 'transport', targetCityId: adjId })}>
                      {t('command.military.transportTo', { cityName: localizedName(adjCity.name) })}
                    </button>
                  );
                })}
              </div>

              <div className="sub-menu">
                <h5>{t('command.military.attack')}</h5>
                {city.adjacentCityIds.map(adjId => {
                  const adjCity = cities.find(c => c.id === adjId);
                  if (!adjCity || adjCity.factionId === playerFaction?.id) return null;
                  return (
                    <button key={adjId} className="btn btn-action" onClick={() => setDialog({ type: 'formation', targetCityId: adjId })}>
                      {t('command.military.attackCity', { cityName: localizedName(adjCity.name) })}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeCommandCategory === 'personnel' && (
            <>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.personnel.search'), (oid) => searchOfficer(city.id, oid))}>{t('command.personnel.search')}</button>
              
              {unaffiliated.length > 0 && (
                <div className="sub-menu">
                  <h5>{t('command.personnel.recruit')}</h5>
                  {unaffiliated.map(o => (
                    <button key={o.id} className="btn btn-action btn-small" onClick={() => executeWithOfficer(t('command.personnel.recruit'), (oid) => recruitOfficer(o.id, oid))}>{localizedName(o.name)}</button>
                  ))}
                </div>
              )}

              {pows.length > 0 && (
                <div className="sub-menu">
                  <h5>{t('command.personnel.handlePOW')}</h5>
                  {pows.map(o => (
                    <div key={o.id} style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-action btn-small" onClick={() => executeWithOfficer(t('command.personnel.recruitPOW', { name: localizedName(o.name) }), (oid) => recruitPOW(o.id, oid))}>{t('command.personnel.recruitPOW', { name: localizedName(o.name) })}</button>
                      <button className="btn btn-action btn-small btn-danger" onClick={() => executeOfficer(o.id)}>{t('command.personnel.execute')}</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="sub-menu">
                <h5>{t('command.personnel.reward')}</h5>
                <div className="scroll-box">
                  {ownOfficers.filter(o => o.loyalty < 100).map(o => (
                    <button key={o.id} className="btn btn-action btn-small" onClick={() => rewardOfficer(o.id, 'gold', 1000)}>{t('command.personnel.officerLoyalty', { name: localizedName(o.name), loyalty: o.loyalty })}</button>
                  ))}
                </div>
              </div>

              <div className="sub-menu">
                <h5>{t('command.personnel.appointTransfer')}</h5>
                <div className="scroll-box">
                  {ownOfficers.map(o => {
                    const isRuler = o.id === playerFaction?.rulerId;
                    const isAdvisor = o.id === playerFaction?.advisorId;
                    const isGovernor = o.isGovernor;
                    // RTK IV R-001: ruler is always governor in their city — no other governor can be appointed
                    const rulerInCity = ownOfficers.some(off => off.id === playerFaction?.rulerId);
                    return (
                    <div key={o.id} className="officer-row">
                      <span>{localizedName(o.name)}</span>
                      <div className="btn-group">
                        {isRuler ? (
                          <>
                            <span className="ruler-badge">{t('command.personnel.rulerLabel')}</span>
                            <span className="role-badge governor">{t('command.personnel.appointGovernor')}</span>
                          </>
                        ) : (
                          <>
                            {rulerInCity
                              ? null  /* Can't appoint governor when ruler is in city */
                              : isGovernor
                                ? <span className="role-badge governor">{t('command.personnel.appointGovernor')}</span>
                                : <button className="btn-tiny" onClick={() => appointGovernor(city.id, o.id)}>{t('command.personnel.appointGovernor')}</button>
                            }
                            {isAdvisor
                              ? <span className="role-badge advisor">{t('command.personnel.appointAdvisor')}</span>
                              : <button className="btn-tiny" onClick={() => appointAdvisor(o.id)}>{t('command.personnel.appointAdvisor')}</button>
                            }
                            <select className="select-tiny" value={o.rank} onChange={(e) => promoteOfficer(o.id, e.target.value as OfficerRank)}>
                               {(['common', 'attendant', 'advisor', 'general', 'viceroy'] as OfficerRank[]).map(rank => {
                                 const factionCityCount = cities.filter(c => c.factionId === playerFaction?.id).length;
                                 const eligible = meetsRankRequirements(o, rank);
                                 const slotOpen = hasRankSlot(rank, playerFaction?.id ?? 0, officers, factionCityCount, o.id);
                                 const disabled = !eligible || !slotOpen;
                                 return (
                                   <option key={rank} value={rank} disabled={disabled}>
                                     {t(`data:rank.${rank}`)}{disabled && rank !== o.rank ? ' ✕' : ''}
                                   </option>
                                 );
                               })}
                            </select>
                          </>
                        )}
                        <select className="select-tiny" onChange={(e) => {
                          if (!e.target.value) return;
                          transferOfficer(o.id, parseInt(e.target.value));
                        }}>
                           <option value="">{t('command.personnel.transfer')}</option>
                           {city.adjacentCityIds.map(adjId => {
                              const adjCity = cities.find(c => c.id === adjId);
                              if (adjCity && adjCity.factionId === playerFaction?.id) {
                                return <option key={adjId} value={adjId}>{localizedName(adjCity.name)}</option>;
                              }
                              return null;
                           })}
                        </select>
                        {!isRuler && <button className="btn-tiny btn-danger" onClick={() => dismissOfficer(o.id)}>{t('command.personnel.dismiss')}</button>}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeCommandCategory === 'diplomacy' && (
            <div className="diplomacy-list">
              {factions.filter(f => f.id !== playerFaction?.id).map(f => {
                const hostility = playerFaction?.relations?.[f.id] ?? 60;
                const isAlly = playerFaction?.allies?.includes(f.id);
                return (
                  <div key={f.id} className="faction-item">
                     <div className="faction-header">
                        <span style={{ color: f.color, fontWeight: 'bold' }}>{localizedName(f.name)}</span>
                        <span className="hostility">{t('command.diplomacy.hostility', { value: hostility })} {isAlly && <span style={{color: '#ffd700'}}>★</span>}</span>
                     </div>
                     <div className="faction-actions">
                        <button className="btn-tiny" onClick={() => executeWithOfficer(t('command.diplomacy.improveRelations'), (oid) => improveRelations(f.id, oid))}>{t('command.diplomacy.improveRelations')}</button>
                        {!isAlly ? (
                          <button className="btn-tiny" onClick={() => executeWithOfficer(t('command.diplomacy.formAlliance'), (oid) => formAlliance(f.id, oid))}>{t('command.diplomacy.formAlliance')}</button>
                        ) : (
                          <button className="btn-tiny btn-danger" onClick={() => breakAlliance(f.id)}>{t('command.diplomacy.breakAlliance')}</button>
                        )}
                        {isAlly && (
                          <button className="btn-tiny" onClick={() => executeWithOfficer(t('command.diplomacy.jointAttack'), (oid) => requestJointAttack(f.id, city.adjacentCityIds[0], oid))}>{t('command.diplomacy.jointAttack')}</button>
                        )}
                        <button className="btn-tiny" onClick={() => executeWithOfficer(t('command.diplomacy.ceasefire'), (oid) => proposeCeasefire(f.id, oid))}>{t('command.diplomacy.ceasefire')}</button>
                        <button className="btn-tiny" onClick={() => executeWithOfficer(t('command.diplomacy.demandSurrender'), (oid) => demandSurrender(f.id, oid))}>{t('command.diplomacy.demandSurrender')}</button>
                        <button className="btn-tiny" onClick={() => exchangeHostage(ownOfficers[0]?.id, f.id)} disabled={ownOfficers.length === 0}>{t('command.diplomacy.hostage')}</button>
                     </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeCommandCategory === 'strategy' && (
            <div className="strategy-list">
              {city.adjacentCityIds.map(adjId => {
                const adjCity = cities.find(c => c.id === adjId);
                if (!adjCity || adjCity.factionId === playerFaction?.id || !adjCity.factionId) return null;
                const targetFaction = factions.find(f => f.id === adjCity.factionId);
                const targetOfficers = officers.filter(o => o.cityId === adjId && o.factionId === adjCity.factionId);
                
                return (
                  <div key={adjCity.id} className="strategy-city-item">
                    <div className="strategy-city-header">
                       <span className="city-name">{localizedName(adjCity.name)}</span>
                       <span className="faction-name" style={{ color: targetFaction?.color }}>{localizedName(targetFaction?.name ?? '')}</span>
                    </div>
                    <div className="strategy-actions">
                       <button className="btn-tiny" onClick={() => executeWithOfficer(t('command.strategy.rumor'), (oid) => rumor(adjCity.id, oid))} title="rumor">{t('command.strategy.rumor')}</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'arson')} onClick={() => executeWithOfficer(t('command.strategy.arson'), (oid) => arson(adjCity.id, oid))} title="arson">{t('command.strategy.arson')}</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'tigerTrap')} onClick={() => executeWithOfficer(t('command.strategy.incite'), (oid) => inciteRebellion(adjCity.id, oid))} title="incite">{t('command.strategy.incite')}</button>
                       <button className="btn-tiny" disabled={!governor || (!hasSkill(governor, 'intelligence') && !hasSkill(governor, 'espionage'))} onClick={() => executeWithOfficer(t('command.strategy.spy'), (oid) => spy(adjCity.id, oid))} title="espionage">{t('command.strategy.spy')}</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'intelligence')} onClick={() => executeWithOfficer(t('command.strategy.gatherIntel'), (oid) => gatherIntelligence(adjCity.id, oid))} title="gatherIntel">{t('command.strategy.gatherIntel')}</button>
                       {targetOfficers.length > 0 && (
                         <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'provoke')} onClick={() => executeWithOfficer(t('command.strategy.counterEspionage'), (oid) => counterEspionage(adjCity.id, targetOfficers[0].id, oid))} title="counterEspionage">{t('command.strategy.counterEspionage')}</button>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selection && (
        <OfficerSelectionOverlay
          officers={ownOfficers}
          title={selection.title}
          onSelect={selection.onSelect}
          onClose={() => setSelection(null)}
        />
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
        .active-tax { background: #2a6a4a !important; border-color: #4a8a6a !important; }
        .btn-tiny:disabled { opacity: 0.4; cursor: not-allowed; }
        .draft-input { width: 80px; background: #222; color: #eee; border: 1px solid #666; padding: 3px 6px; font-size: 0.85em; border-radius: 2px; }
        .btn-danger { color: #ff6b6b; border-color: #633; }
        .scroll-box { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .officer-row { display: flex; justify-content: space-between; align-items: center; padding: 4px; border-bottom: 1px solid #333; font-size: 0.9em; flex-wrap: wrap; gap: 2px; }
        .btn-group { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
        .select-tiny { font-size: 0.75em; background: #333; color: #eee; border: 1px solid #666; }
        .ruler-badge { font-size: 0.75em; padding: 2px 6px; background: #8b6914; color: #ffd700; border: 1px solid #ffd700; border-radius: 2px; font-weight: bold; }
        .role-badge { font-size: 0.75em; padding: 2px 6px; border-radius: 2px; font-weight: bold; }
        .role-badge.governor { background: #2a5a2a; color: #6fbf6f; border: 1px solid #6fbf6f; }
        .role-badge.advisor { background: #2a3a5a; color: #6f9fbf; border: 1px solid #6f9fbf; }
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
