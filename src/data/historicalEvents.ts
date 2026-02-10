import type { GameEvent } from '../types';
import type { GameState } from '../store/gameStore';

/**
 * Historical Events - Phase 6.5
 * Only trigger in 'historical' game mode at specific dates.
 */
export const historicalEvents = [
  {
    id: 'chibi',
    name: '赤壁之戰',
    description: '曹操統一北方後大舉南下，欲一舉平定江東。孫權、劉備組成聯軍，在赤壁以火攻大破曹軍。',
    triggerConditions: (state: GameState) => 
      state.gameSettings.gameMode === 'historical' && state.year === 208 && state.month === 11,
    effects: () => {
      return '曹操勢力部隊大損，孫劉聯盟聲勢大振！';
    },
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
    name: '曹操歸天',
    description: '一代梟雄曹操在洛陽病逝，其次子曹丕繼位魏王。',
    triggerConditions: (state: GameState) => 
      state.gameSettings.gameMode === 'historical' && state.year === 220 && state.month === 1,
    effects: () => {
      return '曹操逝世，由曹丕繼任其位。';
    },
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
        name: event.name,
        description: `${event.description}

效果：${event.effects()}`,
        year: state.year,
        month: state.month,
        mutate: event.mutate
      });
    }
  });
  
  return triggered;
}
