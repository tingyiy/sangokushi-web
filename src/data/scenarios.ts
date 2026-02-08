import type { Scenario, City, Officer } from '../types';
import { baseCities } from './cities';
import { baseOfficers } from './officers';

/** Helper: create a full City from base + scenario overrides
 * Phase 1.2: Updated with new city attributes and differentiated stats
 */
function makeCity(
  id: number,
  factionId: number | null,
  overrides: Partial<Pick<City, 'population' | 'gold' | 'food' | 'commerce' | 'agriculture' | 'defense' | 'troops' | 'floodControl' | 'technology' | 'peopleLoyalty' | 'morale' | 'training' | 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults'>> = {}
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
    // Phase 1.2: New city attributes with sensible defaults
    floodControl: overrides.floodControl ?? 50,
    technology:   overrides.technology ?? 30,
    peopleLoyalty:overrides.peopleLoyalty ?? 70,
    morale:       overrides.morale ?? 60,
    training:     overrides.training ?? 40,
    // Phase 1.2: Weapon inventory defaults
    crossbows:    overrides.crossbows ?? 0,
    warHorses:    overrides.warHorses ?? 0,
    batteringRams:overrides.batteringRams ?? 0,
    catapults:    overrides.catapults ?? 0,
  };
}

/** Helper: create a full Officer from base + assignment
 * Phase 1.4: Added treasureId support
 */
function makeOfficer(
  id: number,
  factionId: number | null,
  cityId: number,
  overrides: Partial<Pick<Officer, 'loyalty' | 'isGovernor' | 'treasureId'>> = {}
): Officer {
  const base = baseOfficers.find(o => o.id === id)!;
  return {
    ...base,
    factionId,
    cityId,
    stamina: 100,
    loyalty: overrides.loyalty ?? (factionId === null ? 0 : 80),
    isGovernor: overrides.isGovernor ?? false,
    treasureId: overrides.treasureId ?? null,
  };
}

// ============================================================
// 劇本一：189年 董卓廢少帝
// ============================================================
const scenario189: Scenario = {
  id: 1,
  name: '董卓廢少帝',
  subtitle: '火燒洛陽',
  year: 189,
  description: '董卓廢少帝，立獻帝，遷都長安。各路諸侯起兵討伐，天下大亂。',
  factions: [
    { id: 1, name: '曹操',   rulerId: 20, color: '#2563eb', isPlayer: false, relations: {}, allies: [] },
    { id: 2, name: '劉備',   rulerId: 1,  color: '#16a34a', isPlayer: false, relations: {}, allies: [] },
    { id: 3, name: '孫堅',   rulerId: 50, color: '#dc2626', isPlayer: false, relations: {}, allies: [] },
    { id: 4, name: '董卓',   rulerId: 71, color: '#7c3aed', isPlayer: false, relations: {}, allies: [] },
    { id: 5, name: '袁紹',   rulerId: 72, color: '#ca8a04', isPlayer: false, relations: {}, allies: [] },
    { id: 6, name: '袁術',   rulerId: 73, color: '#ea580c', isPlayer: false, relations: {}, allies: [] },
    { id: 7, name: '劉表',   rulerId: 74, color: '#0d9488', isPlayer: false, relations: {}, allies: [] },
    { id: 8, name: '公孫瓚', rulerId: 77, color: '#be185d', isPlayer: false, relations: {}, allies: [] },
    { id: 9, name: '馬騰',   rulerId: 76, color: '#78716c', isPlayer: false, relations: {}, allies: [] },
    { id: 10, name: '陶謙',  rulerId: 78, color: '#65a30d', isPlayer: false, relations: {}, allies: [] },
  ],
  cities: [
    // 董卓 - 長安：高技術、高防禦、低治水（內陸）
    makeCity(11, 4, { 
      gold: 15000, food: 30000, troops: 50000, defense: 90,
      technology: 60, peopleLoyalty: 40, morale: 70, training: 60,
      warHorses: 200, crossbows: 100 
    }),
    // 董卓 - 洛陽：首都，高民忠但最近受戰亂影響
    makeCity(10, 4, { 
      gold: 12000, food: 25000, troops: 30000, defense: 80,
      technology: 50, peopleLoyalty: 35, morale: 60, training: 50,
      warHorses: 100 
    }),
    // 袁紹 - 南皮
    makeCity(4, 5, { 
      troops: 30000, defense: 70, peopleLoyalty: 75, morale: 65, training: 55 
    }),
    // 袁紹 - 鄴：技術中心
    makeCity(7, 5, { 
      troops: 25000, technology: 55, peopleLoyalty: 70, morale: 60, training: 50,
      crossbows: 50 
    }),
    // 曹操 - 陳留
    makeCity(13, 1, { 
      troops: 15000, defense: 60, peopleLoyalty: 65, morale: 70, training: 55 
    }),
    // 劉備 - 小沛：資源匱乏
    makeCity(43, 2, { 
      troops: 5000, gold: 2000, food: 5000, defense: 45,
      peopleLoyalty: 60, morale: 50, training: 35 
    }),
    // 孫堅 - 柴桑：河川城市，高治水
    makeCity(25, 3, { 
      troops: 15000, floodControl: 80, technology: 40, 
      peopleLoyalty: 75, morale: 65, training: 50 
    }),
    // 袁術 - 壽春
    makeCity(16, 6, { 
      troops: 18000, peopleLoyalty: 55, morale: 55, training: 45 
    }),
    // 劉表 - 襄陽：荊州核心
    makeCity(20, 7, { 
      troops: 20000, gold: 8000, food: 18000, defense: 75,
      technology: 45, peopleLoyalty: 70, morale: 60, training: 50 
    }),
    // 劉表 - 江陵
    makeCity(23, 7, { 
      troops: 12000, floodControl: 70, peopleLoyalty: 65, morale: 55, training: 45 
    }),
    // 公孫瓚 - 北平：邊境要塞
    makeCity(2, 8, { 
      troops: 22000, defense: 75, technology: 35, peopleLoyalty: 60, morale: 65, training: 60,
      warHorses: 300 
    }),
    // 馬騰 - 西涼：騎兵產地
    makeCity(40, 9, { 
      troops: 18000, gold: 3000, food: 8000, defense: 60,
      technology: 30, peopleLoyalty: 65, morale: 70, training: 65,
      warHorses: 500 
    }),
    // 陶謙 - 下邳
    makeCity(15, 10, { 
      troops: 12000, peopleLoyalty: 70, morale: 55, training: 40 
    }),
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
    makeOfficer(70, 4, 11, { loyalty: 40, treasureId: 9 }),  // 呂布持方天畫戟
    makeOfficer(85, 4, 10, { loyalty: 85, isGovernor: true }),
    makeOfficer(31, 4, 11, { loyalty: 75 }),
    makeOfficer(88, 4, 11, { loyalty: 88 }),
    makeOfficer(89, 4, 11, { loyalty: 80 }),
    makeOfficer(90, 4, 10, { loyalty: 78 }),
    makeOfficer(91, 4, 11, { loyalty: 75 }),
    makeOfficer(92, 4, 10, { loyalty: 75 }),

    // 袁紹軍
    makeOfficer(72, 5, 7, { loyalty: 100, isGovernor: true }),
    makeOfficer(86, 5, 7, { loyalty: 88 }),
    makeOfficer(87, 5, 7, { loyalty: 85 }),
    makeOfficer(29, 5, 7, { loyalty: 82 }),
    makeOfficer(93, 5, 7, { loyalty: 90 }),
    makeOfficer(94, 5, 7, { loyalty: 85 }),
    makeOfficer(95, 5, 7, { loyalty: 82 }),
    makeOfficer(96, 5, 7, { loyalty: 80 }),
    makeOfficer(97, 5, 7, { loyalty: 85 }),

    // 袁術軍
    makeOfficer(73, 6, 16, { loyalty: 100, isGovernor: true }),
    makeOfficer(98, 6, 16, { loyalty: 85 }),
    makeOfficer(99, 6, 16, { loyalty: 80 }),
    makeOfficer(100, 6, 16, { loyalty: 78 }),

    // 劉表軍
    makeOfficer(74, 7, 20, { loyalty: 100, isGovernor: true }),
    makeOfficer(101, 7, 20, { loyalty: 88 }),
    makeOfficer(102, 7, 20, { loyalty: 85 }),
    makeOfficer(103, 7, 20, { loyalty: 82 }),
    makeOfficer(104, 7, 20, { loyalty: 80 }),

    // 公孫瓚軍
    makeOfficer(77, 8, 2, { loyalty: 100, isGovernor: true }),
    makeOfficer(5,  8, 2, { loyalty: 80 }),  // 趙雲先在公孫瓚麾下
    makeOfficer(105, 8, 2, { loyalty: 85 }),
    makeOfficer(106, 8, 2, { loyalty: 82 }),

    // 馬騰軍
    makeOfficer(76, 9, 40, { loyalty: 100, isGovernor: true }),
    makeOfficer(6,  9, 40, { loyalty: 95 }),  // 馬超
    makeOfficer(110, 9, 40, { loyalty: 88 }),
    makeOfficer(111, 9, 40, { loyalty: 85 }),

    // 陶謙軍
    makeOfficer(78, 10, 15, { loyalty: 100, isGovernor: true }),
    makeOfficer(107, 10, 15, { loyalty: 85 }),
    makeOfficer(108, 10, 15, { loyalty: 82 }),
    makeOfficer(109, 10, 15, { loyalty: 80 }),

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
    makeOfficer(112, null, 20, {}), // 徐庶
    makeOfficer(113, null, 28, {}), // 張任
    makeOfficer(114, null, 18, {}), // 嚴顏
  ],
};

export const scenarios: Scenario[] = [scenario189];
