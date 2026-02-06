import { create } from 'zustand';
import type { GamePhase, Scenario, Faction, City, Officer, CommandCategory } from '../types';

interface GameState {
  phase: GamePhase;
  /** Current scenario data */
  scenario: Scenario | null;
  /** Currently selected player faction */
  playerFaction: Faction | null;
  /** Live game cities (mutable copy from scenario) */
  cities: City[];
  /** Live game officers */
  officers: Officer[];
  /** Live game factions */
  factions: Faction[];
  /** Current game year / month */
  year: number;
  month: number;
  /** Currently selected city (for commands) */
  selectedCityId: number | null;
  /** Current command menu category */
  activeCommandCategory: CommandCategory | null;
  /** Game log messages */
  log: string[];

  // Actions
  setPhase: (phase: GamePhase) => void;
  selectScenario: (scenario: Scenario) => void;
  selectFaction: (factionId: number) => void;
  selectCity: (cityId: number | null) => void;
  setActiveCommandCategory: (cat: CommandCategory | null) => void;
  addLog: (message: string) => void;
  endTurn: () => void;
  /** Domestic: develop commerce */
  developCommerce: (cityId: number) => void;
  /** Domestic: develop agriculture */
  developAgriculture: (cityId: number) => void;
  /** Domestic: reinforce defense */
  reinforceDefense: (cityId: number) => void;
  /** Personnel: recruit unaffiliated officers in city */
  recruitOfficer: (officerId: number) => void;
  /** Military: draft troops */
  draftTroops: (cityId: number, amount: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  scenario: null,
  playerFaction: null,
  cities: [],
  officers: [],
  factions: [],
  year: 190,
  month: 1,
  selectedCityId: null,
  activeCommandCategory: null,
  log: [],

  setPhase: (phase) => set({ phase }),

  selectScenario: (scenario) => set({
    scenario,
    cities: scenario.cities.map(c => ({ ...c })),
    officers: scenario.officers.map(o => ({ ...o })),
    factions: scenario.factions.map(f => ({ ...f })),
    year: scenario.year,
    month: 1,
    phase: 'faction',
  }),

  selectFaction: (factionId) => {
    const state = get();
    const faction = state.factions.find(f => f.id === factionId);
    if (!faction) return;
    set({
      factions: state.factions.map(f => ({
        ...f,
        isPlayer: f.id === factionId,
      })),
      playerFaction: { ...faction, isPlayer: true },
      phase: 'playing',
      log: [`${faction.name}，天命所歸。${state.year}年${state.month}月，征途開始！`],
    });
  },

  selectCity: (cityId) => set({ selectedCityId: cityId, activeCommandCategory: null }),

  setActiveCommandCategory: (cat) => set({ activeCommandCategory: cat }),

  addLog: (message) => set(state => ({
    log: [...state.log.slice(-49), message],
  })),

  endTurn: () => {
    const state = get();
    let newMonth = state.month + 1;
    let newYear = state.year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    // Simple AI: each non-player faction develops a random owned city
    const updatedCities = state.cities.map(c => {
      // Monthly income for all cities with factions
      if (c.factionId !== null) {
        return {
          ...c,
          gold: c.gold + Math.floor(c.commerce * 0.5),
          food: c.food + Math.floor(c.agriculture * 0.8),
        };
      }
      return c;
    });

    // Restore officer stamina
    const updatedOfficers = state.officers.map(o => ({
      ...o,
      stamina: Math.min(100, o.stamina + 20),
    }));

    set({
      month: newMonth,
      year: newYear,
      cities: updatedCities,
      officers: updatedOfficers,
      selectedCityId: null,
      activeCommandCategory: null,
      log: [...state.log.slice(-49), `── ${newYear}年${newMonth}月 ──`],
    });
  },

  developCommerce: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 500) {
      get().addLog('金不足，無法開發商業。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    const bonus = governor ? Math.floor(governor.politics / 10) : 3;
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, commerce: Math.min(999, c.commerce + 10 + bonus), gold: c.gold - 500 }
          : c
      ),
    });
    get().addLog(`${city.name}：商業發展 +${10 + bonus}（花費 500 金）`);
  },

  developAgriculture: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 500) {
      get().addLog('金不足，無法開發農業。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    const bonus = governor ? Math.floor(governor.politics / 10) : 3;
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, agriculture: Math.min(999, c.agriculture + 10 + bonus), gold: c.gold - 500 }
          : c
      ),
    });
    get().addLog(`${city.name}：農業發展 +${10 + bonus}（花費 500 金）`);
  },

  reinforceDefense: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 300) {
      get().addLog('金不足，無法強化城防。');
      return;
    }
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, defense: Math.min(100, c.defense + 5), gold: c.gold - 300 }
          : c
      ),
    });
    get().addLog(`${city.name}：城防強化 +5（花費 300 金）`);
  },

  recruitOfficer: (officerId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.factionId !== null) return;
    const playerFaction = state.playerFaction;
    if (!playerFaction) return;

    // Charisma check: ruler charisma vs officer politics
    const ruler = state.officers.find(o => o.id === playerFaction.rulerId);
    const chance = ruler ? Math.min(90, 30 + ruler.charisma - officer.politics) : 30;
    const success = Math.random() * 100 < chance;

    if (success) {
      set({
        officers: state.officers.map(o =>
          o.id === officerId
            ? { ...o, factionId: playerFaction.id, loyalty: 60 }
            : o
        ),
      });
      get().addLog(`${officer.name} 加入了我軍！忠誠 60`);
    } else {
      get().addLog(`${officer.name} 拒絕了招攬。`);
    }
  },

  draftTroops: (cityId, amount) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return;
    const goldCost = amount * 2;
    const foodCost = amount * 3;
    if (city.gold < goldCost || city.food < foodCost) {
      get().addLog('資源不足，無法徵兵。');
      return;
    }
    const maxDraft = Math.floor(city.population * 0.1);
    const actual = Math.min(amount, maxDraft);
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? {
              ...c,
              troops: c.troops + actual,
              gold: c.gold - actual * 2,
              food: c.food - actual * 3,
              population: c.population - actual,
            }
          : c
      ),
    });
    get().addLog(`${city.name}：徵兵 ${actual} 人`);
  },
}));
