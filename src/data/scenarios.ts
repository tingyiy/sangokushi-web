import { Scenario, Faction, City, Officer } from '../types';
import { baseCities } from './cities';
import { baseOfficers } from './officers';

/** Helper: create a full City from base + scenario overrides */
function makeCity(
  id: number,
  factionId: number | null,
  overrides: Partial<Pick<City, 'population' | 'gold' | 'food' | 'commerce' | 'agriculture' | 'defense' | 'troops'>> = {}
): City {
  const base = baseCities.find(c => c.id === id)!;
  return {
    ...base,
    factionId,
    population: overrides.population ?? 100000,
    gold:       overrides.gold ?? 5000,
    food:       overrides.food ?? 10000,
    commerce:   overrides.commerce ?? 500,
    agriculture:overrides.agriculture ?? 500,
    defense:    overrides.defense ?? 50,
    troops:     overrides.troops ?? 10000,
  };
}

/** Helper: create a full Officer from base + assignment */
function makeOfficer(
  id: number,
  factionId: number | null,
  cityId: number,
  overrides: Partial<Pick<Officer, 'loyalty' | 'isGovernor'>> = {}
): Officer {
  const base = baseOfficers.find(o => o.id === id)!;
  return {
    ...base,
    factionId,
    cityId,
    stamina: 100,
    loyalty: overrides.loyalty ?? (factionId === null ? 0 : 80),
    isGovernor: overrides.isGovernor ?? false,
  };
}

// ============================================================
// 劇本一：190年 反董卓聯盟
// ============================================================
const scenario190: Scenario = {
  id: 1,
  name: '反董卓聯盟',
  year: 190,
  description: '董卓廢少帝，立獻帝，遷都長安。各路諸侯起兵討伐，天下大亂。',
  factions: [
    { id: 1, name: '曹操',   rulerId: 20, color: '#2563eb', isPlayer: false },
    { id: 2, name: '劉備',   rulerId: 1,  color: '#16a34a', isPlayer: false },
    { id: 3, name: '孫堅',   rulerId: 50, color: '#dc2626', isPlayer: false },
    { id: 4, name: '董卓',   rulerId: 71, color: '#7c3aed', isPlayer: false },
    { id: 5, name: '袁紹',   rulerId: 72, color: '#ca8a04', isPlayer: false },
    { id: 6, name: '袁術',   rulerId: 73, color: '#ea580c', isPlayer: false },
    { id: 7, name: '劉表',   rulerId: 74, color: '#0d9488', isPlayer: false },
    { id: 8, name: '公孫瓚', rulerId: 77, color: '#be185d', isPlayer: false },
    { id: 9, name: '馬騰',   rulerId: 76, color: '#78716c', isPlayer: false },
    { id: 10, name: '陶謙',  rulerId: 78, color: '#65a30d', isPlayer: false },
  ],
  cities: [
    // 董卓
    makeCity(11, 4, { gold: 15000, food: 30000, troops: 50000, defense: 90 }),  // 長安
    makeCity(10, 4, { gold: 12000, food: 25000, troops: 30000, defense: 80 }),  // 洛陽
    // 袁紹
    makeCity(4,  5, { troops: 30000 }),  // 南皮
    makeCity(7,  5, { troops: 25000 }),  // 鄴
    // 曹操
    makeCity(13, 1, { troops: 15000 }),  // 陳留
    // 劉備
    makeCity(43, 2, { troops: 5000, gold: 2000, food: 5000 }),  // 小沛
    // 孫堅
    makeCity(25, 3, { troops: 15000 }),  // 柴桑
    // 袁術
    makeCity(16, 6, { troops: 18000 }),  // 壽春
    // 劉表
    makeCity(20, 7, { troops: 20000, gold: 8000, food: 18000 }),  // 襄陽
    makeCity(23, 7, { troops: 12000 }),  // 江陵
    // 公孫瓚
    makeCity(2,  8, { troops: 22000 }),  // 北平
    // 馬騰
    makeCity(40, 9, { troops: 18000, gold: 3000, food: 8000 }),  // 西涼
    // 陶謙
    makeCity(15, 10, { troops: 12000 }),  // 下邳
    // Neutral cities
    ...baseCities
      .filter(c => ![11,10,4,7,13,43,25,16,20,23,2,40,15].includes(c.id))
      .map(c => makeCity(c.id, null, { troops: 0, gold: 2000, food: 5000, defense: 30 })),
  ],
  officers: [
    // 曹操軍
    makeOfficer(20, 1, 13, { loyalty: 100, isGovernor: true }),
    makeOfficer(21, 1, 13, { loyalty: 95 }),
    makeOfficer(22, 1, 13, { loyalty: 92 }),
    makeOfficer(26, 1, 13, { loyalty: 90 }),
    makeOfficer(27, 1, 13, { loyalty: 95 }),
    makeOfficer(28, 1, 13, { loyalty: 98 }),
    makeOfficer(30, 1, 13, { loyalty: 95 }),
    makeOfficer(33, 1, 13, { loyalty: 88 }),

    // 劉備軍
    makeOfficer(1, 2, 43, { loyalty: 100, isGovernor: true }),
    makeOfficer(2, 2, 43, { loyalty: 100 }),
    makeOfficer(3, 2, 43, { loyalty: 100 }),

    // 孫堅軍
    makeOfficer(50, 3, 25, { loyalty: 100, isGovernor: true }),
    makeOfficer(51, 3, 25, { loyalty: 100 }),
    makeOfficer(53, 3, 25, { loyalty: 95 }),
    makeOfficer(58, 3, 25, { loyalty: 90 }),
    makeOfficer(61, 3, 25, { loyalty: 88 }),

    // 董卓軍
    makeOfficer(71, 4, 11, { loyalty: 100, isGovernor: true }),
    makeOfficer(70, 4, 11, { loyalty: 40 }),  // 呂布忠誠低
    makeOfficer(85, 4, 10, { loyalty: 85, isGovernor: true }),
    makeOfficer(31, 4, 11, { loyalty: 75 }),

    // 袁紹軍
    makeOfficer(72, 5, 7, { loyalty: 100, isGovernor: true }),
    makeOfficer(86, 5, 7, { loyalty: 88 }),
    makeOfficer(87, 5, 7, { loyalty: 85 }),
    makeOfficer(29, 5, 7, { loyalty: 82 }),

    // 袁術軍
    makeOfficer(73, 6, 16, { loyalty: 100, isGovernor: true }),

    // 劉表軍
    makeOfficer(74, 7, 20, { loyalty: 100, isGovernor: true }),

    // 公孫瓚軍
    makeOfficer(77, 8, 2, { loyalty: 100, isGovernor: true }),
    makeOfficer(5,  8, 2, { loyalty: 80 }),  // 趙雲先在公孫瓚麾下

    // 馬騰軍
    makeOfficer(76, 9, 40, { loyalty: 100, isGovernor: true }),
    makeOfficer(6,  9, 40, { loyalty: 95 }),  // 馬超

    // 陶謙軍
    makeOfficer(78, 10, 15, { loyalty: 100, isGovernor: true }),

    // 在野武將
    makeOfficer(4,  null, 20, {}),  // 諸葛亮 — 荊州隱居
    makeOfficer(9,  null, 20, {}),  // 龐統
    makeOfficer(7,  null, 20, {}),  // 黃忠 — 劉表領地
    makeOfficer(8,  null, 18, {}),  // 魏延
    makeOfficer(10, null, 28, {}),  // 法正 — 蜀中
    makeOfficer(32, null, 10, {}),  // 司馬懿 — 洛陽在野
    makeOfficer(55, null, 25, {}),  // 呂蒙 — 少年
    makeOfficer(54, null, 22, {}),  // 陸遜 — 少年
    makeOfficer(59, null, 22, {}),  // 魯肅
    makeOfficer(81, null, 11, {}),  // 貂蟬
  ],
};

export const scenarios: Scenario[] = [scenario190];
