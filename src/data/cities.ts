import type { City } from '../types';

/**
 * 三國志IV 主要城市資料 (43城)
 * x, y 為地圖上的相對座標 (0-100 百分比)
 * adjacentCityIds 表示鄰接可移動的城市
 */
export const baseCities: Omit<City, 'factionId' | 'population' | 'gold' | 'food' | 'commerce' | 'agriculture' | 'defense' | 'troops' | 'floodControl' | 'technology' | 'peopleLoyalty' | 'morale' | 'training' | 'crossbows' | 'warHorses' | 'batteringRams' | 'catapults' | 'taxRate'>[] = [
  // ===== 北方 =====
  { id: 1,  name: '襄平', x: 85, y: 8,  adjacentCityIds: [2] },
  { id: 2,  name: '北平', x: 75, y: 12, adjacentCityIds: [1, 3, 5] },
  { id: 3,  name: '薊',   x: 68, y: 10, adjacentCityIds: [2, 4, 5] },
  { id: 4,  name: '南皮', x: 68, y: 18, adjacentCityIds: [3, 5, 7, 8] },
  { id: 5,  name: '晉陽', x: 58, y: 15, adjacentCityIds: [2, 3, 4, 6] },
  { id: 6,  name: '上黨', x: 58, y: 22, adjacentCityIds: [5, 7, 10, 11] },

  // ===== 中原 =====
  { id: 7,  name: '鄴',   x: 65, y: 24, adjacentCityIds: [4, 6, 8, 9] },
  { id: 8,  name: '平原', x: 72, y: 24, adjacentCityIds: [4, 7, 9, 14] },
  { id: 9,  name: '濮陽', x: 68, y: 30, adjacentCityIds: [7, 8, 10, 13, 14] },
  { id: 10, name: '洛陽', x: 56, y: 30, adjacentCityIds: [6, 9, 11, 12, 13] },
  { id: 11, name: '長安', x: 45, y: 28, adjacentCityIds: [6, 10, 17, 18] },
  { id: 12, name: '宛',   x: 56, y: 38, adjacentCityIds: [10, 13, 19, 20] },
  { id: 13, name: '陳留', x: 64, y: 34, adjacentCityIds: [9, 10, 12, 14, 15] },
  { id: 14, name: '北海', x: 78, y: 28, adjacentCityIds: [8, 9, 13, 15] },

  // ===== 東方 =====
  { id: 15, name: '下邳', x: 76, y: 36, adjacentCityIds: [13, 14, 16, 21] },
  { id: 16, name: '壽春', x: 74, y: 42, adjacentCityIds: [15, 21, 22] },

  // ===== 西北 =====
  { id: 17, name: '天水', x: 35, y: 25, adjacentCityIds: [11, 18, 27] },
  { id: 18, name: '漢中', x: 40, y: 35, adjacentCityIds: [11, 17, 19, 27, 28] },

  // ===== 荊州 =====
  { id: 19, name: '新野', x: 55, y: 42, adjacentCityIds: [12, 18, 20, 23] },
  { id: 20, name: '襄陽', x: 55, y: 47, adjacentCityIds: [12, 19, 23, 24] },
  { id: 21, name: '廬江', x: 74, y: 48, adjacentCityIds: [15, 16, 22, 25] },
  { id: 22, name: '建業', x: 80, y: 48, adjacentCityIds: [16, 21, 25, 26] },

  // ===== 長江中游 =====
  { id: 23, name: '江陵', x: 52, y: 52, adjacentCityIds: [19, 20, 24, 29, 30] },
  { id: 24, name: '江夏', x: 60, y: 50, adjacentCityIds: [20, 23, 25, 30] },
  { id: 25, name: '柴桑', x: 70, y: 52, adjacentCityIds: [21, 22, 24, 26, 31] },
  { id: 26, name: '會稽', x: 85, y: 55, adjacentCityIds: [22, 25] },

  // ===== 西川 =====
  { id: 27, name: '梓潼', x: 32, y: 40, adjacentCityIds: [17, 18, 28, 33] },
  { id: 28, name: '成都', x: 30, y: 48, adjacentCityIds: [18, 27, 29, 33, 34] },
  { id: 29, name: '永安', x: 42, y: 52, adjacentCityIds: [23, 28, 30] },

  // ===== 荊南 =====
  { id: 30, name: '長沙', x: 60, y: 58, adjacentCityIds: [23, 24, 29, 31, 32] },
  { id: 31, name: '廬陵', x: 72, y: 60, adjacentCityIds: [25, 30, 32, 37] },
  { id: 32, name: '武陵', x: 50, y: 60, adjacentCityIds: [30, 31, 35] },

  // ===== 西南 =====
  { id: 33, name: '漢嘉', x: 25, y: 52, adjacentCityIds: [27, 28, 34] },
  { id: 34, name: '建寧', x: 25, y: 62, adjacentCityIds: [28, 33, 35, 36] },
  { id: 35, name: '零陵', x: 52, y: 66, adjacentCityIds: [32, 34, 36] },
  { id: 36, name: '雲南', x: 22, y: 72, adjacentCityIds: [34, 35] },

  // ===== 嶺南 =====
  { id: 37, name: '南海', x: 72, y: 72, adjacentCityIds: [31, 38, 39] },
  { id: 38, name: '桂陽', x: 60, y: 72, adjacentCityIds: [37, 39] },
  { id: 39, name: '交趾', x: 40, y: 78, adjacentCityIds: [37, 38] },

  // ===== 補充要城 =====
  { id: 40, name: '西涼', x: 25, y: 15, adjacentCityIds: [17] },
  { id: 41, name: '安定', x: 38, y: 20, adjacentCityIds: [11, 17, 40] },
  { id: 42, name: '許昌', x: 62, y: 36, adjacentCityIds: [12, 13, 15, 19] },
  { id: 43, name: '小沛', x: 72, y: 34, adjacentCityIds: [14, 15, 42] },
];
