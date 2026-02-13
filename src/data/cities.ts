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
