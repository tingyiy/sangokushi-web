import { create } from 'zustand';
import type { GamePhase, Scenario, Faction, City, Officer, CommandCategory, GameSettings } from '../types';
import type { UnitType } from '../types/battle';
import { useBattleStore } from './battleStore';
import { hasSkill } from '../utils/skills';
import { spyingSystem } from '../game/spy/SpyingSystem';

interface DuelState {
  p1: Officer;
  p2: Officer;
  p1Hp: number;
  p2Hp: number;
  round: number;
  turn: 0 | 1;
  logs: string[];
  result: 'win' | 'lose' | 'draw' | 'flee' | null;
}

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
  /** Currently selected faction (for pre-confirm selection) - Phase 0.5 */
  selectedFactionId: number | null;
  /** Game settings - Phase 0.5 */
  gameSettings: GameSettings;
  /** Current game year / month */
  year: number;
  month: number;
  /** Currently selected city (for commands) */
  selectedCityId: number | null;
  /** Current command menu category */
  activeCommandCategory: CommandCategory | null;
  /** Game log messages */
  log: string[];
  /** Duel State */
  duelState: DuelState | null;
  /** Pre-battle formation - Phase 2.2 */
  battleFormation: {
    officerIds: number[];
    unitTypes: UnitType[];
  } | null;

  // Actions
  setPhase: (phase: GamePhase) => void;
  selectScenario: (scenario: Scenario) => void;
  selectFaction: (factionId: number) => void;
  setSelectedFactionId: (factionId: number | null) => void;
  setGameSettings: (settings: Partial<GameSettings>) => void;
  confirmSettings: () => void;
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
  /** Domestic: flood control */
  developFloodControl: (cityId: number) => void;
  /** Domestic: technology */
  developTechnology: (cityId: number) => void;
  /** Domestic: train troops */
  trainTroops: (cityId: number) => void;
  /** Domestic: manufacture weapons */
  manufacture: (cityId: number, weaponType: 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults') => void;
  /** Domestic: disaster relief */
  disasterRelief: (cityId: number) => void;
  /** Personnel: recruit unaffiliated officers in city */
  recruitOfficer: (officerId: number) => void;
  /** Personnel: search for officers/treasures */
  searchOfficer: (cityId: number) => void;
  /** Personnel: recruit POW */
  recruitPOW: (officerId: number) => void;
  /** Personnel: reward officer */
  rewardOfficer: (officerId: number, type: 'gold' | 'treasure', amount?: number) => void;
  /** Personnel: execute POW */
  executeOfficer: (officerId: number) => void;
  /** Personnel: dismiss officer */
  dismissOfficer: (officerId: number) => void;
  /** Personnel: appoint governor */
  appointGovernor: (cityId: number, officerId: number) => void;
  /** Personnel: appoint advisor */
  appointAdvisor: (officerId: number) => void;
  /** Military: draft troops */
  draftTroops: (cityId: number, amount: number) => void;
  /** Military: transport resources */
  transport: (fromCityId: number, toCityId: number, resource: 'gold' | 'food' | 'troops', amount: number) => void;
  /** Military/Personnel: transfer officer */
  transferOfficer: (officerId: number, targetCityId: number) => void;
  /** Military: set battle formation */
  setBattleFormation: (formation: { officerIds: number[]; unitTypes: UnitType[] } | null) => void;
  /** Military: Duel */
  startDuel: () => void;
  duelAction: (action: 'attack' | 'heavy' | 'defend' | 'flee') => void;
  endDuel: () => void;
  /** Military: Battle */
  startBattle: (targetCityId: number) => void;
  /** Diplomacy: Improve relations (Gift) */
  improveRelations: (targetFactionId: number) => void;
  /** Diplomacy: Form Alliance */
  formAlliance: (targetFactionId: number) => void;
  /** Diplomacy: Joint attack */
  requestJointAttack: (allyFactionId: number, targetCityId: number) => void;
  /** Diplomacy: Ceasefire */
  proposeCeasefire: (targetFactionId: number) => void;
  /** Diplomacy: Demand surrender */
  demandSurrender: (targetFactionId: number) => void;
  /** Diplomacy: Break alliance */
  breakAlliance: (targetFactionId: number) => void;
  /** Diplomacy: Exchange hostage */
  exchangeHostage: (officerId: number, targetFactionId: number) => void;
  /** Strategy: Counter-espionage */
  counterEspionage: (targetCityId: number, targetOfficerId: number) => void;
  /** Strategy: Incite rebellion */
  inciteRebellion: (targetCityId: number) => void;
  /** Strategy: Arson */
  arson: (targetCityId: number) => void;
  /** Strategy: Espionage (Spy) */
  spy: (targetCityId: number) => void;
  /** Strategy: Intelligence gathering */
  gatherIntelligence: (targetCityId: number) => void;
  /** 謀略: 流言 (Rumor) - Decrease city loyalty and population */
  rumor: (targetCityId: number) => void;
  /** Battle: Resolve battle consequences - transfer city, capture officers, redistribute troops */
  resolveBattle: (winnerFactionId: number, loserFactionId: number, cityId: number, battleUnits: { officerId: number; troops: number; factionId: number; status: string }[]) => void;
  /** Save/Load: Save game to localStorage slot */
  saveGame: (slot: number) => boolean;
  /** Save/Load: Load game from localStorage slot */
  loadGame: (slot: number) => boolean;
  /** Save/Load: Get list of available save slots */
  getSaveSlots: () => { slot: number; date: string | null; version: string | null }[];
  /** Save/Load: Delete save slot */
  deleteSave: (slot: number) => boolean;
  /** Victory: Check victory/defeat conditions */
  checkVictoryCondition: () => { type: 'victory' | 'defeat' | 'ongoing'; message: string } | null;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  scenario: null,
  playerFaction: null,
  cities: [],
  officers: [],
  factions: [],
  selectedFactionId: null,
  gameSettings: {
    battleMode: 'watch',
    gameMode: 'historical',
    customOfficers: 'all',
    intelligenceSensitivity: 3,
  },
  year: 190,
  month: 1,
  selectedCityId: null,
  activeCommandCategory: null,
  log: [],
  duelState: null,
  battleFormation: null,

  setPhase: (phase) => set({ phase }),

  selectScenario: (scenario) => {
    // Initialize relations and allies for factions if missing
    const initializedFactions = scenario.factions.map(f => ({
      ...f,
      relations: f.relations || scenario.factions.reduce((acc, other) => {
        if (other.id !== f.id) acc[other.id] = 60; // Default hostility
        return acc;
      }, {} as Record<number, number>),
      allies: f.allies || [],
    }));

    set({
      scenario,
      cities: scenario.cities.map(c => ({ ...c })),
      officers: scenario.officers.map(o => ({ ...o })),
      factions: initializedFactions,
      year: scenario.year,
      month: 1,
      phase: 'faction',
    });
  },

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
      phase: 'settings',
      log: [`${faction.name}，天命所歸。${state.year}年${state.month}月，征途開始！`],
    });
  },

  setSelectedFactionId: (factionId) => set({ selectedFactionId: factionId }),

  setGameSettings: (settings) => set(state => ({
    gameSettings: { ...state.gameSettings, ...settings },
  })),

  confirmSettings: () => {
    set({ phase: 'playing' });
    get().addLog('遊戲設定完成，開始征戰！');
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
    // Phase 1.2: peopleLoyalty affects monthly income
    const updatedCities = state.cities.map(c => {
      // Monthly income for all cities with factions
      if (c.factionId !== null) {
        const loyaltyMultiplier = c.peopleLoyalty / 100;  // 0.0 to 1.0
        const goldIncome = Math.floor(c.commerce * 0.5 * loyaltyMultiplier);
        const foodIncome = Math.floor(c.agriculture * 0.8 * loyaltyMultiplier);
        return {
          ...c,
          gold: c.gold + goldIncome,
          food: c.food + foodIncome,
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
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 20) {
      get().addLog(`${governor.name} 體力不足（需 20），無法執行指令。`);
      return;
    }
    const bonus = Math.floor(governor.politics / 10);
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, commerce: Math.min(999, c.commerce + 10 + bonus), gold: c.gold - 500 }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 20 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 商業發展 +${10 + bonus}（花費 500 金，體力 -20）`);
  },

  developAgriculture: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 500) {
      get().addLog('金不足，無法開發農業。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 20) {
      get().addLog(`${governor.name} 體力不足（需 20），無法執行指令。`);
      return;
    }
    const bonus = Math.floor(governor.politics / 10);
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, agriculture: Math.min(999, c.agriculture + 10 + bonus), gold: c.gold - 500 }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 20 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 農業發展 +${10 + bonus}（花費 500 金，體力 -20）`);
  },

  reinforceDefense: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 300) {
      get().addLog('金不足，無法強化城防。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 20) {
      get().addLog(`${governor.name} 體力不足（需 20），無法執行指令。`);
      return;
    }
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, defense: Math.min(100, c.defense + 5), gold: c.gold - 300 }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 20 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 城防強化 +5（花費 300 金，體力 -20）`);
  },

  developFloodControl: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 500) {
      get().addLog('金不足，無法開發治水。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 20) {
      get().addLog(`${governor.name} 體力不足（需 20），無法執行指令。`);
      return;
    }
    const bonus = Math.floor(governor.politics / 15);
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, floodControl: Math.min(100, c.floodControl + 8 + bonus), gold: c.gold - 500 }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 20 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 治水發展 +${8 + bonus}（花費 500 金，體力 -20）`);
  },

  developTechnology: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 800) {
      get().addLog('金不足，無法開發技術。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 25) {
      get().addLog(`${governor.name} 體力不足（需 25），無法執行指令。`);
      return;
    }
    const bonus = Math.floor(governor.intelligence / 20);
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, technology: Math.min(100, (c.technology || 0) + 5 + bonus), gold: c.gold - 800 }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 25 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 技術發展 +${5 + bonus}（花費 800 金，體力 -25）`);
  },

  trainTroops: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.food < 500) {
      get().addLog('糧不足，無法訓練。');
      return;
    }
    if (city.troops <= 0) {
      get().addLog('城中無兵，無法訓練。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 20) {
      get().addLog(`${governor.name} 體力不足（需 20），無法執行指令。`);
      return;
    }
    const trainingBonus = Math.floor(governor.leadership / 15);
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? {
              ...c,
              training: Math.min(100, (c.training || 0) + 8 + trainingBonus),
              morale: Math.min(100, (c.morale || 0) + 3),
              food: c.food - 500
            }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 20 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 訓練部隊（花費 500 糧，體力 -20）`);
  },

  manufacture: (cityId, weaponType) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 1000) {
      get().addLog('金不足，無法製造。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (!hasSkill(governor, '製造')) {
      get().addLog(`${governor.name} 不具備製造技能。`);
      return;
    }
    if (governor.stamina < 30) {
      get().addLog(`${governor.name} 體力不足（需 30），無法執行指令。`);
      return;
    }

    const tech = city.technology || 0;
    const gates = { crossbows: 30, warHorses: 40, batteringRams: 60, catapults: 80 };
    if (tech < gates[weaponType]) {
      get().addLog(`技術不足（需 ${gates[weaponType]}），無法製造該武器。`);
      return;
    }

    const amount = 10 + Math.floor(tech / 10);
    const weaponNames = {
      crossbows: '弩',
      warHorses: '軍馬',
      batteringRams: '衝車',
      catapults: '投石機'
    };

    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? { ...c, [weaponType]: (c[weaponType] || 0) + amount, gold: c.gold - 1000 }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 30 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 製造了 ${amount} 單位 ${weaponNames[weaponType]}（花費 1000 金，體力 -30）`);
  },

  disasterRelief: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city || city.gold < 500 || city.food < 1000) {
      get().addLog('資源不足，無法賑災。');
      return;
    }
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 15) {
      get().addLog(`${governor.name} 體力不足（需 15），無法執行指令。`);
      return;
    }

    const bonus = Math.floor(governor.politics / 10);
    set({
      cities: state.cities.map(c =>
        c.id === cityId
          ? {
              ...c,
              peopleLoyalty: Math.min(100, (c.peopleLoyalty || 0) + 15 + bonus),
              gold: c.gold - 500,
              food: c.food - 1000
            }
          : c
      ),
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 15 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 賑災民心 +${15 + bonus}（花費 500 金, 1000 糧，體力 -15）`);
  },

  recruitOfficer: (officerId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.factionId !== null) return;
    const playerFaction = state.playerFaction;
    if (!playerFaction) return;

    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;

    // Find recruiter with highest charisma in city
    const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === playerFaction.id);
    if (recruiters.length === 0) {
      get().addLog('城中無人可派。');
      return;
    }
    const recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
    
    if (recruiter.stamina < 15) {
      get().addLog(`${recruiter.name} 體力不足（需 15），無法執行指令。`);
      return;
    }

    // Charisma check: recruiter charisma vs officer politics
    const chance = Math.min(90, 30 + recruiter.charisma - officer.politics);
    const success = Math.random() * 100 < chance;

    set({
      officers: state.officers.map(o => {
        if (o.id === recruiter.id) {
          return { ...o, stamina: o.stamina - 15 };
        }
        if (o.id === officerId && success) {
          return { ...o, factionId: playerFaction.id, loyalty: 60 };
        }
        return o;
      }),
    });

    if (success) {
      get().addLog(`${recruiter.name} 成功招攬 ${officer.name}！忠誠 60（體力 -15）`);
    } else {
      get().addLog(`${recruiter.name} 招攬 ${officer.name} 失敗。（體力 -15）`);
    }
  },

  searchOfficer: (cityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return;
    const recruiters = state.officers.filter(o => o.cityId === cityId && o.factionId === state.playerFaction?.id);
    if (recruiters.length === 0) {
      get().addLog('城中無人可派。');
      return;
    }
    const recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
    if (recruiter.stamina < 15) {
      get().addLog(`${recruiter.name} 體力不足（需 15）。`);
      return;
    }

    // Roll for discovery
    // Find unaffiliated officers in this city that are "hidden" (not yet discovered)
    // For now, "unaffiliated" means they are already "discovered" but not in a faction.
    // RTK IV search usually finds hidden officers. Let's simulate by checking unaffiliated in city.
    const unaffiliated = state.officers.filter(o => o.cityId === cityId && o.factionId === null);
    let found = false;
    let foundOfficer: Officer | null = null;

    for (const officer of unaffiliated) {
      let chance = 30 + recruiter.charisma / 2;
      if (hasSkill(recruiter, '人才')) chance += 15;
      if (Math.random() * 100 < chance) {
        foundOfficer = officer;
        found = true;
        break;
      }
    }

    set({
      officers: state.officers.map(o => o.id === recruiter.id ? { ...o, stamina: o.stamina - 15 } : o)
    });

    if (found && foundOfficer) {
      get().addLog(`${recruiter.name} 在 ${city.name} 找到了 ${foundOfficer.name}！（體力 -15）`);
      // In a real implementation, we might need to "reveal" them.
      // For now, they are already in the list, so we just notify.
    } else {
      // Chance to find treasure
      if (Math.random() < 0.15) {
        get().addLog(`${recruiter.name} 在 ${city.name} 搜索時發現了寶物！（體力 -15）`);
        // Treasure system implementation would go here
      } else {
        get().addLog(`${recruiter.name} 在 ${city.name} 搜索，一無所獲。（體力 -15）`);
      }
    }
  },

  recruitPOW: (officerId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.factionId !== (-1 as unknown as number)) return;
    
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;

    const recruiters = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    const recruiter = recruiters.reduce((prev, curr) => (prev.charisma > curr.charisma ? prev : curr));
    
    if (recruiter.stamina < 15) {
      get().addLog(`${recruiter.name} 體力不足（需 15）。`);
      return;
    }

    const chance = 40 + recruiter.charisma - officer.loyalty / 2;
    const success = Math.random() * 100 < chance;

    set({
      officers: state.officers.map(o => {
        if (o.id === recruiter.id) return { ...o, stamina: o.stamina - 15 };
        if (o.id === officerId && success) return { ...o, factionId: state.playerFaction!.id, loyalty: 50, cityId: city.id };
        return o;
      })
    });

    if (success) {
      get().addLog(`${recruiter.name} 成功勸降了 ${officer.name}！（體力 -15）`);
    } else {
      get().addLog(`${recruiter.name} 勸降 ${officer.name} 失敗。（體力 -15）`);
    }
  },

  rewardOfficer: (officerId, _type, amount = 1000) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < amount) {
      get().addLog('金不足。');
      return;
    }

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - amount } : c),
      officers: state.officers.map(o => {
        if (o.id === officerId) {
          return { ...o, loyalty: Math.min(100, o.loyalty + 5 + Math.floor(amount / 500)) };
        }
        return o;
      })
    });
    const officer = state.officers.find(o => o.id === officerId);
    get().addLog(`賞賜 ${officer?.name} ${amount} 金，忠誠上升。`);
  },

  executeOfficer: (officerId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return;
    
    set({
      officers: state.officers.filter(o => o.id !== officerId)
    });
    get().addLog(`處斬了 ${officer.name}。`);
  },

  dismissOfficer: (officerId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.id === state.playerFaction?.rulerId) return;
    
    set({
      officers: state.officers.map(o => o.id === officerId ? { ...o, factionId: null, isGovernor: false, loyalty: 30 } : o)
    });
    get().addLog(`${officer.name} 被逐出了勢力。`);
  },

  appointGovernor: (cityId, officerId) => {
    const state = get();
    set({
      officers: state.officers.map(o => {
        if (o.cityId === cityId) {
          if (o.id === officerId) return { ...o, isGovernor: true };
          if (o.isGovernor) return { ...o, isGovernor: false };
        }
        return o;
      })
    });
    const officer = state.officers.find(o => o.id === officerId);
    get().addLog(`任命 ${officer?.name} 為太守。`);
  },

  appointAdvisor: (officerId) => {
    const state = get();
    if (!state.playerFaction) return;
    const officer = state.officers.find(o => o.id === officerId);
    
    set({
      factions: state.factions.map(f => f.id === state.playerFaction?.id ? { ...f, advisorId: officerId } : f),
      playerFaction: { ...state.playerFaction, advisorId: officerId }
    });
    get().addLog(`任命 ${officer?.name} 為軍師。`);
  },

  draftTroops: (cityId, amount) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return;
    
    const governor = state.officers.find(o => o.cityId === cityId && o.isGovernor);
    if (!governor) {
      get().addLog('城中無太守，無法執行指令。');
      return;
    }
    if (governor.stamina < 10) {
      get().addLog(`${governor.name} 體力不足（需 10），無法執行指令。`);
      return;
    }
    
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
      officers: state.officers.map(o =>
        o.id === governor.id
          ? { ...o, stamina: o.stamina - 10 }
          : o
      ),
    });
    get().addLog(`${city.name}：${governor.name} 徵兵 ${actual} 人（體力 -10）`);
  },

  transport: (fromCityId, toCityId, resource, amount) => {
    const state = get();
    const fromCity = state.cities.find(c => c.id === fromCityId);
    const toCity = state.cities.find(c => c.id === toCityId);
    if (!fromCity || !toCity) return;
    
    const governor = state.officers.find(o => o.cityId === fromCityId && o.isGovernor);
    if (!governor || governor.stamina < 20) {
      get().addLog('太守體力不足（需 20）。');
      return;
    }

    if (fromCity[resource] < amount) {
      get().addLog('資源不足。');
      return;
    }

    set({
      cities: state.cities.map(c => {
        if (c.id === fromCityId) return { ...c, [resource]: c[resource] - amount };
        if (c.id === toCityId) return { ...c, [resource]: c[resource] + amount };
        return c;
      }),
      officers: state.officers.map(o => o.id === governor.id ? { ...o, stamina: o.stamina - 20 } : o)
    });
    get().addLog(`從 ${fromCity.name} 向 ${toCity.name} 輸送了 ${amount} ${resource === 'gold' ? '金' : resource === 'food' ? '糧' : '兵'}。`);
  },

  transferOfficer: (officerId, targetCityId) => {
    const state = get();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer || officer.stamina < 10) {
      get().addLog(`${officer?.name || '武將'} 體力不足（需 10）。`);
      return;
    }

    set({
      officers: state.officers.map(o => o.id === officerId ? { ...o, cityId: targetCityId, isGovernor: false, stamina: o.stamina - 10 } : o)
    });
    const targetCity = state.cities.find(c => c.id === targetCityId);
    get().addLog(`${officer.name} 移動到了 ${targetCity?.name}。`);
  },

  setBattleFormation: (formation) => set({ battleFormation: formation }),

  startDuel: () => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;

    // Find best player officer in city
    const pOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (pOfficers.length === 0) {
      get().addLog('城中無將！');
      return;
    }
    const p1 = pOfficers.reduce((prev, current) => (prev.war > current.war ? prev : current));

    // Find random enemy in adjacent cities
    const enemyCityIds = city.adjacentCityIds.filter(id => {
       const neighbor = state.cities.find(c => c.id === id);
       return neighbor && neighbor.factionId && neighbor.factionId !== state.playerFaction?.id;
    });

    if (enemyCityIds.length === 0) {
      get().addLog('四周無敵軍。');
      return;
    }

    const targetCityId = enemyCityIds[Math.floor(Math.random() * enemyCityIds.length)];
    const targetCity = state.cities.find(c => c.id === targetCityId)!;
    
    const eOfficers = state.officers.filter(o => o.cityId === targetCityId && o.factionId === targetCity.factionId);
     if (eOfficers.length === 0) {
      get().addLog(`${targetCity.name} 是一座空城。`);
      return;
    }
    const p2 = eOfficers[Math.floor(Math.random() * eOfficers.length)];

    set({
      phase: 'duel',
      duelState: {
        p1,
        p2,
        p1Hp: 100,
        p2Hp: 100,
        round: 1,
        turn: 0,
        logs: [`${p1.name} 向 ${targetCity.name} 的 ${p2.name} 發起了挑戰！`, '戰鬥開始！'],
        result: null,
      }
    });
  },

  duelAction: (action) => {
    const state = get();
    const ds = state.duelState;
    if (!ds || ds.result) return;

    let p1Dmg = 0;
    let p2Dmg = 0;
    let logMsg = '';
    const logs = [...ds.logs];

    // Player Phase
    if (action === 'flee') {
      set({ duelState: { ...ds, logs: [...logs, `${ds.p1.name} 逃跑了！`], result: 'flee' } });
      return;
    }

    // Hit calculation
    // Base damage = War / 10 + Random(1-10)
    
    let hitChance = 80 + (ds.p1.war - ds.p2.war);
    let damageMult = 1;
    
    if (action === 'heavy') {
      hitChance -= 20;
      damageMult = 1.5;
    } else if (action === 'defend') {
      damageMult = 0; // Don't attack
    }

    if (action !== 'defend') {
        const roll = Math.random() * 100;
        if (roll < hitChance) {
           const base = Math.max(1, ds.p1.war / 5);
           const dmg = Math.floor((base + Math.random() * 10) * damageMult);
           p2Dmg = dmg;
           logMsg = `${ds.p1.name} 使用 ${action === 'heavy' ? '大喝' : '攻擊'}，造成了 ${dmg} 點傷害！`;
        } else {
           logMsg = `${ds.p1.name} 的攻擊落空了！`;
        }
    } else {
       logMsg = `${ds.p1.name} 採取了防禦姿態。`;
    }
    logs.push(logMsg);

    const newP2Hp = Math.max(0, ds.p2Hp - p2Dmg);

    if (newP2Hp === 0) {
      set({ duelState: { ...ds, p2Hp: 0, logs: [...logs, `${ds.p2.name} 被擊敗了！`], result: 'win' } });
      return;
    }

    // AI Phase
    const aiAction = ds.p2Hp < 30 ? 'heavy' : 'attack'; 
    let aiHitChance = 80 + (ds.p2.war - ds.p1.war);
    let aiDamageMult = 1;

    if (aiAction === 'heavy') {
        aiHitChance -= 20;
        aiDamageMult = 1.5;
    }
    
    // Player defense bonus
    if (action === 'defend') {
        aiDamageMult *= 0.5;
        logs.push(`(防禦生效！傷害減半)`);
    }

    const aiRoll = Math.random() * 100;
    if (aiRoll < aiHitChance) {
        const base = Math.max(1, ds.p2.war / 5);
        const dmg = Math.floor((base + Math.random() * 10) * aiDamageMult);
        p1Dmg = dmg;
        logs.push(`${ds.p2.name} 還擊！造成了 ${dmg} 點傷害！`);
    } else {
        logs.push(`${ds.p2.name} 的攻擊被閃避了！`);
    }

    const newP1Hp = Math.max(0, ds.p1Hp - p1Dmg);

    if (newP1Hp === 0) {
       set({ duelState: { ...ds, p1Hp: 0, p2Hp: newP2Hp, logs: [...logs, `${ds.p1.name} 落馬了...`], result: 'lose' } });
       return;
    }

    set({
      duelState: {
        ...ds,
        p1Hp: newP1Hp,
        p2Hp: newP2Hp,
        logs: logs,
        round: ds.round + 1,
      }
    });
  },

  endDuel: () => {
     set({ phase: 'playing', duelState: null });
  },

  startBattle: (targetCityId: number) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!city || !targetCity || !state.playerFaction) return;

    let attackerOfficers: Officer[] = [];
    let attackerUnitTypes: UnitType[] = [];

    if (state.battleFormation) {
      attackerOfficers = state.battleFormation.officerIds.map(id => state.officers.find(o => o.id === id)!).filter(Boolean);
      attackerUnitTypes = state.battleFormation.unitTypes;
    } else {
      // Default fallback if no formation set (infantry)
      attackerOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id).slice(0, 5);
      attackerUnitTypes = attackerOfficers.map(() => 'infantry' as UnitType);
    }

    if (attackerOfficers.length === 0) {
      get().addLog('無將領可統兵。');
      return;
    }

    // Check commander stamina (highest leadership officer)
    const commander = attackerOfficers.reduce((prev, curr) => (prev.leadership > curr.leadership ? prev : curr));
    if (commander.stamina < 30) {
      get().addLog(`${commander.name} 體力不足（需 30），無法出征。`);
      return;
    }

    // Deduct weapons from city based on formation
    let crossbowsUsed = 0;
    let warHorsesUsed = 0;
    attackerUnitTypes.forEach(type => {
      if (type === 'archer') crossbowsUsed += 1000; // Assume 1000 per unit for now
      if (type === 'cavalry') warHorsesUsed += 1000;
    });

    if (city.crossbows < crossbowsUsed || city.warHorses < warHorsesUsed) {
       get().addLog('城內武器不足，無法依此編制出征。');
       return;
    }

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, crossbows: c.crossbows - crossbowsUsed, warHorses: c.warHorses - warHorsesUsed } : c),
      officers: state.officers.map(o =>
        attackerOfficers.some(ao => ao.id === o.id)
          ? { ...o, stamina: Math.max(0, o.stamina - 30) }
          : o
      ),
      battleFormation: null, // Clear after use
    });

    // Phase 1.2: Pass city morale and training to battle
    useBattleStore.getState().initBattle(
      state.playerFaction.id,
      targetCity.factionId || 0,
      targetCityId,
      attackerOfficers,
      attackerOfficers.filter(o => o.cityId === targetCityId && o.factionId === targetCity.factionId).slice(0, 5), // Basic defense
      city.morale,
      targetCity.morale,
      city.training
    );
    
    set({ phase: 'battle' });
    get().addLog(`出征 ${targetCity.name}！（所有參戰將領體力 -30）`);
  },

  improveRelations: (targetFactionId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 1000) {
      get().addLog('金不足（需1000），無法進行贈呈。');
      return;
    }
    
    // Find messenger (highest politics in city)
    const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (officersInCity.length === 0) {
      get().addLog('城中無人可派。');
      return;
    }
    const messenger = officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));
    
    if (messenger.stamina < 15) {
      get().addLog(`${messenger.name} 體力不足（需 15），無法執行指令。`);
      return;
    }
    
    const targetFaction = state.factions.find(f => f.id === targetFactionId);
    if (!targetFaction) return;

    // Calculate effect
    // Base reduction: Politics / 4 + 10
    const reduction = Math.floor(messenger.politics / 4) + 10;
    
    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
      officers: state.officers.map(o =>
        o.id === messenger.id
          ? { ...o, stamina: o.stamina - 15 }
          : o
      ),
      factions: state.factions.map(f => {
        if (f.id === state.playerFaction?.id) {
          const currentHostility = f.relations[targetFactionId] ?? 60;
          const newHostility = Math.max(0, currentHostility - reduction);
          return { ...f, relations: { ...f.relations, [targetFactionId]: newHostility } };
        }
        // Also update the target's view of us (symmetric for simplicity in this implementation)
        if (f.id === targetFactionId) {
             const currentHostility = f.relations[state.playerFaction!.id] ?? 60;
             const newHostility = Math.max(0, currentHostility - reduction);
             return { ...f, relations: { ...f.relations, [state.playerFaction!.id]: newHostility } };
        }
        return f;
      })
    });
    
    get().addLog(`${messenger.name} 出使 ${targetFaction.name}，敵對心降低了 ${reduction}。（體力 -15）`);
  },

  formAlliance: (targetFactionId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 2000) {
      get().addLog('金不足（需2000），無法結盟。');
      return;
    }

    const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (officersInCity.length === 0) {
      get().addLog('城中無人可派。');
      return;
    }
    const messenger = officersInCity.reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));
    
    if (messenger.stamina < 20) {
      get().addLog(`${messenger.name} 體力不足（需 20），無法執行指令。`);
      return;
    }
    
    const targetFaction = state.factions.find(f => f.id === targetFactionId);
    if (!targetFaction) return;

    if (state.playerFaction?.allies.includes(targetFactionId)) {
        get().addLog(`我方與 ${targetFaction.name} 已經是同盟了。`);
        return;
    }

    // Success Check
    // (Politics * 0.6) + (100 - Hostility) * 0.4 > 60?
    const hostility = state.playerFaction?.relations[targetFactionId] ?? 60;
    const score = (messenger.politics * 0.6) + ((100 - hostility) * 0.4);
    const success = score > 50 + (Math.random() * 20); // Threshold 50-70

    set({
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 2000 } : c),
        officers: state.officers.map(o =>
          o.id === messenger.id
            ? { ...o, stamina: o.stamina - 20 }
            : o
        ),
    });

    if (success) {
        set({
            factions: state.factions.map(f => {
                if (f.id === state.playerFaction?.id) {
                    return { ...f, allies: [...f.allies, targetFactionId] };
                }
                if (f.id === targetFactionId) {
                    return { ...f, allies: [...f.allies, state.playerFaction!.id] };
                }
                return f;
            })
        });
        get().addLog(`${messenger.name} 成功說服 ${targetFaction.name} 結為同盟！（體力 -20）`);
    } else {
        // Failure increases hostility slightly
        set({
             factions: state.factions.map(f => {
                if (f.id === state.playerFaction?.id) {
                     const h = f.relations[targetFactionId] ?? 60;
                     return { ...f, relations: { ...f.relations, [targetFactionId]: Math.min(100, h + 5) } };
                }
                return f;
             })
        });
        get().addLog(`${messenger.name} 的結盟提議被 ${targetFaction.name} 拒絕了。（體力 -20）`);
    }
  },

  requestJointAttack: (allyFactionId, targetCityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));
    
    if (messenger.stamina < 20) {
      get().addLog('體力不足。');
      return;
    }

    let successChance = 50 + messenger.politics / 5;
    if (hasSkill(messenger, '外交')) successChance += 15;
    const success = Math.random() * 100 < successChance;

    set({
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
    });

    const targetCity = state.cities.find(c => c.id === targetCityId);
    const ally = state.factions.find(f => f.id === allyFactionId);
    if (success) {
      get().addLog(`${messenger.name} 成功說服 ${ally?.name} 共同進攻 ${targetCity?.name}！`);
    } else {
      get().addLog(`${ally?.name} 拒絕了共同作戰的提議。`);
    }
  },

  proposeCeasefire: (targetFactionId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 1000) {
      get().addLog('資源不足。');
      return;
    }
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));
    
    if (messenger.stamina < 20) {
      get().addLog('體力不足。');
      return;
    }

    const hostility = state.playerFaction?.relations[targetFactionId] ?? 60;
    const successChance = 30 + messenger.politics / 3 + (100 - hostility) / 5;
    const success = Math.random() * 100 < successChance;

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
    });

    const targetFaction = state.factions.find(f => f.id === targetFactionId);
    if (success) {
      const expiresYear = state.year + 1;
      const expiresMonth = state.month;
      set({
        factions: state.factions.map(f => {
          if (f.id === state.playerFaction?.id) {
            return {
              ...f,
              relations: { ...f.relations, [targetFactionId]: 20 },
              ceasefires: [...f.ceasefires, { factionId: targetFactionId, expiresMonth, expiresYear }]
            };
          }
          if (f.id === targetFactionId) {
            return {
              ...f,
              relations: { ...f.relations, [state.playerFaction!.id]: 20 },
              ceasefires: [...f.ceasefires, { factionId: state.playerFaction!.id, expiresMonth, expiresYear }]
            };
          }
          return f;
        })
      });
      get().addLog(`${messenger.name} 成功與 ${targetFaction?.name} 達成停戰協議（期限一年）。`);
    } else {
      get().addLog(`${targetFaction?.name} 拒絕了停戰協議。`);
    }
  },

  demandSurrender: (targetFactionId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city) return;
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.politics > curr.politics ? prev : curr));
    
    if (messenger.stamina < 20) {
      get().addLog('體力不足。');
      return;
    }

    // Success based on power ratio. Simplified for now.
    const targetCities = state.cities.filter(c => c.id === targetFactionId).length;
    const playerCities = state.cities.filter(c => c.id === state.playerFaction?.id).length;
    const success = targetCities === 1 && playerCities > 5 && Math.random() < 0.1;

    set({
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
    });

    const targetFaction = state.factions.find(f => f.id === targetFactionId);
    if (success) {
      // Transfer everything. This is complex, but for now just log it.
      get().addLog(`${targetFaction?.name} 向我軍投降了！`);
    } else {
      get().addLog(`${targetFaction?.name} 斬釘截鐵地拒絕了投降的要求。`);
    }
  },

  breakAlliance: (targetFactionId) => {
    const state = get();
    if (!state.playerFaction) return;
    
    set({
      factions: state.factions.map(f => {
        if (f.id === state.playerFaction?.id) {
          return {
            ...f,
            allies: f.allies.filter(id => id !== targetFactionId),
            relations: { ...f.relations, [targetFactionId]: Math.min(100, (f.relations[targetFactionId] || 60) + 40) }
          };
        }
        if (f.id === targetFactionId) {
          return {
            ...f,
            allies: f.allies.filter(id => id !== state.playerFaction?.id),
            relations: { ...f.relations, [state.playerFaction!.id]: Math.min(100, (f.relations[state.playerFaction!.id] || 60) + 40) }
          };
        }
        // Other factions also dislike betrayal
        const currentH = f.relations[state.playerFaction!.id] || 60;
        return { ...f, relations: { ...f.relations, [state.playerFaction!.id]: Math.min(100, currentH + 10) } };
      })
    });
    const targetFaction = state.factions.find(f => f.id === targetFactionId);
    get().addLog(`背棄了與 ${targetFaction?.name} 的同盟！天下人皆感憤慨。`);
  },

  exchangeHostage: (officerId, targetFactionId) => {
    const state = get();
    if (!state.playerFaction) return;
    
    set({
      factions: state.factions.map(f => f.id === targetFactionId ? { ...f, hostageOfficerIds: [...f.hostageOfficerIds, officerId] } : f),
      officers: state.officers.map(o => o.id === officerId ? { ...o, cityId: -2 } : o) // -2 indicates hostage
    });
    const officer = state.officers.find(o => o.id === officerId);
    const targetFaction = state.factions.find(f => f.id === targetFactionId);
    get().addLog(`將 ${officer?.name} 送往 ${targetFaction?.name} 作為人質。`);
  },


  rumor: (targetCityId: number) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 500) {
      get().addLog('金不足（需500），無法執行流言。');
      return;
    }

    const officersInCity = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
    if (officersInCity.length === 0) {
      get().addLog('城中無人可派。');
      return;
    }
    const messenger = officersInCity.reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));
    
    // Phase 1.1: Check for 流言 skill
    if (!hasSkill(messenger, '流言')) {
      get().addLog(`${messenger.name} 不具備流言技能，無法執行此計策。`);
      return;
    }
    
    if (messenger.stamina < 15) {
      get().addLog(`${messenger.name} 體力不足（需 15），無法執行指令。`);
      return;
    }
    
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!targetCity || targetCity.factionId === state.playerFaction?.id) return;

    // Success Check
    // Success chance: Intelligence / 2 + 20
    const success = (Math.random() * 100) < (messenger.intelligence / 2 + 20);

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
      officers: state.officers.map(o =>
        o.id === messenger.id
          ? { ...o, stamina: o.stamina - 15 }
          : o
      ),
    });

    if (success) {
      // Impact: decrease loyalty of officers in target city, decrease population slightly
      const loyaltyImpact = Math.floor(messenger.intelligence / 10) + 5;
      const popImpact = Math.floor(targetCity.population * 0.02);
      
      set({
        officers: get().officers.map(o =>
          (o.cityId === targetCityId && o.factionId === targetCity.factionId && !o.isGovernor)
            ? { ...o, loyalty: Math.max(0, o.loyalty - loyaltyImpact) }
            : o
        ),
        cities: get().cities.map(c =>
          c.id === targetCityId
            ? { ...c, population: Math.max(0, c.population - popImpact), peopleLoyalty: Math.max(0, c.peopleLoyalty - 5) }
            : c
        )
      });
      get().addLog(`${messenger.name} 在 ${targetCity.name} 散佈流言，民心動搖，將領忠誠下降！（體力 -15）`);
    } else {
      get().addLog(`${messenger.name} 的流言計策被識破了。（體力 -15）`);
    }
  },

  counterEspionage: (_targetCityId, targetOfficerId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 800) {
      get().addLog('資源不足。');
      return;
    }
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));
    
    if (!hasSkill(messenger, '做敵')) {
      get().addLog(`${messenger.name} 不具備做敵技能。`);
      return;
    }
    if (messenger.stamina < 20) {
      get().addLog('體力不足。');
      return;
    }

    const targetOfficer = state.officers.find(o => o.id === targetOfficerId);
    if (!targetOfficer) return;

    const successChance = 30 + messenger.intelligence / 3 - targetOfficer.loyalty / 4;
    const success = Math.random() * 100 < successChance;

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 800 } : c),
      officers: state.officers.map(o => {
        if (o.id === messenger.id) return { ...o, stamina: o.stamina - 20 };
        if (o.id === targetOfficerId && success) return { ...o, loyalty: Math.max(0, o.loyalty - (10 + Math.floor(messenger.intelligence / 10))) };
        return o;
      })
    });

    if (success) {
      get().addLog(`${messenger.name} 成功實施反間，${targetOfficer.name} 的忠誠度下降了！`);
    } else {
      get().addLog(`${messenger.name} 的反間計策失敗了。`);
    }
  },

  inciteRebellion: (targetCityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 1000) {
      get().addLog('資源不足。');
      return;
    }
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));
    
    if (!hasSkill(messenger, '驅虎')) {
      get().addLog(`${messenger.name} 不具備驅虎技能。`);
      return;
    }
    if (messenger.stamina < 25) {
      get().addLog('體力不足。');
      return;
    }

    const impact = 10 + Math.floor(messenger.intelligence / 8);
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!targetCity) return;

    set({
      cities: state.cities.map(c => {
        if (c.id === city.id) return { ...c, gold: c.gold - 1000 };
        if (c.id === targetCityId) {
          const newPeopleLoyalty = Math.max(0, (c.peopleLoyalty || 0) - impact);
          let newTroops = c.troops;
          if (newPeopleLoyalty < 30) newTroops = Math.floor(newTroops * 0.95);
          return { ...c, peopleLoyalty: newPeopleLoyalty, troops: newTroops };
        }
        return c;
      }),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 25 } : o)
    });

    get().addLog(`${messenger.name} 在 ${targetCity.name} 煽動造反，民心大幅下降！`);
  },

  arson: (targetCityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 500) {
      get().addLog('資源不足。');
      return;
    }
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));
    
    if (!hasSkill(messenger, '燒討')) {
      get().addLog(`${messenger.name} 不具備燒討技能。`);
      return;
    }
    if (messenger.stamina < 20) {
      get().addLog('體力不足。');
      return;
    }

    const successChance = 25 + messenger.intelligence / 3;
    const success = Math.random() * 100 < successChance;

    set({
      cities: state.cities.map(c => {
        if (c.id === city.id) return { ...c, gold: c.gold - 500 };
        if (c.id === targetCityId && success) {
          const goldLoss = Math.floor(c.gold * (0.1 + Math.random() * 0.1));
          const foodLoss = Math.floor(c.food * (0.1 + Math.random() * 0.1));
          return { ...c, gold: Math.max(0, c.gold - goldLoss), food: Math.max(0, c.food - foodLoss) };
        }
        return c;
      }),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 20 } : o)
    });

    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (success) {
      get().addLog(`${messenger.name} 在 ${targetCity?.name} 放火成功，燒毀了大量物資！`);
    } else {
      get().addLog(`${messenger.name} 在 ${targetCity?.name} 的放火行動失敗了。`);
    }
  },

  spy: (targetCityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 500) {
      get().addLog('資源不足。');
      return;
    }
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));
    
    if (!hasSkill(messenger, '情報') && !hasSkill(messenger, '諜報')) {
      get().addLog(`${messenger.name} 不具備諜報技能。`);
      return;
    }
    if (messenger.stamina < 15) {
      get().addLog('體力不足。');
      return;
    }

    const targetCity = state.cities.find(c => c.id === targetCityId);
    const result = spyingSystem.spy(
      { intelligence: messenger.intelligence, espionage: hasSkill(messenger, '諜報') },
      targetCityId,
      state.playerFaction!.id,
      targetCity?.factionId || null
    );

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 15 } : o)
    });

    if (result.success) {
      get().addLog(`${messenger.name} 滲透入 ${targetCity?.name} 並送回了情報！`);
    } else {
      get().addLog(`${messenger.name} 在 ${targetCity?.name} 潛入失敗，敵方加強了警戒。`);
      if (result.loyaltyPenalty && targetCityId) {
          // Simplified loyalty penalty impact
          set({
              cities: state.cities.map(c => c.id === targetCityId ? { ...c, peopleLoyalty: Math.max(0, (c.peopleLoyalty || 0) - result.loyaltyPenalty!) } : c)
          });
      }
    }
  },

  gatherIntelligence: (targetCityId) => {
    const state = get();
    const city = state.cities.find(c => c.id === state.selectedCityId);
    if (!city || city.gold < 300) {
      get().addLog('資源不足。');
      return;
    }
    const messenger = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id)
      .reduce((prev, curr) => (prev.intelligence > curr.intelligence ? prev : curr));
    
    if (!hasSkill(messenger, '情報')) {
      get().addLog(`${messenger.name} 不具備情報技能。`);
      return;
    }
    if (messenger.stamina < 15) {
      get().addLog('體力不足。');
      return;
    }

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 300 } : c),
      officers: state.officers.map(o => o.id === messenger.id ? { ...o, stamina: o.stamina - 15 } : o)
    });

    const targetCity = state.cities.find(c => c.id === targetCityId);
    get().addLog(`${messenger.name} 收集了關於 ${targetCity?.name} 的最新情報。`);
  },

  /**
   * Phase 0.1: Battle Consequences
   * Resolve battle outcomes: transfer city ownership, capture/defeat officers,
   * redistribute surviving troops, and update faction relations.
   * @param winnerFactionId - The faction that won the battle
   * @param loserFactionId - The faction that lost the battle
   * @param cityId - The city being fought over
   * @param battleUnits - Array of battle units with final state
   */
  resolveBattle: (winnerFactionId, loserFactionId, cityId, battleUnits) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return;

    // Get surviving units for winner
    const winnerUnits = battleUnits.filter(u => u.factionId === winnerFactionId && u.troops > 0 && u.status !== 'routed');

    // Calculate surviving troops
    const totalSurvivingTroops = winnerUnits.reduce((sum, u) => sum + u.troops, 0);
    
    // Get participating officer IDs from battle
    const participatingOfficerIds = new Set(battleUnits.map(u => u.officerId));

    // Process officer outcomes
    const updatedOfficers = state.officers.map(o => {
      // If officer was defending and lost
      if (o.cityId === cityId && o.factionId === loserFactionId) {
        // Check if this officer participated in battle
        if (participatingOfficerIds.has(o.id)) {
          const unit = battleUnits.find(u => u.officerId === o.id);
          if (unit) {
            // Officer was defeated (unit destroyed or routed)
            if (unit.troops <= 0 || unit.status === 'routed') {
              // Base 50% capture chance, modified by war stat difference
              const captureRoll = Math.random() * 100;
              const captureThreshold = 50 + (unit.status === 'routed' ? 20 : 0);
              
              if (captureRoll < captureThreshold) {
                // Officer captured - becomes POW (represented by special factionId -1)
                get().addLog(`${o.name} 兵敗被俘！`);
                return { ...o, factionId: -1 as unknown as number, cityId: -1, isGovernor: false };
              } else {
                // Officer escaped - becomes unaffiliated and flees to random adjacent city
                const adjacentCities = city.adjacentCityIds;
                const fleeCityId = adjacentCities.length > 0 
                  ? adjacentCities[Math.floor(Math.random() * adjacentCities.length)]
                  : cityId;
                get().addLog(`${o.name} 逃往 ${state.cities.find(c => c.id === fleeCityId)?.name || '他處'}。`);
                return { ...o, factionId: null, cityId: fleeCityId, isGovernor: false };
              }
            }
          }
        } else {
          // Officer was in city but didn't fight - 30% chance to escape
          if (Math.random() < 0.3) {
            const adjacentCities = city.adjacentCityIds;
            const fleeCityId = adjacentCities.length > 0 
              ? adjacentCities[Math.floor(Math.random() * adjacentCities.length)]
              : cityId;
            get().addLog(`${o.name} 棄城而逃。`);
            return { ...o, factionId: null, cityId: fleeCityId, isGovernor: false };
          } else {
            // Surrendered/captured
            get().addLog(`${o.name} 被俘。`);
            return { ...o, factionId: -1 as unknown as number, cityId: -1, isGovernor: false };
          }
        }
      }
      return o;
    });

    // Transfer city ownership
    const updatedCities = state.cities.map(c => {
      if (c.id === cityId) {
        return {
          ...c,
          factionId: winnerFactionId,
          troops: Math.floor(totalSurvivingTroops * 0.8), // 20% attrition after battle
        };
      }
      return c;
    });

    // Update faction relations - increase hostility significantly
    const updatedFactions = state.factions.map(f => {
      if (f.id === winnerFactionId) {
        const currentHostility = f.relations[loserFactionId] ?? 60;
        return { 
          ...f, 
          relations: { ...f.relations, [loserFactionId]: Math.min(100, currentHostility + 20) }
        };
      }
      if (f.id === loserFactionId) {
        const currentHostility = f.relations[winnerFactionId] ?? 60;
        return { 
          ...f, 
          relations: { ...f.relations, [winnerFactionId]: Math.min(100, currentHostility + 20) }
        };
      }
      return f;
    });

    set({ cities: updatedCities, officers: updatedOfficers, factions: updatedFactions });
    
    const winnerFaction = state.factions.find(f => f.id === winnerFactionId);
    get().addLog(`${city.name} 已被 ${winnerFaction?.name || '敵軍'} 攻陷！剩餘守軍 ${Math.floor(totalSurvivingTroops * 0.8)}。`);
  },

  /**
   * Phase 0.2: Save Game
   * Serialize current game state to localStorage with version tracking.
   * @param slot - Save slot number (1-3, matching RTK IV)
   * @returns boolean indicating success
   */
  saveGame: (slot) => {
    try {
      const state = get();
      const saveData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        phase: state.phase,
        scenario: state.scenario,
        playerFactionId: state.playerFaction?.id,
        cities: state.cities,
        officers: state.officers,
        factions: state.factions,
        year: state.year,
        month: state.month,
        selectedCityId: state.selectedCityId,
        log: state.log,
      };
      
      localStorage.setItem(`rtk4_save_${slot}`, JSON.stringify(saveData));
      get().addLog(`遊戲已儲存至存檔 ${slot}`);
      return true;
    } catch (e) {
      console.error('Save game failed:', e);
      get().addLog('儲存失敗！');
      return false;
    }
  },

  /**
   * Phase 0.2: Load Game
   * Deserialize game state from localStorage.
   * @param slot - Save slot number (1-3)
   * @returns boolean indicating success
   */
  loadGame: (slot) => {
    try {
      const saveDataStr = localStorage.getItem(`rtk4_save_${slot}`);
      if (!saveDataStr) {
        get().addLog(`存檔 ${slot} 不存在！`);
        return false;
      }
      
      const saveData = JSON.parse(saveDataStr);
      
      // Version check for future migrations
      if (!saveData.version) {
        console.warn('Save file has no version');
      }
      
      // Restore player faction reference
      const playerFaction = saveData.factions.find((f: Faction) => f.id === saveData.playerFactionId);
      
      set({
        phase: saveData.phase,
        scenario: saveData.scenario,
        playerFaction: playerFaction || null,
        cities: saveData.cities,
        officers: saveData.officers,
        factions: saveData.factions,
        year: saveData.year,
        month: saveData.month,
        selectedCityId: saveData.selectedCityId,
        log: [...saveData.log, `遊戲已從存檔 ${slot} 載入。`],
        activeCommandCategory: null,
        duelState: null,
      });
      
      return true;
    } catch (e) {
      console.error('Load game failed:', e);
      get().addLog('載入失敗！');
      return false;
    }
  },

  /**
   * Phase 0.2: Get Save Slots
   * Retrieve metadata for all save slots.
   * @returns Array of save slot metadata
   */
  getSaveSlots: () => {
    const slots = [];
    for (let i = 1; i <= 3; i++) {
      const saveDataStr = localStorage.getItem(`rtk4_save_${i}`);
      if (saveDataStr) {
        try {
          const saveData = JSON.parse(saveDataStr);
          slots.push({
            slot: i,
            date: saveData.timestamp,
            version: saveData.version || 'unknown',
          });
        } catch {
          slots.push({ slot: i, date: null, version: null });
        }
      } else {
        slots.push({ slot: i, date: null, version: null });
      }
    }
    return slots;
  },

  /**
   * Phase 0.2: Delete Save
   * Remove a save slot from localStorage.
   * @param slot - Save slot number (1-3)
   * @returns boolean indicating success
   */
  deleteSave: (slot) => {
    try {
      localStorage.removeItem(`rtk4_save_${slot}`);
      get().addLog(`存檔 ${slot} 已刪除`);
      return true;
    } catch (e) {
      console.error('Delete save failed:', e);
      return false;
    }
  },

  /**
   * Phase 0.3: Check Victory/Defeat Conditions
   * Determines if the game has reached a victory or defeat state.
   * Checks:
   * - Victory: One faction controls all cities
   * - Defeat: Player's faction has no cities
   * @returns Victory/defeat info or null if game continues
   */
  checkVictoryCondition: () => {
    const state = get();
    if (!state.playerFaction) return null;

    // Count cities per faction
    const factionCityCounts = new Map<number, number>();
    state.cities.forEach(city => {
      if (city.factionId !== null) {
        const count = factionCityCounts.get(city.factionId) || 0;
        factionCityCounts.set(city.factionId, count + 1);
      }
    });

    const totalCities = state.cities.length;
    const playerCityCount = factionCityCounts.get(state.playerFaction.id) || 0;

    // Check player defeat (no cities)
    if (playerCityCount === 0) {
      return {
        type: 'defeat' as const,
        message: '勢力覆滅！所有城池皆已失陷...',
      };
    }

    // Check victory (player controls all cities)
    if (playerCityCount === totalCities) {
      return {
        type: 'victory' as const,
        message: `天下統一！${state.playerFaction.name} 一統江山！`,
      };
    }

    // Check if any AI faction has won (for informational purposes)
    for (const [factionId, count] of factionCityCounts.entries()) {
      if (count === totalCities && factionId !== state.playerFaction.id) {
        return {
          type: 'defeat' as const,
          message: `${state.factions.find(f => f.id === factionId)?.name || '敵軍'} 已統一天下...`,
        };
      }
    }

    return null;
  },
}));