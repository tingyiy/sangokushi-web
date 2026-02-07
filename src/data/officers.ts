import type { Officer } from '../types';

/**
 * 三國志IV 武將資料 — 精選主要角色
 * 統率/武力/智力/政治/魅力 (各 1-100)
 * Phase 1.1: Updated with RTK IV 22 skill system
 *
 * factionId 和 cityId 由劇本決定，此處提供基礎能力值
 */
type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor'>;

export const baseOfficers: BaseOfficer[] = [
  // ===== 蜀漢 =====
  // 劉備: 高魅力領袖，外交人才
  { id: 1,   name: '劉備',   leadership: 78, war: 72, intelligence: 75, politics: 80, charisma: 99, skills: ['外交', '人才', '步兵'] },
  // 關羽: 武聖，擅長統帥和戰鬥
  { id: 2,   name: '關羽',   leadership: 95, war: 97, intelligence: 75, politics: 62, charisma: 93, skills: ['騎兵', '步兵', '罵聲'] },
  // 張飛: 萬人敵，勇猛善戰
  { id: 3,   name: '張飛',   leadership: 85, war: 98, intelligence: 30, politics: 22, charisma: 60, skills: ['騎兵', '步兵', '罵聲'] },
  // 諸葛亮: 臥龍，全才軍師
  { id: 4,   name: '諸葛亮', leadership: 95, war: 38, intelligence: 100, politics: 95, charisma: 92, skills: ['情報', '人才', '火計', '天變', '風變', '混亂', '連環', '虛報', '步兵'] },
  // 趙雲: 常勝將軍
  { id: 5,   name: '趙雲',   leadership: 91, war: 96, intelligence: 74, politics: 63, charisma: 82, skills: ['騎兵', '步兵', '情報'] },
  // 馬超: 錦馬超，西涼鐵騎
  { id: 6,   name: '馬超',   leadership: 88, war: 95, intelligence: 46, politics: 30, charisma: 78, skills: ['騎兵', '罵聲'] },
  // 黃忠: 老當益壯，神射手
  { id: 7,   name: '黃忠',   leadership: 83, war: 92, intelligence: 52, politics: 40, charisma: 70, skills: ['弓兵', '步兵'] },
  // 魏延: 勇猛善戰
  { id: 8,   name: '魏延',   leadership: 85, war: 90, intelligence: 55, politics: 38, charisma: 48, skills: ['步兵', '騎兵'] },
  // 龐統: 鳳雛，謀士
  { id: 9,   name: '龐統',   leadership: 72, war: 38, intelligence: 97, politics: 85, charisma: 75, skills: ['情報', '火計', '連環'] },
  // 法正: 謀士
  { id: 10,  name: '法正',   leadership: 62, war: 42, intelligence: 92, politics: 88, charisma: 65, skills: ['情報', '做敵'] },
  // 姜維: 麒麟兒，文武全才
  { id: 11,  name: '姜維',   leadership: 90, war: 88, intelligence: 88, politics: 68, charisma: 75, skills: ['騎兵', '情報', '火計', '步兵'] },
  // 關平: 關羽長子
  { id: 12,  name: '關平',   leadership: 70, war: 78, intelligence: 60, politics: 50, charisma: 68, skills: ['步兵', '騎兵'] },
  // 張苞: 張飛長子
  { id: 13,  name: '張苞',   leadership: 68, war: 80, intelligence: 42, politics: 35, charisma: 55, skills: ['騎兵', '步兵'] },
  // 關興: 關羽次子
  { id: 14,  name: '關興',   leadership: 72, war: 82, intelligence: 55, politics: 48, charisma: 65, skills: ['騎兵', '步兵'] },

  // ===== 曹魏 =====
  // 曹操: 梟雄，全才
  { id: 20,  name: '曹操',   leadership: 96, war: 72, intelligence: 92, politics: 94, charisma: 96, skills: ['騎兵', '情報', '人才', '做敵', '流言', '虛報'] },
  // 夏侯惇: 獨眼將軍
  { id: 21,  name: '夏侯惇', leadership: 82, war: 88, intelligence: 48, politics: 52, charisma: 72, skills: ['騎兵', '步兵'] },
  // 夏侯淵: 神速將軍
  { id: 22,  name: '夏侯淵', leadership: 85, war: 86, intelligence: 55, politics: 48, charisma: 65, skills: ['騎兵', '弓兵'] },
  // 張遼: 五子良將之首
  { id: 23,  name: '張遼',   leadership: 92, war: 90, intelligence: 72, politics: 58, charisma: 78, skills: ['騎兵', '步兵', '罵聲'] },
  // 徐晃: 五子良將
  { id: 24,  name: '徐晃',   leadership: 87, war: 88, intelligence: 68, politics: 55, charisma: 70, skills: ['步兵'] },
  // 張郃: 五子良將
  { id: 25,  name: '張郃',   leadership: 88, war: 85, intelligence: 70, politics: 52, charisma: 65, skills: ['步兵', '騎兵'] },
  // 許褚: 虎痴
  { id: 26,  name: '許褚',   leadership: 72, war: 95, intelligence: 28, politics: 18, charisma: 52, skills: ['步兵'] },
  // 典韋: 古之惡來
  { id: 27,  name: '典韋',   leadership: 70, war: 97, intelligence: 22, politics: 15, charisma: 55, skills: ['步兵'] },
  // 荀彧: 王佐之才
  { id: 28,  name: '荀彧',   leadership: 65, war: 30, intelligence: 95, politics: 98, charisma: 88, skills: ['情報', '人才', '外交'] },
  // 荀攸: 謀主
  { id: 29,  name: '荀攸',   leadership: 68, war: 35, intelligence: 93, politics: 88, charisma: 72, skills: ['情報', '做敵', '虛報'] },
  // 郭嘉: 鬼才
  { id: 30,  name: '郭嘉',   leadership: 62, war: 28, intelligence: 97, politics: 82, charisma: 78, skills: ['情報', '流言'] },
  // 賈詡: 毒士
  { id: 31,  name: '賈詡',   leadership: 60, war: 32, intelligence: 96, politics: 90, charisma: 55, skills: ['情報', '做敵', '流言', '虛報'] },
  // 司馬懿: 冢虎
  { id: 32,  name: '司馬懿', leadership: 95, war: 52, intelligence: 98, politics: 92, charisma: 78, skills: ['情報', '人才', '火計', '虛報', '步兵'] },
  // 曹仁: 大將軍
  { id: 33,  name: '曹仁',   leadership: 88, war: 82, intelligence: 65, politics: 62, charisma: 68, skills: ['騎兵', '步兵', '修復'] },
  // 曹丕: 魏文帝
  { id: 34,  name: '曹丕',   leadership: 72, war: 58, intelligence: 78, politics: 82, charisma: 70, skills: ['步兵', '情報'] },
  // 于禁: 五子良將
  { id: 35,  name: '于禁',   leadership: 80, war: 78, intelligence: 68, politics: 58, charisma: 55, skills: ['步兵', '修復'] },
  // 樂進: 五子良將
  { id: 36,  name: '樂進',   leadership: 75, war: 82, intelligence: 52, politics: 45, charisma: 55, skills: ['步兵'] },

  // ===== 東吳 =====
  // 孫堅: 江東猛虎
  { id: 50,  name: '孫堅',   leadership: 90, war: 92, intelligence: 68, politics: 72, charisma: 90, skills: ['步兵', '騎兵', '海戰'] },
  // 孫策: 小霸王
  { id: 51,  name: '孫策',   leadership: 88, war: 92, intelligence: 70, politics: 68, charisma: 95, skills: ['騎兵', '步兵', '海戰'] },
  // 孫權: 吳大帝
  { id: 52,  name: '孫權',   leadership: 80, war: 62, intelligence: 82, politics: 88, charisma: 90, skills: ['海戰', '外交', '人才'] },
  // 周瑜: 美周郎
  { id: 53,  name: '周瑜',   leadership: 93, war: 70, intelligence: 96, politics: 80, charisma: 90, skills: ['海戰', '情報', '火計', '風變', '同討'] },
  // 陸遜: 書生拜大將
  { id: 54,  name: '陸遜',   leadership: 92, war: 62, intelligence: 95, politics: 85, charisma: 82, skills: ['海戰', '情報', '火計', '連環'] },
  // 呂蒙: 吳下阿蒙
  { id: 55,  name: '呂蒙',   leadership: 88, war: 82, intelligence: 85, politics: 62, charisma: 72, skills: ['海戰', '步兵', '情報'] },
  // 甘寧: 錦帆賊
  { id: 56,  name: '甘寧',   leadership: 80, war: 90, intelligence: 52, politics: 38, charisma: 68, skills: ['海戰', '弓兵'] },
  // 太史慈: 神射手
  { id: 57,  name: '太史慈', leadership: 82, war: 90, intelligence: 62, politics: 48, charisma: 75, skills: ['弓兵', '騎兵'] },
  // 黃蓋: 苦肉計
  { id: 58,  name: '黃蓋',   leadership: 78, war: 80, intelligence: 62, politics: 55, charisma: 68, skills: ['海戰', '火計'] },
  // 魯肅: 老實人
  { id: 59,  name: '魯肅',   leadership: 68, war: 38, intelligence: 88, politics: 92, charisma: 85, skills: ['外交', '人才'] },
  // 張昭: 內政大臣
  { id: 60,  name: '張昭',   leadership: 45, war: 22, intelligence: 82, politics: 95, charisma: 78, skills: ['外交', '人才'] },
  // 程普: 江東老臣
  { id: 61,  name: '程普',   leadership: 78, war: 78, intelligence: 60, politics: 55, charisma: 65, skills: ['步兵', '海戰'] },
  // 韓當: 江東老臣
  { id: 62,  name: '韓當',   leadership: 72, war: 78, intelligence: 52, politics: 48, charisma: 58, skills: ['海戰', '弓兵'] },

  // ===== 群雄 =====
  // 呂布: 人中呂布
  { id: 70,  name: '呂布',   leadership: 88, war: 100, intelligence: 28, politics: 18, charisma: 40, skills: ['騎兵', '弓兵'] },
  // 董卓: 魔王
  { id: 71,  name: '董卓',   leadership: 80, war: 82, intelligence: 55, politics: 42, charisma: 20, skills: ['騎兵', '做敵'] },
  // 袁紹: 四世三公
  { id: 72,  name: '袁紹',   leadership: 78, war: 62, intelligence: 65, politics: 72, charisma: 82, skills: ['騎兵', '人才'] },
  // 袁術: 淮南王
  { id: 73,  name: '袁術',   leadership: 55, war: 52, intelligence: 48, politics: 58, charisma: 60, skills: [] },
  // 劉表: 荊州牧
  { id: 74,  name: '劉表',   leadership: 62, war: 42, intelligence: 68, politics: 78, charisma: 75, skills: ['外交'] },
  // 劉璋: 益州牧
  { id: 75,  name: '劉璋',   leadership: 45, war: 35, intelligence: 52, politics: 58, charisma: 60, skills: [] },
  // 馬騰: 西涼太守
  { id: 76,  name: '馬騰',   leadership: 82, war: 85, intelligence: 52, politics: 55, charisma: 78, skills: ['騎兵'] },
  // 公孫瓚: 白馬將軍
  { id: 77,  name: '公孫瓚', leadership: 78, war: 80, intelligence: 48, politics: 52, charisma: 68, skills: ['騎兵', '弓兵'] },
  // 陶謙: 徐州牧
  { id: 78,  name: '陶謙',   leadership: 55, war: 42, intelligence: 60, politics: 72, charisma: 70, skills: [] },
  // 張魯: 五斗米道
  { id: 79,  name: '張魯',   leadership: 58, war: 45, intelligence: 62, politics: 65, charisma: 72, skills: [] },
  // 孟獲: 南蠻王
  { id: 80,  name: '孟獲',   leadership: 72, war: 82, intelligence: 28, politics: 22, charisma: 68, skills: ['步兵'] },
  // 貂蟬: 絕世美女
  { id: 81,  name: '貂蟬',   leadership: 15, war: 18, intelligence: 72, politics: 60, charisma: 98, skills: ['做敵'] },
  // 張角: 大賢良師
  { id: 82,  name: '張角',   leadership: 80, war: 55, intelligence: 72, politics: 42, charisma: 95, skills: ['情報', '流言', '落雷'] },
  // 張寶: 地公將軍
  { id: 83,  name: '張寶',   leadership: 62, war: 58, intelligence: 55, politics: 32, charisma: 60, skills: ['流言'] },
  // 張梁: 人公將軍
  { id: 84,  name: '張梁',   leadership: 60, war: 62, intelligence: 45, politics: 28, charisma: 55, skills: [] },
  // 華雄: 猛將
  { id: 85,  name: '華雄',   leadership: 72, war: 88, intelligence: 35, politics: 22, charisma: 45, skills: ['步兵'] },
  // 顏良: 河北四庭柱
  { id: 86,  name: '顏良',   leadership: 75, war: 90, intelligence: 38, politics: 28, charisma: 48, skills: ['騎兵'] },
  // 文醜: 河北四庭柱
  { id: 87,  name: '文醜',   leadership: 72, war: 88, intelligence: 35, politics: 25, charisma: 45, skills: ['騎兵'] },
];
