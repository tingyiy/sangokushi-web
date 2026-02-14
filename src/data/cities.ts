import type { City } from '../types';

/**
 * 三國志IV 城市資料 (43城) - RTK4 Canonical IDs
 * x, y 為地圖上的相對座標 (0-100 百分比)
 * adjacentCityIds 表示鄰接可移動的城市 (bidirectional connections)
 * 
 * Source: data/cities.json - canonical RTK4 city data
 * IDs 1-43, all used. Gap at 324 is for officers, not cities.
 *
 * Adjacency follows RTK IV rules — only directly adjacent cities are connected.
 * No "skip" connections that bypass intermediate cities.
 */
export const baseCities: Omit<City, 'factionId' | 'population' | 'gold' | 'food' | 'commerce' | 'agriculture' | 'defense' | 'troops' | 'floodControl' | 'technology' | 'peopleLoyalty' | 'morale' | 'training' | 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults' | 'taxRate'>[] = [
  // ===== 東北 (Northeast — Liaodong & Hebei) =====
  { id: 1,  name: '襄平', x: 85, y: 5,  adjacentCityIds: [2] },
  { id: 2,  name: '北平', x: 76, y: 10, adjacentCityIds: [1, 3, 5] },
  { id: 3,  name: '薊',   x: 68, y: 8,  adjacentCityIds: [2, 4] },

  // ===== 西北 (Northwest — Hexi Corridor & Gansu) =====
  { id: 4,  name: '晉陽', x: 55, y: 14, adjacentCityIds: [3, 5, 8, 12] },
  { id: 9,  name: '西涼', x: 15, y: 10, adjacentCityIds: [10] },
  { id: 10, name: '天水', x: 32, y: 24, adjacentCityIds: [9, 11, 21] },

  // ===== 北方 (North — Hebei & Shandong) =====
  { id: 5,  name: '南皮', x: 72, y: 18, adjacentCityIds: [2, 4, 6, 8] },
  { id: 6,  name: '平原', x: 72, y: 24, adjacentCityIds: [5, 7, 8, 16] },
  { id: 7,  name: '北海', x: 78, y: 28, adjacentCityIds: [6, 18] },
  { id: 8,  name: '鄴',   x: 63, y: 22, adjacentCityIds: [4, 5, 6, 12, 16] },

  // ===== 中原核心 (Central Plains) =====
  { id: 11, name: '長安', x: 43, y: 28, adjacentCityIds: [10, 13, 22] },
  { id: 12, name: '洛陽', x: 55, y: 29, adjacentCityIds: [4, 8, 13, 14, 30] },
  { id: 13, name: '弘農', x: 49, y: 28, adjacentCityIds: [11, 12] },
  { id: 14, name: '許昌', x: 62, y: 34, adjacentCityIds: [12, 15, 17, 30] },
  { id: 15, name: '陳留', x: 66, y: 30, adjacentCityIds: [14, 16, 17] },
  { id: 16, name: '濮陽', x: 70, y: 27, adjacentCityIds: [6, 8, 15] },
  { id: 17, name: '譙',   x: 70, y: 36, adjacentCityIds: [14, 15, 18, 19] },
  { id: 18, name: '下邳', x: 76, y: 34, adjacentCityIds: [7, 17, 19] },
  { id: 19, name: '徐州', x: 78, y: 38, adjacentCityIds: [17, 18, 20, 38] },

  // ===== 東方 (East — Huainan) =====
  { id: 20, name: '壽春', x: 74, y: 42, adjacentCityIds: [19, 38, 39] },

  // ===== 益州 (Yi Province — Sichuan & Southwest) =====
  { id: 21, name: '武都', x: 30, y: 28, adjacentCityIds: [10, 22] },
  { id: 22, name: '漢中', x: 38, y: 34, adjacentCityIds: [11, 21, 23, 24] },
  { id: 23, name: '上庸', x: 46, y: 38, adjacentCityIds: [22, 31] },
  { id: 24, name: '梓潼', x: 30, y: 40, adjacentCityIds: [22, 25] },
  { id: 25, name: '成都', x: 28, y: 48, adjacentCityIds: [24, 26, 28] },
  { id: 26, name: '江州', x: 36, y: 52, adjacentCityIds: [25, 27, 28] },
  { id: 27, name: '永安', x: 42, y: 50, adjacentCityIds: [26, 33] },
  { id: 28, name: '建寧', x: 22, y: 62, adjacentCityIds: [25, 26, 29] },
  { id: 29, name: '雲南', x: 18, y: 72, adjacentCityIds: [28] },

  // ===== 荊州 (Jing Province) =====
  { id: 30, name: '宛',   x: 55, y: 38, adjacentCityIds: [12, 14, 31] },
  { id: 31, name: '新野', x: 53, y: 43, adjacentCityIds: [23, 30, 32] },
  { id: 32, name: '襄陽', x: 52, y: 48, adjacentCityIds: [31, 33, 34] },
  { id: 33, name: '江陵', x: 48, y: 53, adjacentCityIds: [27, 32, 34, 36] },
  { id: 34, name: '江夏', x: 60, y: 50, adjacentCityIds: [32, 33, 35] },

  // ===== 長江下游 (Lower Yangtze) =====
  { id: 35, name: '柴桑', x: 68, y: 52, adjacentCityIds: [34, 39] },
  { id: 36, name: '武陵', x: 46, y: 60, adjacentCityIds: [33, 37] },
  { id: 37, name: '長沙', x: 56, y: 60, adjacentCityIds: [36, 42] },
  { id: 38, name: '建業', x: 80, y: 46, adjacentCityIds: [19, 20, 39, 40] },
  { id: 39, name: '廬江', x: 74, y: 48, adjacentCityIds: [20, 35, 38] },
  { id: 40, name: '吳',   x: 84, y: 50, adjacentCityIds: [38, 41] },
  { id: 41, name: '會稽', x: 86, y: 56, adjacentCityIds: [40] },

  // ===== 荊南 (Southern Jing) =====
  { id: 42, name: '零陵', x: 48, y: 68, adjacentCityIds: [37, 43] },
  { id: 43, name: '桂陽', x: 58, y: 72, adjacentCityIds: [42] },
];

/**
 * 城市基礎數值 (RTK IV style, historically-informed)
 *
 * Population (萬人 → raw): Based on late-Han census records + wartime depopulation.
 *   - 黃河流域: devastated by war from 184 AD onward ("十室九空")
 *   - 益州: relatively sheltered, moderate population
 *   - 江南: growing from northern refugee influx
 *   - 邊疆: always sparse
 *   Total ~10.7M across 43 cities, consistent with 東漢末 estimates (~16-20M total,
 *   with rural population not represented by city figures).
 *
 * Commerce: Trade route importance (Silk Road cities, river ports, capitals high)
 * Agriculture: Farmland quality (Central Plains, Sichuan basin high; mountains low)
 * FloodControl: River proximity (長江/黃河 cities high; inland/mountain low)
 *
 * Values follow RTK IV's 0-999 scale for commerce/agriculture.
 * Population reference: zh.wikipedia.org 中國人口史 #三國
 *   魏: 443萬, 蜀: 94萬, 吳: 240萬 (263 AD census)
 *   189 AD total estimated ~1600-2000萬 before full collapse.
 */
export const cityBaseStats: Record<number, {
  population: number;
  commerce: number;
  agriculture: number;
  floodControl: number;
  /** 防守係數 — terrain/fortification multiplier for defenders.
   *  1.00 = flat plains, 1.15 = mountain, 1.25 = pass, 1.35 = natural fortress */
  defenseCoefficient: number;
}> = {
  // ===== 東北 (Northeast — 遼東 & 幽州) =====
  //  1 襄平: Remote Liaodong outpost, Gongsun family domain
  1:  { population:  80000, commerce: 120, agriculture: 200, floodControl: 25, defenseCoefficient: 1.05 },
  //  2 北平: Frontier garrison town (幽州), horse-trading post
  2:  { population: 200000, commerce: 250, agriculture: 300, floodControl: 30, defenseCoefficient: 1.10 },
  //  3 薊: Old Yan capital, northern trade hub
  3:  { population: 180000, commerce: 320, agriculture: 350, floodControl: 35, defenseCoefficient: 1.05 },

  // ===== 西北 (Northwest — 涼州 & 并州) =====
  //  4 晉陽: Taiyuan basin, important northern stronghold (并州治所)
  4:  { population: 240000, commerce: 350, agriculture: 400, floodControl: 35, defenseCoefficient: 1.15 },
  //  9 西涼: Far west Silk Road outpost, Qiang/Di frontier (≈武威)
  9:  { population: 100000, commerce: 200, agriculture: 150, floodControl: 15, defenseCoefficient: 1.10 },
  // 10 天水: Qinling gateway, Silk Road branch
  10: { population: 160000, commerce: 280, agriculture: 300, floodControl: 25, defenseCoefficient: 1.20 },

  // ===== 北方 (North — 冀州 & 青州) =====
  //  5 南皮: Bohai commandery seat — flat plains
  5:  { population: 180000, commerce: 280, agriculture: 420, floodControl: 50, defenseCoefficient: 0.90 },
  //  6 平原: Flat farmland of the Yellow River delta
  6:  { population: 200000, commerce: 250, agriculture: 550, floodControl: 60, defenseCoefficient: 0.90 },
  //  7 北海: Shandong peninsula, Kong Rong's scholarly seat
  7:  { population: 160000, commerce: 280, agriculture: 420, floodControl: 45, defenseCoefficient: 0.90 },
  //  8 鄴: Ji Province capital (冀州治所), Yuan Shao's base, major city
  8:  { population: 550000, commerce: 550, agriculture: 600, floodControl: 55, defenseCoefficient: 1.00 },

  // ===== 中原核心 (Central Plains — 司隸 & 豫兗徐) =====
  // 11 長安: Western Han capital, 關中 surrounded by passes
  11: { population: 600000, commerce: 650, agriculture: 550, floodControl: 40, defenseCoefficient: 1.20 },
  // 12 洛陽: Eastern Han capital, center of civilization — some natural barriers
  12: { population: 800000, commerce: 750, agriculture: 550, floodControl: 55, defenseCoefficient: 1.05 },
  // 13 弘農: Pass city between 長安 and 洛陽 (函谷關 area)
  13: { population: 250000, commerce: 250, agriculture: 380, floodControl: 30, defenseCoefficient: 1.25 },
  // 14 許昌: Yingchuan heartland, flat plains
  14: { population: 500000, commerce: 580, agriculture: 580, floodControl: 50, defenseCoefficient: 1.00 },
  // 15 陳留: Central Plains hub, flat
  15: { population: 360000, commerce: 450, agriculture: 550, floodControl: 50, defenseCoefficient: 0.95 },
  // 16 濮陽: Yellow River city, flat, flood-prone
  16: { population: 300000, commerce: 350, agriculture: 520, floodControl: 65, defenseCoefficient: 0.95 },
  // 17 譙: Cao Cao's hometown (沛國), flat
  17: { population: 260000, commerce: 300, agriculture: 460, floodControl: 45, defenseCoefficient: 0.95 },
  // 18 下邳: Xu Province city, river junction
  18: { population: 280000, commerce: 350, agriculture: 470, floodControl: 55, defenseCoefficient: 1.00 },
  // 19 徐州: Xu Province capital, open terrain
  19: { population: 250000, commerce: 420, agriculture: 480, floodControl: 50, defenseCoefficient: 0.95 },

  // ===== 東方 (Huainan — 淮南) =====
  // 20 壽春: Huainan capital, river barrier
  20: { population: 330000, commerce: 480, agriculture: 520, floodControl: 60, defenseCoefficient: 1.05 },

  // ===== 益州 (Sichuan & Southwest) =====
  // 21 武都: Remote mountain pass, Di/Qiang frontier
  21: { population:  90000, commerce: 100, agriculture: 200, floodControl: 20, defenseCoefficient: 1.20 },
  // 22 漢中: Han River valley, mountain-ringed basin
  22: { population: 220000, commerce: 320, agriculture: 480, floodControl: 50, defenseCoefficient: 1.30 },
  // 23 上庸: Remote mountain commandery
  23: { population: 100000, commerce: 120, agriculture: 260, floodControl: 25, defenseCoefficient: 1.15 },
  // 24 梓潼: Northern Sichuan gateway (劍閣 area)
  24: { population: 180000, commerce: 220, agriculture: 380, floodControl: 30, defenseCoefficient: 1.30 },
  // 25 成都: Yi Province capital, 天府之國 — basin fortress
  25: { population: 450000, commerce: 580, agriculture: 680, floodControl: 60, defenseCoefficient: 1.35 },
  // 26 江州 (巴郡): Ba region, Yangtze river trade
  26: { population: 200000, commerce: 250, agriculture: 400, floodControl: 45, defenseCoefficient: 1.10 },
  // 27 永安 (白帝城): Yangtze gorge fortress — Three Gorges chokepoint
  27: { population:  80000, commerce: 100, agriculture: 220, floodControl: 35, defenseCoefficient: 1.30 },
  // 28 建寧: Nanzhong region, mountain terrain
  28: { population:  80000, commerce: 100, agriculture: 250, floodControl: 20, defenseCoefficient: 1.15 },
  // 29 雲南: Far south frontier, tribal mountain lands
  29: { population:  70000, commerce:  80, agriculture: 200, floodControl: 15, defenseCoefficient: 1.15 },

  // ===== 荊州 (Jing Province) =====
  // 30 宛 (南陽): 南陽盆地, some natural barriers
  30: { population: 300000, commerce: 450, agriculture: 540, floodControl: 45, defenseCoefficient: 1.05 },
  // 31 新野: Small town, flat land between 宛 and 襄陽
  31: { population: 140000, commerce: 180, agriculture: 380, floodControl: 35, defenseCoefficient: 0.95 },
  // 32 襄陽: Jing Province capital, Han River fortress — historically very defensible
  32: { population: 350000, commerce: 500, agriculture: 560, floodControl: 55, defenseCoefficient: 1.20 },
  // 33 江陵: Yangtze port, strategic Jingzhou hub — river defense
  33: { population: 320000, commerce: 460, agriculture: 520, floodControl: 65, defenseCoefficient: 1.15 },
  // 34 江夏: Han-Yangtze river junction
  34: { population: 260000, commerce: 350, agriculture: 440, floodControl: 60, defenseCoefficient: 1.05 },

  // ===== 長江下游 (Lower Yangtze — 揚州) =====
  // 35 柴桑: Yangtze port — river barrier
  35: { population: 210000, commerce: 320, agriculture: 420, floodControl: 65, defenseCoefficient: 1.10 },
  // 36 武陵: Hunan interior, hilly terrain
  36: { population: 180000, commerce: 180, agriculture: 340, floodControl: 40, defenseCoefficient: 1.05 },
  // 37 長沙: Southern Jing hub
  37: { population: 280000, commerce: 380, agriculture: 460, floodControl: 50, defenseCoefficient: 1.00 },
  // 38 建業 (秣陵): Yangtze delta, river protection
  38: { population: 400000, commerce: 550, agriculture: 480, floodControl: 60, defenseCoefficient: 1.10 },
  // 39 廬江: River commandery
  39: { population: 300000, commerce: 350, agriculture: 440, floodControl: 55, defenseCoefficient: 1.05 },
  // 40 吳: Wu commandery (蘇州), flat water country
  40: { population: 340000, commerce: 480, agriculture: 480, floodControl: 55, defenseCoefficient: 1.00 },
  // 41 會稽: Southeastern coast
  41: { population: 260000, commerce: 320, agriculture: 400, floodControl: 45, defenseCoefficient: 1.00 },

  // ===== 荊南 (Southern Jing) =====
  // 42 零陵: Southern Hunan, hilly
  42: { population: 200000, commerce: 180, agriculture: 360, floodControl: 35, defenseCoefficient: 1.05 },
  // 43 桂陽: Southern Hunan frontier, mountainous
  43: { population: 190000, commerce: 150, agriculture: 320, floodControl: 30, defenseCoefficient: 1.10 },
};

/**
 * City ID mapping from old custom IDs to new RTK4 IDs
 * Used for migration reference
 */
export const cityIdMapping: Record<number, number> = {
  // Unchanged
  1: 1,   // 襄平
  2: 2,   // 北平
  3: 3,   // 薊
  11: 11, // 長安
  // Changed
  4: 5,   // 南皮
  5: 4,   // 晉陽
  7: 8,   // 鄴
  8: 6,   // 平原
  9: 16,  // 濮陽
  10: 12, // 洛陽
  12: 30, // 宛
  13: 15, // 陳留
  14: 7,  // 北海
  15: 18, // 下邳
  16: 20, // 壽春
  17: 10, // 天水
  18: 22, // 漢中
  19: 31, // 新野
  20: 32, // 襄陽
  21: 39, // 廬江
  22: 38, // 建業
  23: 33, // 江陵
  24: 34, // 江夏
  25: 35, // 柴桑
  26: 41, // 會稽
  27: 24, // 梓潼
  28: 25, // 成都
  29: 27, // 永安
  30: 37, // 長沙
  32: 36, // 武陵
  34: 28, // 建寧
  35: 42, // 零陵
  36: 29, // 雲南
  38: 43, // 桂陽
  40: 9,  // 西涼
  42: 14, // 許昌
  // Removed cities (no mapping)
  // 6: 上黨, 31: 廬陵, 33: 漢嘉, 37: 南海, 39: 交趾, 41: 安定, 43: 小沛
};

/**
 * Reverse mapping from new RTK4 IDs to old IDs
 */
export const reverseCityIdMapping: Record<number, number | undefined> = {
  1: 1, 2: 2, 3: 3, 4: 5, 5: 4, 6: 8, 7: 14, 8: 7, 9: 40, 10: 17,
  11: 11, 12: 10, 13: undefined, 14: 42, 15: 13, 16: 9, 17: undefined,
  18: 15, 19: undefined, 20: 16, 21: undefined, 22: 18, 23: undefined,
  24: 27, 25: 28, 26: undefined, 27: 29, 28: 34, 29: 36, 30: 12,
  31: 19, 32: 20, 33: 23, 34: 24, 35: 25, 36: 32, 37: 30, 38: 22,
  39: 21, 40: undefined, 41: 26, 42: 35, 43: 38,
};

/**
 * City population tier — determines visual representation on map and in city panel.
 *
 * 超級都市 (mega):   population >= 500,000  (洛陽, 長安, 鄴, 許昌)
 * 大都市   (large):  population 350,000–499,999  (成都, 建業, 襄陽, 陳留...)
 * 中型城市 (medium): population 200,000–349,999  (壽春, 江陵, 宛, 漢中...)
 * 邊境小城 (small):  population < 200,000  (西涼, 武都, 雲南, 永安...)
 */
export type CityTier = 'mega' | 'large' | 'medium' | 'small';

export function getCityTier(population: number): CityTier {
  if (population >= 500000) return 'mega';
  if (population >= 350000) return 'large';
  if (population >= 200000) return 'medium';
  return 'small';
}
