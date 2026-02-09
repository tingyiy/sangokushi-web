import type { Scenario, City, Officer } from '../types';
import { baseCities } from './cities';
import { baseOfficers } from './officers';

/** Helper: create a full City from base + scenario overrides
 * Phase 1.2: Updated with new city attributes and differentiated stats
 */
function makeCity(
  id: number,
  factionId: number | null,
  overrides: Partial<Pick<City, 'population' | 'gold' | 'food' | 'commerce' | 'agriculture' | 'defense' | 'troops' | 'floodControl' | 'technology' | 'peopleLoyalty' | 'morale' | 'training' | 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults' | 'taxRate'>> = {}
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
    // Phase 6.7: Tax rate
    taxRate:      overrides.taxRate ?? 'medium',
  };
}

/** Helper: create a full Officer from base + assignment
 * Phase 1.4: Added treasureId support
 */
function makeOfficer(
  id: number,
  factionId: number | null,
  cityId: number,
  overrides: Partial<Pick<Officer, 'loyalty' | 'isGovernor' | 'treasureId' | 'rank' | 'relationships'>> = {}
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
    // Phase 6.2: Rank
    rank: overrides.rank ?? '一般',
    // Phase 7.3: Relationships
    relationships: overrides.relationships ?? [],
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
        { id: 1, name: '曹操',   rulerId: 20, advisorId: null, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 2, name: '劉備',   rulerId: 1,  advisorId: null, color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 3, name: '孫堅',   rulerId: 50, advisorId: null, color: '#dc2626', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 4, name: '董卓',   rulerId: 71, advisorId: null, color: '#7c3aed', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 5, name: '袁紹',   rulerId: 72, advisorId: null, color: '#ca8a04', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 6, name: '袁術',   rulerId: 73, advisorId: null, color: '#ea580c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 7, name: '劉表',   rulerId: 74, advisorId: null, color: '#0d9488', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 8, name: '公孫瓚', rulerId: 77, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 9, name: '馬騰',   rulerId: 76, advisorId: null, color: '#78716c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
        { id: 10, name: '陶謙',  rulerId: 78, advisorId: null, color: '#65a30d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
      ],  cities: [
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

// ============================================================
// 劇本二：194年 群雄爭中原
// ============================================================
const scenario194: Scenario = {
  id: 2,
  name: '群雄爭中原',
  subtitle: '曹操擴張',
  year: 194,
  description: '曹操在兗州站穩腳跟，呂布佔據徐州，劉備駐紮小沛，孫策在江東崛起。',
  factions: [
    { id: 1, name: '曹操', rulerId: 20, advisorId: 28, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 1,  advisorId: null, color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫策', rulerId: 51, advisorId: 53, color: '#dc2626', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 4, name: '呂布', rulerId: 70, advisorId: 88, color: '#7c3aed', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 5, name: '袁紹', rulerId: 72, advisorId: 93, color: '#ca8a04', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 6, name: '袁術', rulerId: 73, advisorId: null, color: '#ea580c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 7, name: '劉表', rulerId: 74, advisorId: 102, color: '#0d9488', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 8, name: '劉璋', rulerId: 75, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 9, name: '馬騰', rulerId: 76, advisorId: null, color: '#78716c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 10, name: '李傕', rulerId: 91, advisorId: 31, color: '#4b5563', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    makeCity(10, 10, { troops: 25000, defense: 70 }), // 洛陽 - 李傕
    makeCity(11, 10, { troops: 35000, defense: 85, gold: 10000 }), // 長安 - 李傕
    makeCity(13, 1, { troops: 30000, defense: 75, gold: 8000 }), // 陳留 - 曹操
    makeCity(9,  1, { troops: 20000 }), // 濮陽 - 曹操
    makeCity(15, 4, { troops: 25000, defense: 70 }), // 下邳 - 呂布
    makeCity(43, 2, { troops: 8000, gold: 3000 }), // 小沛 - 劉備
    makeCity(25, 3, { troops: 15000, technology: 45 }), // 柴桑 - 孫策
    makeCity(7,  5, { troops: 40000, technology: 60 }), // 鄴 - 袁紹
    makeCity(4,  5, { troops: 30000 }), // 南皮 - 袁紹
    makeCity(16, 6, { troops: 25000 }), // 壽春 - 袁術
    makeCity(20, 7, { troops: 35000, defense: 80 }), // 襄陽 - 劉表
    makeCity(28, 8, { troops: 30000, food: 40000 }), // 成都 - 劉璋
    makeCity(40, 9, { troops: 20000, warHorses: 800 }), // 西涼 - 馬騰
    ...baseCities.filter(c => ![10,11,13,9,15,43,25,7,4,16,20,28,40].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    // 曹操
    makeOfficer(20, 1, 13, { isGovernor: true, loyalty: 100 }),
    makeOfficer(21, 1, 13, { loyalty: 98 }),
    makeOfficer(22, 1, 9,  { isGovernor: true, loyalty: 98 }),
    makeOfficer(28, 1, 13, { loyalty: 100 }),
    makeOfficer(30, 1, 13, { loyalty: 95 }),
    makeOfficer(26, 1, 13, { loyalty: 92 }),
    makeOfficer(27, 1, 13, { loyalty: 95 }),
    
    // 劉備
    makeOfficer(1, 2, 43, { isGovernor: true, loyalty: 100 }),
    makeOfficer(2, 2, 43, { loyalty: 100 }),
    makeOfficer(3, 2, 43, { loyalty: 100 }),
    makeOfficer(5, 2, 43, { loyalty: 95 }), // 趙雲加入

    // 孫策
    makeOfficer(51, 3, 25, { isGovernor: true, loyalty: 100 }),
    makeOfficer(53, 3, 25, { loyalty: 100 }),
    makeOfficer(61, 3, 25, { loyalty: 90 }),
    makeOfficer(62, 3, 25, { loyalty: 88 }),

    // 呂布
    makeOfficer(70, 4, 15, { isGovernor: true, loyalty: 100 }),
    makeOfficer(88, 4, 15, { loyalty: 85 }), // 李儒投呂布? (虛構/假設) -> 修正：陳宮未在名單，暫用李儒代或不加
    makeOfficer(23, 4, 15, { loyalty: 85 }), // 張遼

    // 袁紹
    makeOfficer(72, 5, 7, { isGovernor: true, loyalty: 100 }),
    makeOfficer(86, 5, 7, { loyalty: 90 }),
    makeOfficer(87, 5, 4, { isGovernor: true, loyalty: 90 }),
    makeOfficer(93, 5, 7, { loyalty: 95 }),

    // 李傕
    makeOfficer(91, 10, 11, { isGovernor: true, loyalty: 100 }),
    makeOfficer(92, 10, 10, { isGovernor: true, loyalty: 90 }),
    makeOfficer(31, 10, 11, { loyalty: 80 }), // 賈詡

    // 其他
    makeOfficer(74, 7, 20, { isGovernor: true, loyalty: 100 }),
    makeOfficer(75, 8, 28, { isGovernor: true, loyalty: 100 }),
    makeOfficer(76, 9, 40, { isGovernor: true, loyalty: 100 }),
    makeOfficer(73, 6, 16, { isGovernor: true, loyalty: 100 }),
  ]
};

// ============================================================
// 劇本三：201年 官渡之戰
// ============================================================
const scenario200: Scenario = {
  id: 3,
  name: '官渡之戰',
  subtitle: '河北爭雄',
  year: 201,
  description: '袁紹消滅公孫瓚，統一河北，意圖南下。曹操挾天子以令諸侯，與袁紹決戰於官渡。',
  factions: [
    { id: 1, name: '曹操', rulerId: 20, advisorId: 30, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 1,  advisorId: null, color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 52, advisorId: 53, color: '#dc2626', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 5, name: '袁紹', rulerId: 72, advisorId: 93, color: '#ca8a04', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 7, name: '劉表', rulerId: 74, advisorId: 102, color: '#0d9488', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 8, name: '劉璋', rulerId: 75, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 9, name: '馬騰', rulerId: 76, advisorId: null, color: '#78716c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    makeCity(10, 1, { troops: 30000, defense: 85 }), // 洛陽 - 曹操
    makeCity(13, 1, { troops: 40000, gold: 15000 }), // 陳留 - 曹操
    makeCity(42, 1, { troops: 35000, defense: 90 }), // 許昌 - 曹操 (首都)
    makeCity(43, 2, { troops: 10000 }), // 小沛 - 劉備 (暫居)
    makeCity(22, 3, { troops: 30000, technology: 65 }), // 建業 - 孫權
    makeCity(7,  5, { troops: 60000, food: 80000, morale: 80 }), // 鄴 - 袁紹
    makeCity(20, 7, { troops: 40000 }), // 襄陽 - 劉表
    makeCity(28, 8, { troops: 35000 }), // 成都 - 劉璋
    makeCity(40, 9, { troops: 25000 }), // 西涼 - 馬騰
    ...baseCities.filter(c => ![10,13,42,43,22,7,20,28,40].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    // 曹操
    makeOfficer(20, 1, 42, { isGovernor: true, loyalty: 100 }),
    makeOfficer(2,  1, 42, { loyalty: 50 }), // 關羽暫降
    makeOfficer(23, 1, 10, { isGovernor: true, loyalty: 95 }),
    makeOfficer(30, 1, 42, { loyalty: 98 }),
    
    // 劉備
    makeOfficer(1, 2, 43, { isGovernor: true, loyalty: 100 }),
    makeOfficer(3, 2, 43, { loyalty: 100 }),
    
    // 孫權
    makeOfficer(52, 3, 22, { isGovernor: true, loyalty: 100 }),
    makeOfficer(53, 3, 22, { loyalty: 100 }),
    
    // 袁紹
    makeOfficer(72, 5, 7, { isGovernor: true, loyalty: 100 }),
    makeOfficer(86, 5, 7, { loyalty: 90 }),
    makeOfficer(87, 5, 7, { loyalty: 90 }),
    
    // 其他
    makeOfficer(74, 7, 20, { isGovernor: true, loyalty: 100 }),
    makeOfficer(75, 8, 28, { isGovernor: true, loyalty: 100 }),
    makeOfficer(76, 9, 40, { isGovernor: true, loyalty: 100 }),
  ]
};

// ============================================================
// 劇本四：208年 赤壁之戰
// ============================================================
const scenario208: Scenario = {
  id: 4,
  name: '赤壁之戰',
  subtitle: '臥龍出山',
  year: 208,
  description: '曹操統一北方，率大軍南下。劉備三顧茅廬請出諸葛亮，聯手東吳抗曹。',
  factions: [
    { id: 1, name: '曹操', rulerId: 20, advisorId: 32, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 1,  advisorId: 4,  color: '#16a34a', isPlayer: false, relations: {}, allies: [3], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 52, advisorId: 53, color: '#dc2626', isPlayer: false, relations: {}, allies: [2], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 8, name: '劉璋', rulerId: 75, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 11, name: '張魯', rulerId: 79, advisorId: null, color: '#059669', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    makeCity(10, 1, { troops: 40000 }), // 洛陽
    makeCity(11, 1, { troops: 40000 }), // 長安
    makeCity(42, 1, { troops: 50000 }), // 許昌
    makeCity(7,  1, { troops: 40000 }), // 鄴
    makeCity(20, 1, { troops: 60000 }), // 襄陽 (劉琮降曹)
    makeCity(23, 1, { troops: 50000 }), // 江陵
    makeCity(24, 2, { troops: 15000, gold: 5000 }), // 江夏 - 劉備
    makeCity(25, 3, { troops: 40000, defense: 90 }), // 柴桑 - 孫權
    makeCity(22, 3, { troops: 35000 }), // 建業
    makeCity(28, 8, { troops: 40000 }), // 成都 - 劉璋
    makeCity(18, 11, { troops: 25000 }), // 漢中 - 張魯
    ...baseCities.filter(c => ![10,11,42,7,20,23,24,25,22,28,18].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    makeOfficer(20, 1, 42, { isGovernor: true, loyalty: 100 }),
    makeOfficer(32, 1, 42, { loyalty: 95 }), // 司馬懿
    makeOfficer(1,  2, 24, { isGovernor: true, loyalty: 100 }),
    makeOfficer(4,  2, 24, { loyalty: 100 }), // 諸葛亮
    makeOfficer(2,  2, 24, { loyalty: 100 }),
    makeOfficer(3,  2, 24, { loyalty: 100 }),
    makeOfficer(5,  2, 24, { loyalty: 100 }),
    makeOfficer(52, 3, 22, { isGovernor: true, loyalty: 100 }),
    makeOfficer(53, 3, 25, { isGovernor: true, loyalty: 100 }), // 周瑜在柴桑
    makeOfficer(54, 3, 22, { loyalty: 90 }), // 陸遜
    makeOfficer(79, 11, 18, { isGovernor: true, loyalty: 100 }),
    makeOfficer(75, 8, 28, { isGovernor: true, loyalty: 100 }), // 劉璋
  ]
};

// ============================================================
// 劇本五：221年 三國鼎立
// ============================================================
const scenario221: Scenario = {
  id: 5,
  name: '三國鼎立',
  subtitle: '漢中王',
  year: 221,
  description: '劉備攻取漢中，進位漢中王。關羽水淹七軍，威震華夏。孫權襲取荊州。',
  factions: [
    { id: 1, name: '曹操', rulerId: 20, advisorId: 32, color: '#2563eb', isPlayer: false, relations: {}, allies: [3], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 1,  advisorId: 4,  color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 52, advisorId: 54, color: '#dc2626', isPlayer: false, relations: {}, allies: [1], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    makeCity(42, 1, { troops: 60000 }), // 許昌
    makeCity(11, 1, { troops: 50000 }), // 長安
    makeCity(20, 1, { troops: 40000 }), // 襄陽
    makeCity(28, 2, { troops: 50000 }), // 成都
    makeCity(18, 2, { troops: 30000 }), // 漢中
    makeCity(23, 2, { troops: 30000 }), // 江陵 (關羽)
    makeCity(22, 3, { troops: 50000 }), // 建業
    makeCity(25, 3, { troops: 40000 }), // 柴桑
    ...baseCities.filter(c => ![42,11,20,28,18,23,22,25].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    makeOfficer(20, 1, 42, { isGovernor: true, loyalty: 100 }),
    makeOfficer(32, 1, 42, { loyalty: 100 }),
    makeOfficer(1,  2, 28, { isGovernor: true, loyalty: 100 }),
    makeOfficer(4,  2, 28, { loyalty: 100 }),
    makeOfficer(2,  2, 23, { isGovernor: true, loyalty: 100 }), // 關羽守荊州
    makeOfficer(52, 3, 22, { isGovernor: true, loyalty: 100 }),
    makeOfficer(54, 3, 22, { loyalty: 95 }),
    makeOfficer(55, 3, 25, { isGovernor: true, loyalty: 95 }), // 呂蒙
  ]
};

// ============================================================
// 劇本六：235年 星落五丈原
// ============================================================
const scenario235: Scenario = {
  id: 6,
  name: '星落五丈原',
  subtitle: '諸葛歸天',
  year: 235,
  description: '諸葛亮六出祁山，與司馬懿對峙於五丈原。蜀漢丞相積勞成疾，星落秋風五丈原。',
  factions: [
    { id: 1, name: '曹叡', rulerId: 34, advisorId: 32, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉禪', rulerId: 11, advisorId: 4,  color: '#16a34a', isPlayer: false, relations: {}, allies: [3], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 52, advisorId: 54, color: '#dc2626', isPlayer: false, relations: {}, allies: [2], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    makeCity(10, 1, { troops: 40000 }), // 洛陽
    makeCity(11, 1, { troops: 60000 }), // 長安
    makeCity(42, 1, { troops: 50000 }), // 許昌
    makeCity(18, 2, { troops: 80000, morale: 90 }), // 漢中 - 蜀軍主力
    makeCity(28, 2, { troops: 40000 }), // 成都
    makeCity(22, 3, { troops: 50000 }), // 建業
    makeCity(20, 1, { troops: 40000 }), // 襄陽
    makeCity(23, 3, { troops: 40000 }), // 江陵
    ...baseCities.filter(c => ![10,11,42,18,28,22,20,23].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    makeOfficer(34, 1, 10, { isGovernor: true, loyalty: 100 }), // 曹叡
    makeOfficer(32, 1, 11, { loyalty: 100, isGovernor: true }), // 司馬懿鎮守長安
    makeOfficer(25, 1, 11, { loyalty: 90 }), // 張郃
    makeOfficer(11, 2, 28, { isGovernor: true, loyalty: 100 }), // 劉禪
    makeOfficer(4,  2, 18, { loyalty: 100, isGovernor: true }), // 諸葛亮在漢中
    makeOfficer(8,  2, 18, { loyalty: 80 }), // 魏延
    makeOfficer(5,  2, 28, { loyalty: 100 }), // 趙雲 (已老)
    makeOfficer(52, 3, 22, { isGovernor: true, loyalty: 100 }),
    makeOfficer(54, 3, 23, { isGovernor: true, loyalty: 100 }), // 陸遜守江陵
  ]
};

export const scenarios: Scenario[] = [scenario189, scenario194, scenario200, scenario208, scenario221, scenario235];