import type { Treasure } from '../types';

/**
 * Treasure / Item System - Phase 1.4
 * 24 treasures from RTK IV
 */

export const treasures: Treasure[] = [
  // 書 (Books) - boost intelligence/politics
  { 
    id: 1, 
    name: '孟德新書', 
    type: 'book', 
    statBonuses: { intelligence: 5, politics: 5 }, 
    specialEffect: null 
  },
  { 
    id: 2, 
    name: '太平要術', 
    type: 'book', 
    statBonuses: { intelligence: 8 }, 
    specialEffect: '可使用落雷' 
  },
  { 
    id: 3, 
    name: '遁甲天書', 
    type: 'book', 
    statBonuses: { intelligence: 10 }, 
    specialEffect: '可使用天變/風變' 
  },
  { 
    id: 4, 
    name: '孫子兵法', 
    type: 'book', 
    statBonuses: { leadership: 8, intelligence: 5 }, 
    specialEffect: null 
  },
  
  // 劍 (Swords) - boost war
  { 
    id: 5, 
    name: '倚天劍', 
    type: 'sword', 
    statBonuses: { war: 8 }, 
    specialEffect: null 
  },
  { 
    id: 6, 
    name: '青釭劍', 
    type: 'sword', 
    statBonuses: { war: 5, leadership: 3 }, 
    specialEffect: null 
  },
  { 
    id: 7, 
    name: '七星寶刀', 
    type: 'sword', 
    statBonuses: { war: 6 }, 
    specialEffect: null 
  },
  { 
    id: 8, 
    name: '古錠刀', 
    type: 'sword', 
    statBonuses: { war: 7 }, 
    specialEffect: null 
  },
  
  // 武器 (Weapons) - boost war/leadership
  { 
    id: 9, 
    name: '方天畫戟', 
    type: 'weapon', 
    statBonuses: { war: 10 }, 
    specialEffect: null 
  },
  { 
    id: 10, 
    name: '青龍偃月刀', 
    type: 'weapon', 
    statBonuses: { war: 8, leadership: 3 }, 
    specialEffect: null 
  },
  { 
    id: 11, 
    name: '丈八蛇矛', 
    type: 'weapon', 
    statBonuses: { war: 7 }, 
    specialEffect: null 
  },
  { 
    id: 12, 
    name: '雙鐵戟', 
    type: 'weapon', 
    statBonuses: { war: 6 }, 
    specialEffect: null 
  },
  
  // 馬 (Horses) - boost leadership, movement in battle
  { 
    id: 13, 
    name: '赤兔馬', 
    type: 'horse', 
    statBonuses: { leadership: 5 }, 
    specialEffect: '移動力+2' 
  },
  { 
    id: 14, 
    name: '的盧', 
    type: 'horse', 
    statBonuses: { leadership: 3 }, 
    specialEffect: '逃跑成功率+30%' 
  },
  { 
    id: 15, 
    name: '爪黃飛電', 
    type: 'horse', 
    statBonuses: { leadership: 3 }, 
    specialEffect: '移動力+1' 
  },
  { 
    id: 16, 
    name: '絕影', 
    type: 'horse', 
    statBonuses: { leadership: 2 }, 
    specialEffect: '移動力+1' 
  },
  
  // 印 (Seals) - boost charisma/politics
  { 
    id: 17, 
    name: '玉璽', 
    type: 'seal', 
    statBonuses: { charisma: 10, politics: 5 }, 
    specialEffect: '全軍忠誠+5' 
  },
  { 
    id: 18, 
    name: '和氏璧', 
    type: 'seal', 
    statBonuses: { charisma: 5, politics: 3 }, 
    specialEffect: null 
  },
  
  // Additional items (to reach 24)
  { 
    id: 19, 
    name: '銅雀', 
    type: 'seal', 
    statBonuses: { politics: 5, charisma: 3 }, 
    specialEffect: null 
  },
  { 
    id: 20, 
    name: '六韜', 
    type: 'book', 
    statBonuses: { leadership: 5, intelligence: 3 }, 
    specialEffect: null 
  },
  { 
    id: 21, 
    name: '三略', 
    type: 'book', 
    statBonuses: { leadership: 5, intelligence: 3 }, 
    specialEffect: null 
  },
  { 
    id: 22, 
    name: '兵法二十四篇', 
    type: 'book', 
    statBonuses: { leadership: 10 }, 
    specialEffect: null 
  },
  { 
    id: 23, 
    name: '鐵脊蛇矛', 
    type: 'weapon', 
    statBonuses: { war: 5 }, 
    specialEffect: null 
  },
  { 
    id: 24, 
    name: '白馬', 
    type: 'horse', 
    statBonuses: { leadership: 2 }, 
    specialEffect: '移動力+1' 
  },
];

/** Get treasure by ID */
export function getTreasureById(id: number): Treasure | undefined {
  return treasures.find(t => t.id === id);
}

/** Get treasures by type */
export function getTreasuresByType(type: Treasure['type']): Treasure[] {
  return treasures.filter(t => t.type === type);
}

/** Get all treasure names for display */
export function getTreasureNames(): string[] {
  return treasures.map(t => t.name);
}
