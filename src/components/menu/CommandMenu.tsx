import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { localizedName } from '../../i18n/dataNames';
import type { CommandCategory } from '../../types';
import { FormationDialog } from '../FormationDialog';
import { TransportDialog } from '../TransportDialog';
import { OfficerSelectionOverlay } from '../OfficerSelectionOverlay';
import { hasSkill } from '../../utils/skills';

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

  const city = cities.find(c => c.id === selectedCityId);
  const isOwnCity = city?.factionId === playerFaction?.id;
  const governor = officers.find(o => o.cityId === selectedCityId && o.isGovernor);

  const handleCategory = (cat: CommandCategory) => {
    if (cat === 'end') {
      endTurn();
      return;
    }
    if (!isOwnCity) {
      addLog(t('command.notYourCity'));
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

  const openOfficerSelection = (title: string, action: (officerId: number) => void) => {
    if (ownOfficers.length === 0) {
      addLog(t('command.noOfficersAvailable'));
      return;
    }
    setSelection({ title, onSelect: action });
  };

  const executeWithOfficer = (title: string, action: () => void) => {
    openOfficerSelection(title, (officerId) => {
      const officer = officers.find(o => o.id === officerId);
      if (officer) {
        addLog(t('command.officerExecute', { name: localizedName(officer.name), action: title }));
      }
      action();
      setSelection(null);
    });
  };

  return (
    <div className="command-menu">
      <div className="command-categories">
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn btn-cmd ${activeCommandCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategory(cat)}
          >
            {t(`command.category.${cat}`)}
          </button>
        ))}
      </div>

      {activeCommandCategory && isOwnCity && city && (
        <div className="command-actions">
          {activeCommandCategory === 'domestic' && (
            <>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.developCommerce'), () => developCommerce(city.id))}>{t('command.domestic.developCommerce')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.developAgriculture'), () => developAgriculture(city.id))}>{t('command.domestic.developAgriculture')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.reinforceDefense'), () => reinforceDefense(city.id))}>{t('command.domestic.reinforceDefense')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.floodControl'), () => developFloodControl(city.id))}>{t('command.domestic.floodControl')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.developTechnology'), () => developTechnology(city.id))}>{t('command.domestic.developTechnology')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.trainTroops'), () => trainTroops(city.id))}>{t('command.domestic.trainTroops')}</button>
              
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
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 30} onClick={() => executeWithOfficer(t('command.action.manufactureCrossbows'), () => manufacture(city.id, 'crossbows'))}>{t('command.domestic.manufactureCrossbows')}</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 40} onClick={() => executeWithOfficer(t('command.action.manufactureWarHorses'), () => manufacture(city.id, 'warHorses'))}>{t('command.domestic.manufactureWarHorses')}</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 60} onClick={() => executeWithOfficer(t('command.action.manufactureBatteringRams'), () => manufacture(city.id, 'batteringRams'))}>{t('command.domestic.manufactureBatteringRams')}</button>
                <button className="btn btn-action btn-small" disabled={!governor || !hasSkill(governor, 'manufacture') || (city.technology || 0) < 80} onClick={() => executeWithOfficer(t('command.action.manufactureCatapults'), () => manufacture(city.id, 'catapults'))}>{t('command.domestic.manufactureCatapults')}</button>
              </div>
              
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.disasterRelief'), () => disasterRelief(city.id))}>{t('command.domestic.disasterRelief')}</button>
            </>
          )}

          {activeCommandCategory === 'military' && (
            <>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.draft1000'), () => draftTroops(city.id, 1000))}>{t('command.military.draft1000')}</button>
              <button className="btn btn-action" onClick={() => executeWithOfficer(t('command.action.draft5000'), () => draftTroops(city.id, 5000))}>{t('command.military.draft5000')}</button>
              
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
              <button className="btn btn-action" onClick={() => searchOfficer(city.id)}>{t('command.personnel.search')}</button>
              
              {unaffiliated.length > 0 && (
                <div className="sub-menu">
                  <h5>{t('command.personnel.recruit')}</h5>
                  {unaffiliated.map(o => (
                    <button key={o.id} className="btn btn-action btn-small" onClick={() => recruitOfficer(o.id)}>{localizedName(o.name)}</button>
                  ))}
                </div>
              )}

              {pows.length > 0 && (
                <div className="sub-menu">
                  <h5>{t('command.personnel.handlePOW')}</h5>
                  {pows.map(o => (
                    <div key={o.id} style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-action btn-small" onClick={() => recruitPOW(o.id)}>{t('command.personnel.recruitPOW', { name: localizedName(o.name) })}</button>
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
                  {ownOfficers.map(o => (
                    <div key={o.id} className="officer-row">
                      <span>{localizedName(o.name)}</span>
                      <div className="btn-group">
                        {!o.isGovernor && <button className="btn-tiny" onClick={() => appointGovernor(city.id, o.id)}>{t('command.personnel.appointGovernor')}</button>}
                        <button className="btn-tiny" onClick={() => appointAdvisor(o.id)}>{t('command.personnel.appointAdvisor')}</button>
                        <select className="select-tiny" value={o.rank} onChange={(e) => promoteOfficer(o.id, e.target.value as import('../../types').OfficerRank)}>
                           <option value="common">{t('data:rank.common')}</option>
                           <option value="attendant">{t('data:rank.attendant')}</option>
                           <option value="advisor">{t('data:rank.advisor')}</option>
                           <option value="general">{t('data:rank.general')}</option>
                           <option value="viceroy">{t('data:rank.viceroy')}</option>
                        </select>
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
                        {o.id !== playerFaction?.rulerId && <button className="btn-tiny btn-danger" onClick={() => dismissOfficer(o.id)}>{t('command.personnel.dismiss')}</button>}
                      </div>
                    </div>
                  ))}
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
                        <button className="btn-tiny" onClick={() => improveRelations(f.id)}>{t('command.diplomacy.improveRelations')}</button>
                        {!isAlly ? (
                          <button className="btn-tiny" onClick={() => formAlliance(f.id)}>{t('command.diplomacy.formAlliance')}</button>
                        ) : (
                          <button className="btn-tiny btn-danger" onClick={() => breakAlliance(f.id)}>{t('command.diplomacy.breakAlliance')}</button>
                        )}
                        {isAlly && (
                          <button className="btn-tiny" onClick={() => requestJointAttack(f.id, city.adjacentCityIds[0])}>{t('command.diplomacy.jointAttack')}</button>
                        )}
                        <button className="btn-tiny" onClick={() => proposeCeasefire(f.id)}>{t('command.diplomacy.ceasefire')}</button>
                        <button className="btn-tiny" onClick={() => demandSurrender(f.id)}>{t('command.diplomacy.demandSurrender')}</button>
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
                       <button className="btn-tiny" onClick={() => rumor(adjCity.id)} title="rumor">{t('command.strategy.rumor')}</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'arson')} onClick={() => arson(adjCity.id)} title="arson">{t('command.strategy.arson')}</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'tigerTrap')} onClick={() => inciteRebellion(adjCity.id)} title="incite">{t('command.strategy.incite')}</button>
                       <button className="btn-tiny" disabled={!governor || (!hasSkill(governor, 'intelligence') && !hasSkill(governor, 'espionage'))} onClick={() => spy(adjCity.id)} title="espionage">{t('command.strategy.spy')}</button>
                       <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'intelligence')} onClick={() => gatherIntelligence(adjCity.id)} title="gatherIntel">{t('command.strategy.gatherIntel')}</button>
                       {targetOfficers.length > 0 && (
                         <button className="btn-tiny" disabled={!governor || !hasSkill(governor, 'provoke')} onClick={() => counterEspionage(adjCity.id, targetOfficers[0].id)} title="counterEspionage">{t('command.strategy.counterEspionage')}</button>
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
