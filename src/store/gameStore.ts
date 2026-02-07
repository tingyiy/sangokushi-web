import { create } from 'zustand';
import type { GamePhase, Scenario, Faction, City, Officer, CommandCategory } from '../types';

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
  /** Military: Duel */
  startDuel: () => void;
  duelAction: (action: 'attack' | 'heavy' | 'defend' | 'flee') => void;
  endDuel: () => void;
  /** Diplomacy: Improve relations (Gift) */
  improveRelations: (targetFactionId: number) => void;
  /** Diplomacy: Form Alliance */
  formAlliance: (targetFactionId: number) => void;
  /** 謀略: 流言 (Rumor) - Decrease city loyalty and population */
  rumor: (targetCityId: number) => void;
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
  duelState: null,

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

    let newP2Hp = Math.max(0, ds.p2Hp - p2Dmg);

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

    let newP1Hp = Math.max(0, ds.p1Hp - p1Dmg);

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
    
    const targetFaction = state.factions.find(f => f.id === targetFactionId);
    if (!targetFaction) return;

    // Calculate effect
    // Base reduction: Politics / 4 + 10
    const reduction = Math.floor(messenger.politics / 4) + 10;
    
    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 1000 } : c),
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
    
    get().addLog(`${messenger.name} 出使 ${targetFaction.name}，敵對心降低了 ${reduction}。`);
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
        cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 2000 } : c)
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
        get().addLog(`${messenger.name} 成功說服 ${targetFaction.name} 結為同盟！`);
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
        get().addLog(`${messenger.name} 的結盟提議被 ${targetFaction.name} 拒絕了。`);
    }
  }


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
    const targetCity = state.cities.find(c => c.id === targetCityId);
    if (!targetCity || targetCity.factionId === state.playerFaction?.id) return;

    // Success Check
    // Success chance: Intelligence / 2 + 20
    const success = (Math.random() * 100) < (messenger.intelligence / 2 + 20);

    set({
      cities: state.cities.map(c => c.id === city.id ? { ...c, gold: c.gold - 500 } : c)
    });

    if (success) {
      // Impact: decrease loyalty of officers in target city, decrease population slightly
      const loyaltyImpact = Math.floor(messenger.intelligence / 10) + 5;
      const popImpact = Math.floor(targetCity.population * 0.02);
      
      set({
        officers: state.officers.map(o => 
          (o.cityId === targetCityId && o.factionId === targetCity.factionId && !o.isGovernor)
            ? { ...o, loyalty: Math.max(0, o.loyalty - loyaltyImpact) }
            : o
        ),
        cities: state.cities.map(c => 
          c.id === targetCityId 
            ? { ...c, population: Math.max(0, c.population - popImpact) } 
            : c
        )
      });
      get().addLog(`${messenger.name} 在 ${targetCity.name} 散佈流言，民心動搖，將領忠誠下降！`);
    } else {
      get().addLog(`${messenger.name} 的流言計策被識破了。`);
    }
  }
}));