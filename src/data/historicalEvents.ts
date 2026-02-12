import type { GameEvent } from '../types';
import type { GameState } from '../store/gameStore';
import i18next from 'i18next';

/**
 * Historical Events - Phase 6.5
 * Only trigger in 'historical' game mode at specific dates.
 */
export const historicalEvents = [
  {
    id: 'chibi',
    name: () => i18next.t('logs:event.chibi.name'),
    description: () => i18next.t('logs:event.chibi.description'),
    triggerConditions: (state: GameState) => 
      state.gameSettings.gameMode === 'historical' && state.year === 208 && state.month === 11,
    effects: () => i18next.t('logs:event.chibi.effects'),
    mutate: (state: GameState) => {
        // Reduce troops for Cao Cao faction (id: 1)
        const updatedCities = state.cities.map(c => 
            c.factionId === 1 ? { ...c, troops: Math.floor(c.troops * 0.6) } : c
        );
        return { cities: updatedCities };
    }
  },
  {
    id: 'caocao_death',
    name: () => i18next.t('logs:event.caocaoDeath.name'),
    description: () => i18next.t('logs:event.caocaoDeath.description'),
    triggerConditions: (state: GameState) => 
      state.gameSettings.gameMode === 'historical' && state.year === 220 && state.month === 1,
    effects: () => i18next.t('logs:event.caocaoDeath.effects'),
    mutate: (state: GameState) => {
        // Change ruler of Cao Cao faction (id: 1) to Cao Pi (id: 17)
        const updatedFactions = state.factions.map(f => 
            f.id === 1 ? { ...f, rulerId: 17 } : f
        );
        // Ensure Cao Pi is in faction 1
        const updatedOfficers = state.officers.map(o => 
            o.id === 17 ? { ...o, factionId: 1, isGovernor: true } : o
        );
        return { factions: updatedFactions, officers: updatedOfficers };
    }
  }
];

export function checkHistoricalEvents(state: GameState): (GameEvent & { mutate?: (state: GameState) => Partial<GameState> })[] {
  const triggered: (GameEvent & { mutate?: (state: GameState) => Partial<GameState> })[] = [];
  
  historicalEvents.forEach(event => {
    if (event.triggerConditions(state)) {
      triggered.push({
        id: event.id,
        type: 'historical',
        name: event.name(),
        description: `${event.description()}

${i18next.t('logs:event.effectsLabel', { effects: event.effects() })}`,
        year: state.year,
        month: state.month,
        mutate: event.mutate
      });
    }
  });
  
  return triggered;
}
