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
      // Logic to reduce Cao Cao's troops, maybe change Jingzhou city owners
      // For now, return description for the event system
      return '曹操勢力部隊大損，孫劉聯盟聲勢大振！';
    }
  },
  {
    id: 'caocao_death',
    name: '曹操歸天',
    description: '一代梟雄曹操在洛陽病逝，其次子曹丕繼位魏王。',
    triggerConditions: (state: GameState) => 
      state.gameSettings.gameMode === 'historical' && state.year === 220 && state.month === 1,
    effects: () => {
      // Find Cao Cao faction and change ruler to Cao Pi
      return '曹操逝世，由曹丕繼任其位。';
    }
  }
];

export function checkHistoricalEvents(state: GameState): GameEvent[] {
  const triggered: GameEvent[] = [];
  
  historicalEvents.forEach(event => {
    if (event.triggerConditions(state)) {
      triggered.push({
        id: event.id,
        type: 'historical',
        name: event.name,
        description: `${event.description}

效果：${event.effects()}`,
        year: state.year,
        month: state.month
      });
    }
  });
  
  return triggered;
}
