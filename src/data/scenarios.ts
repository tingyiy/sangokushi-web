import type { Scenario, City, Officer } from '../types';
import { baseCities, cityBaseStats } from './cities';
import { baseOfficers } from './officers';

/** Helper: create a full City from base + scenario overrides.
 * Uses per-city base stats (population, commerce, agriculture, floodControl)
 * from cityBaseStats for historically-differentiated defaults.
 */
function makeCity(
  id: number,
  factionId: number | null,
  overrides: Partial<Pick<City, 'population' | 'gold' | 'food' | 'commerce' | 'agriculture' | 'defense' | 'troops' | 'floodControl' | 'technology' | 'peopleLoyalty' | 'morale' | 'training' | 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults' | 'taxRate'>> = {}
): City {
  const base = baseCities.find(c => c.id === id)!;
  const stats = cityBaseStats[id];
  return {
    ...base,
    factionId,
    population: overrides.population ?? stats.population,
    gold: overrides.gold ?? 5000,
    food: overrides.food ?? 10000,
    commerce: overrides.commerce ?? stats.commerce,
    agriculture: overrides.agriculture ?? stats.agriculture,
    defense: overrides.defense ?? 50,
    troops: overrides.troops ?? 10000,
    floodControl: overrides.floodControl ?? stats.floodControl,
    technology: overrides.technology ?? 30,
    peopleLoyalty: overrides.peopleLoyalty ?? 70,
    morale: overrides.morale ?? 60,
    training: overrides.training ?? 40,
    crossbows: overrides.crossbows ?? 0,
    warHorses: overrides.warHorses ?? 0,
    batteringRams: overrides.batteringRams ?? 0,
    catapults: overrides.catapults ?? 0,
    taxRate: overrides.taxRate ?? 'medium',
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
    acted: false,
    loyalty: overrides.loyalty ?? (factionId === null ? 0 : 80),
    isGovernor: overrides.isGovernor ?? false,
    treasureId: overrides.treasureId ?? null,
    // Phase 6.2: Rank
    rank: overrides.rank ?? 'common',
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
    { id: 1, name: '曹操', rulerId: 11, advisorId: null, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 169, advisorId: null, color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫堅', rulerId: 264, advisorId: null, color: '#dc2626', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 4, name: '董卓', rulerId: 66, advisorId: null, color: '#7c3aed', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 5, name: '袁紹', rulerId: 376, advisorId: null, color: '#ca8a04', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 6, name: '袁術', rulerId: 377, advisorId: null, color: '#ea580c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 7, name: '劉表', rulerId: 170, advisorId: null, color: '#0d9488', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 8, name: '公孫瓚', rulerId: 94, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 9, name: '馬騰', rulerId: 208, advisorId: null, color: '#78716c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 10, name: '陶謙', rulerId: 285, advisorId: null, color: '#65a30d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ], cities: [
    // ── 董卓 (total ~450k) ──
    // 長安：西都，董卓主力
    makeCity(11, 4, {
      gold: 15000, food: 30000, troops: 130000, defense: 90,
      technology: 60, peopleLoyalty: 40, morale: 70, training: 60,
      warHorses: 200, crossbows: 100
    }),
    // 洛陽：東都，遷都後受損
    makeCity(12, 4, {
      gold: 12000, food: 25000, troops: 150000, defense: 80,
      technology: 50, peopleLoyalty: 35, morale: 60, training: 50,
      warHorses: 100
    }),
    // 天水：西北前哨 (absorbs 武威+安定 troops from balance data)
    makeCity(10, 4, {
      troops: 90000, defense: 55, peopleLoyalty: 45, morale: 50, training: 45
    }),
    // 弘農：關隘要地 (connects 長安↔洛陽)
    makeCity(13, 4, {
      troops: 80000, defense: 65, peopleLoyalty: 40, morale: 50, training: 45
    }),
    // ── 袁紹 (total ~220k) ──
    // 鄴：冀州核心
    makeCity(8, 5, {
      troops: 90000, technology: 55, peopleLoyalty: 75, morale: 65, training: 55,
      crossbows: 50
    }),
    // 南皮：河北副城
    makeCity(5, 5, {
      troops: 70000, defense: 70, peopleLoyalty: 75, morale: 65, training: 55
    }),
    // ── 公孫瓚 (total ~60k) ──
    // 北平：幽州邊境要塞
    makeCity(2, 8, {
      troops: 60000, defense: 75, technology: 35, peopleLoyalty: 60, morale: 65, training: 60,
      warHorses: 300
    }),
    // ── 曹操 (total ~40k, very weak) ──
    // 陳留：起兵之地
    makeCity(15, 1, {
      troops: 40000, defense: 60, peopleLoyalty: 65, morale: 70, training: 55
    }),
    // ── 劉備 (total ~15k, weakest) ──
    // 平原：資源匱乏
    makeCity(6, 2, {
      troops: 15000, gold: 2000, food: 5000, defense: 45,
      peopleLoyalty: 60, morale: 50, training: 35
    }),
    // ── 孫堅 (total ~50k) ──
    // 柴桑：江東據點
    makeCity(35, 3, {
      troops: 50000, floodControl: 80, technology: 40,
      peopleLoyalty: 75, morale: 65, training: 50
    }),
    // ── 袁術 (total ~40k) ──
    // 壽春：淮南
    makeCity(20, 6, {
      troops: 40000, peopleLoyalty: 55, morale: 55, training: 45
    }),
    // ── 劉表 (total ~70k) ──
    // 襄陽：荊州核心
    makeCity(32, 7, {
      troops: 45000, gold: 8000, food: 18000, defense: 75,
      technology: 45, peopleLoyalty: 70, morale: 60, training: 50
    }),
    // 江陵：荊州副城
    makeCity(33, 7, {
      troops: 25000, floodControl: 70, peopleLoyalty: 65, morale: 55, training: 45
    }),
    // ── 馬騰 (total ~40k) ──
    // 西涼：騎兵產地
    makeCity(9, 9, {
      troops: 40000, gold: 3000, food: 8000, defense: 60,
      technology: 30, peopleLoyalty: 65, morale: 70, training: 65,
      warHorses: 500
    }),
    // ── 陶謙 (total ~30k) ──
    // 徐州
    makeCity(19, 10, {
      troops: 30000, peopleLoyalty: 70, morale: 55, training: 40
    }),
    // Neutral cities
    ...baseCities
      .filter(c => ![11, 12, 10, 13, 5, 8, 2, 15, 35, 20, 32, 33, 9, 6, 19].includes(c.id))
      .map(c => makeCity(c.id, null, { troops: 0, gold: 2000, food: 5000, defense: 30 })),
  ],
  officers: [
    // 曹操軍
    makeOfficer(11, 1, 15, { loyalty: 100, isGovernor: true }),
    makeOfficer(326, 1, 15, { loyalty: 95 }),
    makeOfficer(334, 1, 15, { loyalty: 92 }),
    makeOfficer(347, 1, 15, { loyalty: 90 }),
    makeOfficer(55, 1, 15, { loyalty: 95 }),
    makeOfficer(350, 1, 15, { loyalty: 98 }),
    makeOfficer(103, 1, 15, { loyalty: 95 }),
    makeOfficer(18, 1, 15, { loyalty: 88 }),

    // 劉備軍
    makeOfficer(169, 2, 6, { loyalty: 100, isGovernor: true }),
    makeOfficer(100, 2, 6, { loyalty: 100 }),
    makeOfficer(390, 2, 6, { loyalty: 100 }),

    // 孫堅軍
    makeOfficer(264, 3, 35, { loyalty: 100, isGovernor: true }),
    makeOfficer(258, 3, 35, { loyalty: 100 }),
    makeOfficer(430, 3, 35, { loyalty: 95 }),
    makeOfficer(125, 3, 35, { loyalty: 90 }),
    makeOfficer(44, 3, 35, { loyalty: 88 }),

    // 董卓軍
    makeOfficer(66, 4, 11, { loyalty: 100, isGovernor: true }),
    makeOfficer(187, 4, 11, { loyalty: 40, treasureId: 9 }),  // 呂布持方天畫戟
    makeOfficer(123, 4, 12, { loyalty: 85, isGovernor: true }),
    makeOfficer(136, 4, 11, { loyalty: 75 }),
    makeOfficer(160, 4, 11, { loyalty: 88 }),
    makeOfficer(396, 4, 13, { loyalty: 80, isGovernor: true }), // 張濟 - 弘農
    makeOfficer(90, 4, 10, { loyalty: 78, isGovernor: true }),
    makeOfficer(158, 4, 11, { loyalty: 75 }),
    makeOfficer(104, 4, 12, { loyalty: 75 }),

    // 袁紹軍 - 鄴
    makeOfficer(376, 5, 8, { loyalty: 100, isGovernor: true }),
    makeOfficer(309, 5, 8, { loyalty: 85 }),
    makeOfficer(349, 5, 8, { loyalty: 82 }),
    makeOfficer(288, 5, 8, { loyalty: 90 }),
    makeOfficer(147, 5, 8, { loyalty: 85 }),
    makeOfficer(244, 5, 8, { loyalty: 82 }),
    makeOfficer(75, 5, 8, { loyalty: 80 }),
    // 袁紹軍 - 南皮
    makeOfficer(354, 5, 5, { loyalty: 88, isGovernor: true }),  // 顏良
    makeOfficer(84, 5, 5, { loyalty: 85 }),   // 高覽

    // 袁術軍
    makeOfficer(377, 6, 20, { loyalty: 100, isGovernor: true }),
    makeOfficer(133, 6, 20, { loyalty: 85 }),
    makeOfficer(410, 6, 20, { loyalty: 80 }),

    // 劉表軍 - 襄陽
    makeOfficer(170, 7, 32, { loyalty: 100, isGovernor: true }),
    makeOfficer(6, 7, 32, { loyalty: 88 }),
    makeOfficer(151, 7, 32, { loyalty: 85 }),
    makeOfficer(152, 7, 32, { loyalty: 82 }),
    // 劉表軍 - 江陵
    makeOfficer(310, 7, 33, { loyalty: 80, isGovernor: true }),  // 文聘

    // 公孫瓚軍
    makeOfficer(94, 8, 2, { loyalty: 100, isGovernor: true }),
    makeOfficer(421, 8, 2, { loyalty: 80 }),  // 趙雲先在公孫瓚麾下
    makeOfficer(105, 8, 2, { loyalty: 85 }),
    makeOfficer(353, 8, 2, { loyalty: 82 }),

    // 馬騰軍
    makeOfficer(208, 9, 9, { loyalty: 100, isGovernor: true }),
    makeOfficer(204, 9, 9, { loyalty: 95 }),  // 馬超
    makeOfficer(228, 9, 9, { loyalty: 88 }),
    makeOfficer(205, 9, 9, { loyalty: 85 }),

    // 陶謙軍
    makeOfficer(285, 10, 19, { loyalty: 100, isGovernor: true }),
    makeOfficer(223, 10, 19, { loyalty: 85 }),
    makeOfficer(222, 10, 19, { loyalty: 82 }),
    makeOfficer(32, 10, 19, { loyalty: 80 }),

    // 在野武將
    makeOfficer(4, null, 20, {}),   // 諸葛亮 — 荊州隱居
    makeOfficer(9, null, 20, {}),   // 龐統
    makeOfficer(7, null, 20, {}),   // 黃忠 — 劉表領地
    makeOfficer(8, null, 18, {}),   // 魏延
    makeOfficer(10, null, 28, {}),  // 法正 — 蜀中
    makeOfficer(253, null, 10, {}), // 司馬懿 — 洛陽在野
    makeOfficer(194, null, 25, {}), // 呂蒙 — 少年
    makeOfficer(199, null, 22, {}), // 陸遜 — 少年
    makeOfficer(196, null, 22, {}), // 魯肅
    makeOfficer(450, null, 11, {}), // 貂蟬
    makeOfficer(343, null, 20, {}), // 徐庶
    makeOfficer(402, null, 28, {}), // 張任
    makeOfficer(355, null, 18, {}), // 嚴顏
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
  description: '曹操在兗州站穩腳跟，呂布佔據徐州，劉備駐紮下邳，孫策在江東崛起。',
  factions: [
    { id: 1, name: '曹操', rulerId: 11, advisorId: 350, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 169, advisorId: null, color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫策', rulerId: 258, advisorId: 430, color: '#dc2626', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 4, name: '呂布', rulerId: 187, advisorId: 160, color: '#7c3aed', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 5, name: '袁紹', rulerId: 376, advisorId: 288, color: '#ca8a04', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 6, name: '袁術', rulerId: 377, advisorId: null, color: '#ea580c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 7, name: '劉表', rulerId: 170, advisorId: 151, color: '#0d9488', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 8, name: '劉璋', rulerId: 185, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 9, name: '馬騰', rulerId: 208, advisorId: null, color: '#78716c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 10, name: '李傕', rulerId: 158, advisorId: 136, color: '#4b5563', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    // ── 李傕 (remnants, total ~100k) ──
    makeCity(12, 10, { troops: 40000, defense: 70 }), // 洛陽
    makeCity(11, 10, { troops: 50000, defense: 85, gold: 10000 }), // 長安
    makeCity(13, 10, { troops: 10000, defense: 50 }), // 弘農 (connects 長安↔洛陽)
    // ── 曹操 (total ~220k) ──
    makeCity(15, 1, { troops: 50000, defense: 75, gold: 8000 }), // 陳留
    makeCity(16, 1, { troops: 60000 }), // 濮陽
    makeCity(14, 1, { troops: 80000, defense: 80 }), // 許昌 (emerging capital)
    // ── 呂布 (total ~100k) ──
    makeCity(18, 4, { troops: 60000, defense: 70 }), // 下邳
    makeCity(17, 4, { troops: 40000 }), // 譙
    // ── 劉備 (total ~30k, weak) ──
    makeCity(19, 2, { troops: 30000, gold: 3000 }), // 徐州
    // ── 孫策 (total ~100k) ──
    makeCity(35, 3, { troops: 40000, technology: 45 }), // 柴桑
    makeCity(39, 3, { troops: 20000 }), // 廬江 (connects 柴桑↔建業)
    makeCity(38, 3, { troops: 40000 }), // 建業 (expanding into Jiangdong)
    // ── 袁紹 (total ~300k) ──
    makeCity(8, 5, { troops: 120000, technology: 60 }), // 鄴
    makeCity(5, 5, { troops: 80000 }), // 南皮
    makeCity(2, 5, { troops: 60000 }), // 北平 (absorbed 公孫瓚)
    makeCity(6, 5, { troops: 40000 }), // 平原
    // ── 袁術 (total ~60k) ──
    makeCity(20, 6, { troops: 60000 }), // 壽春
    // ── 劉表 (total ~80k) ──
    makeCity(32, 7, { troops: 50000, defense: 80 }), // 襄陽
    makeCity(33, 7, { troops: 30000 }), // 江陵
    // ── 劉璋 (total ~60k) ──
    makeCity(25, 8, { troops: 60000, food: 40000 }), // 成都
    // ── 馬騰 (total ~40k) ──
    makeCity(9, 9, { troops: 40000, warHorses: 800 }), // 西涼
    // Neutral cities
    ...baseCities.filter(c => ![12, 11, 13, 15, 16, 14, 18, 17, 19, 35, 39, 38, 8, 5, 2, 6, 20, 32, 33, 25, 9].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    // 曹操 - 許昌
    makeOfficer(11, 1, 14, { isGovernor: true, loyalty: 100 }),
    makeOfficer(350, 1, 14, { loyalty: 100 }),
    makeOfficer(103, 1, 14, { loyalty: 95 }),
    // 曹操 - 陳留
    makeOfficer(326, 1, 15, { loyalty: 98, isGovernor: true }),
    makeOfficer(55, 1, 15, { loyalty: 95 }),
    // 曹操 - 濮陽
    makeOfficer(334, 1, 16, { isGovernor: true, loyalty: 98 }),
    makeOfficer(347, 1, 16, { loyalty: 92 }),

    // 劉備 - 徐州
    makeOfficer(169, 2, 19, { isGovernor: true, loyalty: 100 }),
    makeOfficer(100, 2, 19, { loyalty: 100 }),
    makeOfficer(390, 2, 19, { loyalty: 100 }),
    makeOfficer(421, 2, 19, { loyalty: 95 }), // 趙雲加入

    // 孫策 - 柴桑
    makeOfficer(258, 3, 35, { isGovernor: true, loyalty: 100 }),
    makeOfficer(430, 3, 35, { loyalty: 100 }),
    // 孫策 - 廬江
    makeOfficer(125, 3, 39, { isGovernor: true, loyalty: 88 }), // 黃蓋
    // 孫策 - 建業
    makeOfficer(44, 3, 38, { isGovernor: true, loyalty: 90 }),
    makeOfficer(108, 3, 38, { loyalty: 88 }),

    // 呂布 - 下邳
    makeOfficer(187, 4, 18, { isGovernor: true, loyalty: 100 }),
    makeOfficer(398, 4, 18, { loyalty: 85 }), // 張遼
    // 呂布 - 譙
    makeOfficer(160, 4, 17, { isGovernor: true, loyalty: 85 }),

    // 袁紹 - 鄴
    makeOfficer(376, 5, 8, { isGovernor: true, loyalty: 100 }),
    makeOfficer(354, 5, 8, { loyalty: 90 }),
    makeOfficer(288, 5, 8, { loyalty: 95 }),
    // 袁紹 - 南皮
    makeOfficer(309, 5, 5, { isGovernor: true, loyalty: 90 }),
    // 袁紹 - 北平
    makeOfficer(349, 5, 2, { isGovernor: true, loyalty: 88 }),
    // 袁紹 - 平原
    makeOfficer(84, 5, 6, { isGovernor: true, loyalty: 85 }),

    // 李傕 - 長安
    makeOfficer(158, 10, 11, { isGovernor: true, loyalty: 100 }),
    // 李傕 - 洛陽
    makeOfficer(104, 10, 12, { isGovernor: true, loyalty: 90 }),
    // 李傕 - 弘農
    makeOfficer(136, 10, 13, { loyalty: 80, isGovernor: true }), // 賈詡

    // 其他
    makeOfficer(170, 7, 32, { isGovernor: true, loyalty: 100 }),
    makeOfficer(310, 7, 33, { isGovernor: true, loyalty: 85 }), // 文聘 - 江陵
    makeOfficer(185, 8, 25, { isGovernor: true, loyalty: 100 }),
    makeOfficer(208, 9, 9, { isGovernor: true, loyalty: 100 }),
    makeOfficer(377, 6, 20, { isGovernor: true, loyalty: 100 }),
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
    { id: 1, name: '曹操', rulerId: 11, advisorId: 103, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 169, advisorId: null, color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 273, advisorId: 430, color: '#dc2626', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 5, name: '袁紹', rulerId: 376, advisorId: 288, color: '#ca8a04', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 7, name: '劉表', rulerId: 170, advisorId: 151, color: '#0d9488', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 8, name: '劉璋', rulerId: 185, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 9, name: '馬騰', rulerId: 208, advisorId: null, color: '#78716c', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    // ── 曹操 (total ~350k) ──
    makeCity(12, 1, { troops: 80000, defense: 85 }), // 洛陽
    makeCity(15, 1, { troops: 60000, gold: 15000 }), // 陳留
    makeCity(14, 1, { troops: 100000, defense: 90 }), // 許昌 (首都)
    makeCity(16, 1, { troops: 50000 }), // 濮陽
    makeCity(17, 1, { troops: 40000 }), // 譙
    // ── 劉備 (total ~30k, weak, sheltering with 劉表) ──
    makeCity(18, 2, { troops: 30000 }), // 下邳 (暫居)
    // ── 孫權 (total ~120k) ──
    makeCity(38, 3, { troops: 60000, technology: 65 }), // 建業
    makeCity(39, 3, { troops: 20000 }), // 廬江 (connects 建業↔柴桑)
    makeCity(35, 3, { troops: 40000 }), // 柴桑
    // ── 袁紹 (total ~400k, strongest) ──
    makeCity(8, 5, { troops: 150000, food: 80000, morale: 80 }), // 鄴 (主力)
    makeCity(5, 5, { troops: 100000 }), // 南皮
    makeCity(2, 5, { troops: 80000 }), // 北平
    makeCity(6, 5, { troops: 70000 }), // 平原
    // ── 劉表 (total ~100k) ──
    makeCity(32, 7, { troops: 60000, defense: 80 }), // 襄陽
    makeCity(33, 7, { troops: 40000 }), // 江陵
    // ── 劉璋 (total ~80k) ──
    makeCity(25, 8, { troops: 80000 }), // 成都
    // ── 馬騰 (total ~50k) ──
    makeCity(9, 9, { troops: 50000 }), // 西涼
    // Neutral cities
    ...baseCities.filter(c => ![12, 15, 14, 16, 17, 18, 38, 39, 35, 8, 5, 2, 6, 32, 33, 25, 9].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    // 曹操 - 許昌
    makeOfficer(11, 1, 14, { isGovernor: true, loyalty: 100 }),
    makeOfficer(100, 1, 14, { loyalty: 50 }), // 關羽暫降
    makeOfficer(103, 1, 14, { loyalty: 98 }),
    // 曹操 - 洛陽
    makeOfficer(398, 1, 12, { isGovernor: true, loyalty: 95 }), // 張遼
    // 曹操 - 陳留
    makeOfficer(349, 1, 15, { isGovernor: true, loyalty: 92 }), // 荀攸
    // 曹操 - 濮陽
    makeOfficer(347, 1, 16, { isGovernor: true, loyalty: 90 }), // 于禁
    // 曹操 - 譯
    makeOfficer(55, 1, 17, { isGovernor: true, loyalty: 95 }), // 曹洪

    // 劉備
    makeOfficer(169, 2, 18, { isGovernor: true, loyalty: 100 }),
    makeOfficer(390, 2, 18, { loyalty: 100 }),

    // 孫權
    makeOfficer(273, 3, 38, { isGovernor: true, loyalty: 100 }),
    makeOfficer(430, 3, 38, { loyalty: 100 }),
    // 孫權 - 廬江
    makeOfficer(125, 3, 39, { isGovernor: true, loyalty: 88 }), // 黃蓋
    // 孫權 - 柴桑
    makeOfficer(44, 3, 35, { isGovernor: true, loyalty: 90 }), // 程普

    // 袁紹
    makeOfficer(376, 5, 8, { isGovernor: true, loyalty: 100 }),
    makeOfficer(354, 5, 8, { loyalty: 90 }),
    makeOfficer(309, 5, 8, { loyalty: 90 }),
    // 袁紹 - 南皮
    makeOfficer(84, 5, 5, { isGovernor: true, loyalty: 85 }), // 高覽
    // 袁紹 - 北平
    makeOfficer(244, 5, 2, { isGovernor: true, loyalty: 82 }), // 審配
    // 袁紹 - 平原
    makeOfficer(75, 5, 6, { isGovernor: true, loyalty: 80 }), // 郭圖

    // 其他
    makeOfficer(170, 7, 32, { isGovernor: true, loyalty: 100 }),
    makeOfficer(310, 7, 33, { isGovernor: true, loyalty: 85 }), // 文聘 - 江陵
    makeOfficer(185, 8, 25, { isGovernor: true, loyalty: 100 }),
    makeOfficer(208, 9, 9, { isGovernor: true, loyalty: 100 }),
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
    { id: 1, name: '曹操', rulerId: 11, advisorId: 253, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 169, advisorId: 443, color: '#16a34a', isPlayer: false, relations: {}, allies: [3], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 273, advisorId: 430, color: '#dc2626', isPlayer: false, relations: {}, allies: [2], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 8, name: '劉璋', rulerId: 185, advisorId: null, color: '#be185d', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 11, name: '張魯', rulerId: 399, advisorId: null, color: '#059669', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    // ── 曹操 (total ~650k) ──
    makeCity(8, 1, { troops: 120000 }), // 鄴
    makeCity(14, 1, { troops: 150000 }), // 許昌
    makeCity(12, 1, { troops: 100000 }), // 洛陽
    makeCity(11, 1, { troops: 90000 }), // 長安
    makeCity(13, 1, { troops: 30000 }), // 弘農 (connects 長安↔洛陽)
    makeCity(30, 1, { troops: 30000 }), // 宛 (connects 許昌→新野)
    makeCity(31, 1, { troops: 20000 }), // 新野 (connects 宛→襄陽)
    makeCity(32, 1, { troops: 60000 }), // 襄陽 (劉琮降曹)
    makeCity(20, 1, { troops: 50000 }), // 壽春 (曹操東線)
    makeCity(19, 1, { troops: 30000 }), // 徐州 (connects 曹操中原↔壽春)
    makeCity(17, 1, { troops: 20000 }), // 譯 (connects 許昌↔徐州)
    // ── 劉備 (total ~80k, very weak) ──
    makeCity(34, 2, { troops: 80000, gold: 5000 }), // 江夏
    // ── 孫權 (total ~200k) ──
    makeCity(38, 3, { troops: 80000 }), // 建業
    makeCity(35, 3, { troops: 50000, defense: 90 }), // 柴桑
    makeCity(39, 3, { troops: 40000 }), // 廬江 (connects 柴桑↔建業)
    makeCity(40, 3, { troops: 30000 }), // 吳
    // ── 劉璋 (total ~80k) ──
    makeCity(25, 8, { troops: 80000 }), // 成都
    // ── 張魯 (total ~40k) ──
    makeCity(22, 11, { troops: 40000 }), // 漢中
    // Neutral cities (江陵 is contested — starts neutral after 赤壁)
    makeCity(33, null, { troops: 0 }), // 江陵 (will be fought over)
    ...baseCities.filter(c => ![8, 14, 12, 11, 13, 30, 31, 32, 20, 19, 17, 34, 38, 35, 39, 40, 25, 22, 33].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    // 曹操 - 許昌
    makeOfficer(11, 1, 14, { isGovernor: true, loyalty: 100 }),
    makeOfficer(253, 1, 14, { loyalty: 95 }), // 司馬懿
    // 曹操 - 洛陽
    makeOfficer(326, 1, 12, { isGovernor: true, loyalty: 95 }), // 夏侯惇
    // 曹操 - 長安
    makeOfficer(334, 1, 11, { isGovernor: true, loyalty: 95 }), // 夏侯淵
    // 曹操 - 弘農
    makeOfficer(349, 1, 13, { isGovernor: true, loyalty: 92 }), // 荀攸
    // 曹操 - 鄴
    makeOfficer(391, 1, 8, { isGovernor: true, loyalty: 90 }), // 張郃
    // 曹操 - 襄陽 (劉琮降曹)
    makeOfficer(339, 1, 32, { isGovernor: true, loyalty: 90 }), // 徐晃
    makeOfficer(18, 1, 32, { loyalty: 95 }), // 曹仁 (preparing to take 江陵)
    // 曹操 - 宛
    makeOfficer(136, 1, 30, { isGovernor: true, loyalty: 88 }), // 賈詡
    // 曹操 - 新野
    makeOfficer(398, 1, 31, { isGovernor: true, loyalty: 90 }), // 張遼
    // 曹操 - 徐州
    makeOfficer(347, 1, 19, { isGovernor: true, loyalty: 92 }), // 于禁
    // 曹操 - 壽春
    makeOfficer(55, 1, 20, { isGovernor: true, loyalty: 95 }), // 曹洪
    // 曹操 - 譯
    makeOfficer(103, 1, 17, { isGovernor: true, loyalty: 98 }), // 荀彧
    // 劉備 - 江夏
    makeOfficer(169, 2, 34, { isGovernor: true, loyalty: 100 }),
    makeOfficer(443, 2, 34, { loyalty: 100 }), // 諸葛亮
    makeOfficer(100, 2, 34, { loyalty: 100 }),
    makeOfficer(390, 2, 34, { loyalty: 100 }),
    makeOfficer(421, 2, 34, { loyalty: 100 }),
    // 孫權 - 建業
    makeOfficer(273, 3, 38, { isGovernor: true, loyalty: 100 }),
    makeOfficer(199, 3, 38, { loyalty: 90 }), // 陸遜
    // 孫權 - 柴桑
    makeOfficer(430, 3, 35, { isGovernor: true, loyalty: 100 }), // 周瑜
    // 孫權 - 廬江
    makeOfficer(196, 3, 39, { isGovernor: true, loyalty: 90 }), // 魯肅
    // 孫權 - 吳
    makeOfficer(44, 3, 40, { isGovernor: true, loyalty: 90 }), // 程普
    // 張魯
    makeOfficer(399, 11, 22, { isGovernor: true, loyalty: 100 }),
    // 劉璋
    makeOfficer(185, 8, 25, { isGovernor: true, loyalty: 100 }),
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
    { id: 1, name: '曹操', rulerId: 11, advisorId: 253, color: '#2563eb', isPlayer: false, relations: {}, allies: [3], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉備', rulerId: 169, advisorId: 443, color: '#16a34a', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 273, advisorId: 199, color: '#dc2626', isPlayer: false, relations: {}, allies: [1], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    // ── 魏 (total ~900k) ──
    makeCity(8, 1, { troops: 200000 }), // 鄴
    makeCity(14, 1, { troops: 180000 }), // 許昌
    makeCity(12, 1, { troops: 150000 }), // 洛陽
    makeCity(11, 1, { troops: 130000 }), // 長安
    makeCity(13, 1, { troops: 40000 }), // 弘農 (connects 洛陽↔長安)
    makeCity(30, 1, { troops: 40000 }), // 宛 (connects 許昌→新野)
    makeCity(31, 1, { troops: 30000 }), // 新野 (connects 宛→襄陽)
    makeCity(32, 1, { troops: 120000 }), // 襄陽 (魏南部重鎮)
    makeCity(15, 1, { troops: 10000 }), // 陳留 (後方)
    // ── 蜀 (total ~400k, defensive) ──
    makeCity(25, 2, { troops: 120000 }), // 成都
    makeCity(22, 2, { troops: 90000 }), // 漢中
    makeCity(27, 2, { troops: 70000 }), // 永安
    makeCity(26, 2, { troops: 20000 }), // 江州 (connects 成都↔永安)
    makeCity(24, 2, { troops: 30000 }), // 梓潼 (connects 成都↔漢中)
    makeCity(21, 2, { troops: 40000 }), // 武都
    makeCity(33, 2, { troops: 50000 }), // 江陵 (關羽)
    // ── 吳 (total ~550k) ──
    makeCity(38, 3, { troops: 150000 }), // 建業
    makeCity(35, 3, { troops: 120000 }), // 柴桑 (武昌 troops merged)
    makeCity(39, 3, { troops: 90000 }), // 廬江
    makeCity(41, 3, { troops: 80000 }), // 會稽
    makeCity(40, 3, { troops: 60000 }), // 吳
    makeCity(34, 3, { troops: 50000 }), // 江夏
    // Neutral cities
    ...baseCities.filter(c => ![8, 14, 12, 11, 13, 30, 31, 32, 15, 25, 22, 27, 26, 24, 21, 33, 38, 35, 39, 41, 40, 34].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    // 曹操 - 許昌
    makeOfficer(11, 1, 14, { isGovernor: true, loyalty: 100 }),
    makeOfficer(253, 1, 14, { loyalty: 100 }),
    // 曹操 - 洛陽
    makeOfficer(398, 1, 12, { isGovernor: true, loyalty: 92 }), // 張遼
    // 曹操 - 弘農
    makeOfficer(349, 1, 13, { isGovernor: true, loyalty: 92 }), // 荀攸
    // 曹操 - 長安
    makeOfficer(339, 1, 11, { isGovernor: true, loyalty: 90 }), // 徐晃
    // 曹操 - 宛
    makeOfficer(136, 1, 30, { isGovernor: true, loyalty: 88 }), // 賈詡
    // 曹操 - 新野
    makeOfficer(391, 1, 31, { isGovernor: true, loyalty: 90 }), // 張郃
    // 曹操 - 襄陽
    makeOfficer(18, 1, 32, { isGovernor: true, loyalty: 95 }), // 曹仁
    // 曹操 - 陳留
    makeOfficer(334, 1, 15, { isGovernor: true, loyalty: 95 }), // 夏侯淵
    // 曹操 - 鄴
    makeOfficer(55, 1, 8, { isGovernor: true, loyalty: 95 }), // 曹洪
    // 劉備 - 成都
    makeOfficer(169, 2, 25, { isGovernor: true, loyalty: 100 }),
    makeOfficer(443, 2, 25, { loyalty: 100 }),
    // 劉備 - 梓潼
    makeOfficer(390, 2, 24, { isGovernor: true, loyalty: 100 }), // 張飛
    // 劉備 - 漢中
    makeOfficer(308, 2, 22, { isGovernor: true, loyalty: 80 }), // 魏延
    // 劉備 - 武都
    makeOfficer(128, 2, 21, { isGovernor: true, loyalty: 90 }), // 黃忠
    // 劉備 - 永安
    makeOfficer(421, 2, 27, { isGovernor: true, loyalty: 100 }), // 趙雲
    // 劉備 - 江州
    makeOfficer(355, 2, 26, { isGovernor: true, loyalty: 85 }), // 嚴顏
    // 劉備 - 江陵
    makeOfficer(100, 2, 33, { isGovernor: true, loyalty: 100 }), // 關羽守荊州
    // 孫權 - 建業
    makeOfficer(273, 3, 38, { isGovernor: true, loyalty: 100 }),
    makeOfficer(199, 3, 38, { loyalty: 95 }),
    // 孫權 - 廬江
    makeOfficer(196, 3, 39, { isGovernor: true, loyalty: 90 }), // 魯肅
    // 孫權 - 柴桑
    makeOfficer(194, 3, 35, { isGovernor: true, loyalty: 95 }), // 呂蒙
    // 孫權 - 會稽
    makeOfficer(125, 3, 41, { isGovernor: true, loyalty: 88 }), // 黃蓋
    // 孫權 - 江夏
    makeOfficer(44, 3, 34, { isGovernor: true, loyalty: 90 }), // 程普
    // 孫權 - 吳
    makeOfficer(108, 3, 40, { isGovernor: true, loyalty: 88 }), // 韓當
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
    { id: 1, name: '曹叡', rulerId: 19, advisorId: 253, color: '#2563eb', isPlayer: false, relations: {}, allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 2, name: '劉禪', rulerId: 171, advisorId: 443, color: '#16a34a', isPlayer: false, relations: {}, allies: [3], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
    { id: 3, name: '孫權', rulerId: 273, advisorId: 199, color: '#dc2626', isPlayer: false, relations: {}, allies: [2], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [] },
  ],
  cities: [
    // ── 魏 (total ~1,000k) ──
    makeCity(12, 1, { troops: 120000 }), // 洛陽
    makeCity(13, 1, { troops: 40000 }), // 弘農 (connects 洛陽↔長安)
    makeCity(11, 1, { troops: 180000 }), // 長安 (司馬懿鎮守，對蜀前線)
    makeCity(14, 1, { troops: 150000 }), // 許昌
    makeCity(8, 1, { troops: 200000 }), // 鄴
    makeCity(30, 1, { troops: 60000 }), // 宛 (connects 許昌→新野)
    makeCity(31, 1, { troops: 40000 }), // 新野 (connects 宛→襄陽)
    makeCity(32, 1, { troops: 120000 }), // 襄陽
    makeCity(10, 1, { troops: 50000 }), // 天水 (對蜀前線)
    makeCity(15, 1, { troops: 40000 }), // 陳留 (後方)
    // ── 蜀 (total ~250k, weakest) ──
    makeCity(22, 2, { troops: 80000, morale: 90 }), // 漢中 - 蜀軍主力 (諸葛亮)
    makeCity(24, 2, { troops: 30000 }), // 梓潼 (connects 漢中↔成都)
    makeCity(25, 2, { troops: 100000 }), // 成都
    makeCity(26, 2, { troops: 15000 }), // 江州 (connects 成都↔永安)
    makeCity(27, 2, { troops: 40000 }), // 永安
    // ── 吳 (total ~600k) ──
    makeCity(38, 3, { troops: 150000 }), // 建業
    makeCity(39, 3, { troops: 60000 }), // 廬江 (connects 建業↔柴桑)
    makeCity(35, 3, { troops: 100000 }), // 柴桑
    makeCity(34, 3, { troops: 60000 }), // 江夏 (connects 柴桑↔江陵)
    makeCity(33, 3, { troops: 80000 }), // 江陵 (陸遜守)
    makeCity(36, 3, { troops: 20000 }), // 武陵 (connects 江陵↔長沙)
    makeCity(40, 3, { troops: 60000 }), // 吳
    makeCity(41, 3, { troops: 50000 }), // 會稽
    makeCity(37, 3, { troops: 40000 }), // 長沙
    // Neutral cities
    ...baseCities.filter(c => ![12, 13, 11, 14, 8, 30, 31, 32, 10, 15, 22, 24, 25, 26, 27, 38, 39, 35, 34, 33, 36, 40, 41, 37].includes(c.id)).map(c => makeCity(c.id, null, { troops: 0 })),
  ],
  officers: [
    // 曹叡 - 洛陽
    makeOfficer(19, 1, 12, { isGovernor: true, loyalty: 100 }), // 曹叡
    // 曹叡 - 弘農
    makeOfficer(18, 1, 13, { isGovernor: true, loyalty: 95 }), // 曹仁
    // 曹叡 - 長安
    makeOfficer(253, 1, 11, { loyalty: 100, isGovernor: true }), // 司馬懿鎮守長安
    makeOfficer(391, 1, 11, { loyalty: 90 }), // 張郃
    // 曹叡 - 許昌
    makeOfficer(39, 1, 14, { isGovernor: true, loyalty: 95 }), // 陳群
    // 曹叡 - 鄴
    makeOfficer(339, 1, 8, { isGovernor: true, loyalty: 90 }), // 徐晃
    // 曹叡 - 宛
    makeOfficer(398, 1, 30, { isGovernor: true, loyalty: 90 }), // 張遼
    // 曹叡 - 新野
    makeOfficer(102, 1, 31, { isGovernor: true, loyalty: 90 }), // 郭淮
    // 曹叡 - 襄陽
    makeOfficer(349, 1, 32, { isGovernor: true, loyalty: 92 }), // 荀攸
    // 曹叡 - 天水
    makeOfficer(334, 1, 10, { isGovernor: true, loyalty: 95 }), // 夏侯淵
    // 曹叡 - 陳留
    makeOfficer(326, 1, 15, { isGovernor: true, loyalty: 95 }), // 夏侯惇
    // 劉禪 - 成都
    makeOfficer(171, 2, 25, { isGovernor: true, loyalty: 100 }), // 劉禪
    makeOfficer(421, 2, 25, { loyalty: 100 }), // 趙雲 (已老)
    // 劉禪 - 梓潼
    makeOfficer(355, 2, 24, { isGovernor: true, loyalty: 85 }), // 嚴顏
    // 劉禪 - 漢中
    makeOfficer(443, 2, 22, { loyalty: 100, isGovernor: true }), // 諸葛亮在漢中
    makeOfficer(308, 2, 22, { loyalty: 80 }), // 魏延
    // 劉禪 - 永安
    makeOfficer(128, 2, 27, { isGovernor: true, loyalty: 90 }), // 黃忠
    // 劉禪 - 江州
    makeOfficer(402, 2, 26, { isGovernor: true, loyalty: 85 }), // 張任
    // 孫權 - 建業
    makeOfficer(273, 3, 38, { isGovernor: true, loyalty: 100 }),
    // 孫權 - 廬江
    makeOfficer(196, 3, 39, { isGovernor: true, loyalty: 90 }), // 魯肅
    // 孫權 - 柴桑
    makeOfficer(194, 3, 35, { isGovernor: true, loyalty: 95 }), // 呂蒙
    // 孫權 - 江夏
    makeOfficer(125, 3, 34, { isGovernor: true, loyalty: 88 }), // 黃蓋
    // 孫權 - 江陵
    makeOfficer(199, 3, 33, { isGovernor: true, loyalty: 100 }), // 陸遜守江陵
    // 孫權 - 武陵
    makeOfficer(310, 3, 36, { isGovernor: true, loyalty: 85 }), // 文聘
    // 孫權 - 吳
    makeOfficer(44, 3, 40, { isGovernor: true, loyalty: 90 }), // 程普
    // 孫權 - 會稽
    makeOfficer(108, 3, 41, { isGovernor: true, loyalty: 88 }), // 韓當
    // 孫權 - 長沙
    makeOfficer(430, 3, 37, { isGovernor: true, loyalty: 95 }), // 周瑜 (historically dead by 210, but for game balance)
  ]
};

export const scenarios: Scenario[] = [scenario189, scenario194, scenario200, scenario208, scenario221, scenario235];