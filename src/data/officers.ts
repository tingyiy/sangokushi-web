import { Officer } from '../types';

/**
 * 三國志IV 武將資料 — 精選主要角色
 * 統率/武力/智力/政治/魅力 (各 1-100)
 *
 * factionId 和 cityId 由劇本決定，此處提供基礎能力值
 */
type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor'>;

export const baseOfficers: BaseOfficer[] = [
  // ===== 蜀漢 =====
  { id: 1,   name: '劉備',   leadership: 78, war: 72, intelligence: 75, politics: 80, charisma: 99, skills: ['步兵'] },
  { id: 2,   name: '關羽',   leadership: 95, war: 97, intelligence: 75, politics: 62, charisma: 93, skills: ['騎兵', '步兵'] },
  { id: 3,   name: '張飛',   leadership: 85, war: 98, intelligence: 30, politics: 22, charisma: 60, skills: ['騎兵', '步兵'] },
  { id: 4,   name: '諸葛亮', leadership: 95, war: 38, intelligence: 100, politics: 95, charisma: 92, skills: ['計略', '步兵'] },
  { id: 5,   name: '趙雲',   leadership: 91, war: 96, intelligence: 74, politics: 63, charisma: 82, skills: ['騎兵', '步兵'] },
  { id: 6,   name: '馬超',   leadership: 88, war: 95, intelligence: 46, politics: 30, charisma: 78, skills: ['騎兵'] },
  { id: 7,   name: '黃忠',   leadership: 83, war: 92, intelligence: 52, politics: 40, charisma: 70, skills: ['弓兵', '步兵'] },
  { id: 8,   name: '魏延',   leadership: 85, war: 90, intelligence: 55, politics: 38, charisma: 48, skills: ['步兵', '騎兵'] },
  { id: 9,   name: '龐統',   leadership: 72, war: 38, intelligence: 97, politics: 85, charisma: 75, skills: ['計略'] },
  { id: 10,  name: '法正',   leadership: 62, war: 42, intelligence: 92, politics: 88, charisma: 65, skills: ['計略'] },
  { id: 11,  name: '姜維',   leadership: 90, war: 88, intelligence: 88, politics: 68, charisma: 75, skills: ['步兵', '計略'] },
  { id: 12,  name: '關平',   leadership: 70, war: 78, intelligence: 60, politics: 50, charisma: 68, skills: ['步兵'] },
  { id: 13,  name: '張苞',   leadership: 68, war: 80, intelligence: 42, politics: 35, charisma: 55, skills: ['騎兵'] },
  { id: 14,  name: '關興',   leadership: 72, war: 82, intelligence: 55, politics: 48, charisma: 65, skills: ['騎兵'] },

  // ===== 曹魏 =====
  { id: 20,  name: '曹操',   leadership: 96, war: 72, intelligence: 92, politics: 94, charisma: 96, skills: ['騎兵', '計略'] },
  { id: 21,  name: '夏侯惇', leadership: 82, war: 88, intelligence: 48, politics: 52, charisma: 72, skills: ['騎兵'] },
  { id: 22,  name: '夏侯淵', leadership: 85, war: 86, intelligence: 55, politics: 48, charisma: 65, skills: ['騎兵', '弓兵'] },
  { id: 23,  name: '張遼',   leadership: 92, war: 90, intelligence: 72, politics: 58, charisma: 78, skills: ['騎兵', '步兵'] },
  { id: 24,  name: '徐晃',   leadership: 87, war: 88, intelligence: 68, politics: 55, charisma: 70, skills: ['步兵'] },
  { id: 25,  name: '張郃',   leadership: 88, war: 85, intelligence: 70, politics: 52, charisma: 65, skills: ['步兵', '騎兵'] },
  { id: 26,  name: '許褚',   leadership: 72, war: 95, intelligence: 28, politics: 18, charisma: 52, skills: ['步兵'] },
  { id: 27,  name: '典韋',   leadership: 70, war: 97, intelligence: 22, politics: 15, charisma: 55, skills: ['步兵'] },
  { id: 28,  name: '荀彧',   leadership: 65, war: 30, intelligence: 95, politics: 98, charisma: 88, skills: ['計略'] },
  { id: 29,  name: '荀攸',   leadership: 68, war: 35, intelligence: 93, politics: 88, charisma: 72, skills: ['計略'] },
  { id: 30,  name: '郭嘉',   leadership: 62, war: 28, intelligence: 97, politics: 82, charisma: 78, skills: ['計略'] },
  { id: 31,  name: '賈詡',   leadership: 60, war: 32, intelligence: 96, politics: 90, charisma: 55, skills: ['計略'] },
  { id: 32,  name: '司馬懿', leadership: 95, war: 52, intelligence: 98, politics: 92, charisma: 78, skills: ['計略', '步兵'] },
  { id: 33,  name: '曹仁',   leadership: 88, war: 82, intelligence: 65, politics: 62, charisma: 68, skills: ['騎兵', '步兵'] },
  { id: 34,  name: '曹丕',   leadership: 72, war: 58, intelligence: 78, politics: 82, charisma: 70, skills: ['步兵'] },
  { id: 35,  name: '于禁',   leadership: 80, war: 78, intelligence: 68, politics: 58, charisma: 55, skills: ['步兵'] },
  { id: 36,  name: '樂進',   leadership: 75, war: 82, intelligence: 52, politics: 45, charisma: 55, skills: ['步兵'] },

  // ===== 東吳 =====
  { id: 50,  name: '孫堅',   leadership: 90, war: 92, intelligence: 68, politics: 72, charisma: 90, skills: ['步兵', '騎兵'] },
  { id: 51,  name: '孫策',   leadership: 88, war: 92, intelligence: 70, politics: 68, charisma: 95, skills: ['騎兵', '步兵'] },
  { id: 52,  name: '孫權',   leadership: 80, war: 62, intelligence: 82, politics: 88, charisma: 90, skills: ['水軍'] },
  { id: 53,  name: '周瑜',   leadership: 93, war: 70, intelligence: 96, politics: 80, charisma: 90, skills: ['水軍', '計略'] },
  { id: 54,  name: '陸遜',   leadership: 92, war: 62, intelligence: 95, politics: 85, charisma: 82, skills: ['計略', '水軍'] },
  { id: 55,  name: '呂蒙',   leadership: 88, war: 82, intelligence: 85, politics: 62, charisma: 72, skills: ['水軍', '步兵'] },
  { id: 56,  name: '甘寧',   leadership: 80, war: 90, intelligence: 52, politics: 38, charisma: 68, skills: ['水軍'] },
  { id: 57,  name: '太史慈', leadership: 82, war: 90, intelligence: 62, politics: 48, charisma: 75, skills: ['弓兵', '騎兵'] },
  { id: 58,  name: '黃蓋',   leadership: 78, war: 80, intelligence: 62, politics: 55, charisma: 68, skills: ['水軍'] },
  { id: 59,  name: '魯肅',   leadership: 68, war: 38, intelligence: 88, politics: 92, charisma: 85, skills: ['計略'] },
  { id: 60,  name: '張昭',   leadership: 45, war: 22, intelligence: 82, politics: 95, charisma: 78, skills: [] },
  { id: 61,  name: '程普',   leadership: 78, war: 78, intelligence: 60, politics: 55, charisma: 65, skills: ['步兵', '水軍'] },
  { id: 62,  name: '韓當',   leadership: 72, war: 78, intelligence: 52, politics: 48, charisma: 58, skills: ['水軍'] },

  // ===== 群雄 =====
  { id: 70,  name: '呂布',   leadership: 88, war: 100, intelligence: 28, politics: 18, charisma: 40, skills: ['騎兵'] },
  { id: 71,  name: '董卓',   leadership: 80, war: 82, intelligence: 55, politics: 42, charisma: 20, skills: ['騎兵'] },
  { id: 72,  name: '袁紹',   leadership: 78, war: 62, intelligence: 65, politics: 72, charisma: 82, skills: ['騎兵'] },
  { id: 73,  name: '袁術',   leadership: 55, war: 52, intelligence: 48, politics: 58, charisma: 60, skills: [] },
  { id: 74,  name: '劉表',   leadership: 62, war: 42, intelligence: 68, politics: 78, charisma: 75, skills: [] },
  { id: 75,  name: '劉璋',   leadership: 45, war: 35, intelligence: 52, politics: 58, charisma: 60, skills: [] },
  { id: 76,  name: '馬騰',   leadership: 82, war: 85, intelligence: 52, politics: 55, charisma: 78, skills: ['騎兵'] },
  { id: 77,  name: '公孫瓚', leadership: 78, war: 80, intelligence: 48, politics: 52, charisma: 68, skills: ['騎兵'] },
  { id: 78,  name: '陶謙',   leadership: 55, war: 42, intelligence: 60, politics: 72, charisma: 70, skills: [] },
  { id: 79,  name: '張魯',   leadership: 58, war: 45, intelligence: 62, politics: 65, charisma: 72, skills: [] },
  { id: 80,  name: '孟獲',   leadership: 72, war: 82, intelligence: 28, politics: 22, charisma: 68, skills: ['步兵'] },
  { id: 81,  name: '貂蟬',   leadership: 15, war: 18, intelligence: 72, politics: 60, charisma: 98, skills: [] },
  { id: 82,  name: '張角',   leadership: 80, war: 55, intelligence: 72, politics: 42, charisma: 95, skills: ['計略'] },
  { id: 83,  name: '張寶',   leadership: 62, war: 58, intelligence: 55, politics: 32, charisma: 60, skills: [] },
  { id: 84,  name: '張梁',   leadership: 60, war: 62, intelligence: 45, politics: 28, charisma: 55, skills: [] },
  { id: 85,  name: '華雄',   leadership: 72, war: 88, intelligence: 35, politics: 22, charisma: 45, skills: ['步兵'] },
  { id: 86,  name: '顏良',   leadership: 75, war: 90, intelligence: 38, politics: 28, charisma: 48, skills: ['騎兵'] },
  { id: 87,  name: '文醜',   leadership: 72, war: 88, intelligence: 35, politics: 25, charisma: 45, skills: ['騎兵'] },
];
