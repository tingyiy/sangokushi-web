import type { Officer } from '../types';

/**
 * 三國志IV 武將資料 — 精選主要角色
 * 統率/武力/智力/政治/魅力 (各 1-100)
 * Phase 1.3: Updated with birthYear, deathYear, portraitId
 *
 * factionId 和 cityId 由劇本決定，此處提供基礎能力值
 */
type BaseOfficer = Omit<Officer, 'factionId' | 'cityId' | 'stamina' | 'loyalty' | 'isGovernor' | 'treasureId' | 'rank' | 'relationships'>;

export const baseOfficers: BaseOfficer[] = [
  // ===== 蜀漢 =====
  // 劉備: 高魅力領袖，外交人才
  { id: 1, name: '劉備', portraitId: 1, birthYear: 161, deathYear: 223, leadership: 78, war: 72, intelligence: 75, politics: 80, charisma: 99, skills: ['外交', '人才', '步兵'] },
  // 關羽: 武聖，擅長統帥和戰鬥
  { id: 2, name: '關羽', portraitId: 2, birthYear: 160, deathYear: 219, leadership: 95, war: 97, intelligence: 75, politics: 62, charisma: 93, skills: ['騎兵', '步兵', '罵聲'] },
  // 張飛: 萬人敵，勇猛善戰
  { id: 3, name: '張飛', portraitId: 3, birthYear: 165, deathYear: 221, leadership: 85, war: 98, intelligence: 30, politics: 22, charisma: 60, skills: ['騎兵', '步兵', '罵聲'] },
  // 諸葛亮: 臥龍，全才軍師
  { id: 4, name: '諸葛亮', portraitId: 4, birthYear: 181, deathYear: 234, leadership: 95, war: 38, intelligence: 100, politics: 95, charisma: 92, skills: ['情報', '人才', '火計', '天變', '風變', '混亂', '連環', '虛報', '步兵'] },
  // 趙雲: 常勝將軍
  { id: 5, name: '趙雲', portraitId: 5, birthYear: 168, deathYear: 229, leadership: 91, war: 96, intelligence: 74, politics: 63, charisma: 82, skills: ['騎兵', '步兵', '情報'] },
  // 馬超: 錦馬超，西涼鐵騎
  { id: 6, name: '馬超', portraitId: 6, birthYear: 176, deathYear: 222, leadership: 88, war: 95, intelligence: 46, politics: 30, charisma: 78, skills: ['騎兵', '罵聲'] },
  // 黃忠: 老當益壯，神射手
  { id: 7, name: '黃忠', portraitId: 7, birthYear: 148, deathYear: 220, leadership: 83, war: 92, intelligence: 52, politics: 40, charisma: 70, skills: ['弓兵', '步兵'] },
  // 魏延: 勇猛善戰
  { id: 8, name: '魏延', portraitId: 8, birthYear: 174, deathYear: 234, leadership: 85, war: 90, intelligence: 55, politics: 38, charisma: 48, skills: ['步兵', '騎兵'] },
  // 龐統: 鳳雛，謀士
  { id: 9, name: '龐統', portraitId: 9, birthYear: 179, deathYear: 214, leadership: 72, war: 38, intelligence: 97, politics: 85, charisma: 75, skills: ['情報', '火計', '連環'] },
  // 法正: 謀士
  { id: 10, name: '法正', portraitId: 10, birthYear: 176, deathYear: 220, leadership: 62, war: 42, intelligence: 92, politics: 88, charisma: 65, skills: ['情報', '做敵'] },
  // 姜維: 麒麟兒，文武全才
  { id: 11, name: '姜維', portraitId: 11, birthYear: 202, deathYear: 264, leadership: 90, war: 88, intelligence: 88, politics: 68, charisma: 75, skills: ['騎兵', '情報', '火計', '步兵'] },
  // 關平: 關羽長子
  { id: 12, name: '關平', portraitId: 12, birthYear: 178, deathYear: 219, leadership: 70, war: 78, intelligence: 60, politics: 50, charisma: 68, skills: ['步兵', '騎兵'] },
  // 張苞: 張飛長子
  { id: 13, name: '張苞', portraitId: 13, birthYear: 185, deathYear: 229, leadership: 68, war: 80, intelligence: 42, politics: 35, charisma: 55, skills: ['騎兵', '步兵'] },
  // 關興: 關羽次子
  { id: 14, name: '關興', portraitId: 14, birthYear: 192, deathYear: 234, leadership: 72, war: 82, intelligence: 55, politics: 48, charisma: 65, skills: ['騎兵', '步兵'] },

  // ===== 曹魏 =====
  // 曹操: 梟雄，全才
  { id: 20, name: '曹操', portraitId: 20, birthYear: 155, deathYear: 220, leadership: 96, war: 72, intelligence: 92, politics: 94, charisma: 96, skills: ['騎兵', '情報', '人才', '做敵', '流言', '虛報'] },
  // 夏侯惇: 獨眼將軍
  { id: 21, name: '夏侯惇', portraitId: 21, birthYear: 157, deathYear: 220, leadership: 82, war: 88, intelligence: 48, politics: 52, charisma: 72, skills: ['騎兵', '步兵'] },
  // 夏侯淵: 神速將軍
  { id: 22, name: '夏侯淵', portraitId: 22, birthYear: 158, deathYear: 219, leadership: 85, war: 86, intelligence: 55, politics: 48, charisma: 65, skills: ['騎兵', '弓兵'] },
  // 張遼: 五子良將之首
  { id: 23, name: '張遼', portraitId: 23, birthYear: 169, deathYear: 222, leadership: 92, war: 90, intelligence: 72, politics: 58, charisma: 78, skills: ['騎兵', '步兵', '罵聲'] },
  // 徐晃: 五子良將
  { id: 24, name: '徐晃', portraitId: 24, birthYear: 169, deathYear: 227, leadership: 87, war: 88, intelligence: 68, politics: 55, charisma: 70, skills: ['步兵'] },
  // 張郃: 五子良將
  { id: 25, name: '張郃', portraitId: 25, birthYear: 167, deathYear: 231, leadership: 88, war: 85, intelligence: 70, politics: 52, charisma: 65, skills: ['步兵', '騎兵'] },
  // 許褚: 虎痴
  { id: 26, name: '許褚', portraitId: 26, birthYear: 169, deathYear: 226, leadership: 72, war: 95, intelligence: 28, politics: 18, charisma: 52, skills: ['步兵'] },
  // 典韋: 古之惡來
  { id: 27, name: '典韋', portraitId: 27, birthYear: 160, deathYear: 197, leadership: 70, war: 97, intelligence: 22, politics: 15, charisma: 55, skills: ['步兵'] },
  // 荀彧: 王佐之才
  { id: 28, name: '荀彧', portraitId: 28, birthYear: 163, deathYear: 212, leadership: 65, war: 30, intelligence: 95, politics: 98, charisma: 88, skills: ['情報', '人才', '外交'] },
  // 荀攸: 謀主
  { id: 29, name: '荀攸', portraitId: 29, birthYear: 157, deathYear: 214, leadership: 68, war: 35, intelligence: 93, politics: 88, charisma: 72, skills: ['情報', '做敵', '虛報'] },
  // 郭嘉: 鬼才
  { id: 30, name: '郭嘉', portraitId: 30, birthYear: 170, deathYear: 207, leadership: 62, war: 28, intelligence: 97, politics: 82, charisma: 78, skills: ['情報', '流言'] },
  // 賈詡: 毒士
  { id: 31, name: '賈詡', portraitId: 31, birthYear: 147, deathYear: 223, leadership: 60, war: 32, intelligence: 96, politics: 90, charisma: 55, skills: ['情報', '做敵', '流言', '虛報'] },
  // 司馬懿: 冢虎
  { id: 32, name: '司馬懿', portraitId: 32, birthYear: 179, deathYear: 251, leadership: 95, war: 52, intelligence: 98, politics: 92, charisma: 78, skills: ['情報', '人才', '火計', '虛報', '步兵'] },
  // 曹仁: 大將軍
  { id: 33, name: '曹仁', portraitId: 33, birthYear: 168, deathYear: 223, leadership: 88, war: 82, intelligence: 65, politics: 62, charisma: 68, skills: ['騎兵', '步兵', '修復'] },
  // 曹丕: 魏文帝
  { id: 34, name: '曹丕', portraitId: 34, birthYear: 187, deathYear: 226, leadership: 72, war: 58, intelligence: 78, politics: 82, charisma: 70, skills: ['步兵', '情報'] },
  // 于禁: 五子良將
  { id: 35, name: '于禁', portraitId: 35, birthYear: 159, deathYear: 221, leadership: 80, war: 78, intelligence: 68, politics: 58, charisma: 55, skills: ['步兵', '修復'] },
  // 樂進: 五子良將
  { id: 36, name: '樂進', portraitId: 36, birthYear: 158, deathYear: 218, leadership: 75, war: 82, intelligence: 52, politics: 45, charisma: 55, skills: ['步兵'] },

  // ===== 東吳 =====
  // 孫堅: 江東猛虎
  { id: 50, name: '孫堅', portraitId: 50, birthYear: 155, deathYear: 191, leadership: 90, war: 92, intelligence: 68, politics: 72, charisma: 90, skills: ['步兵', '騎兵', '海戰'] },
  // 孫策: 小霸王
  { id: 51, name: '孫策', portraitId: 51, birthYear: 175, deathYear: 200, leadership: 88, war: 92, intelligence: 70, politics: 68, charisma: 95, skills: ['騎兵', '步兵', '海戰'] },
  // 孫權: 吳大帝
  { id: 52, name: '孫權', portraitId: 52, birthYear: 182, deathYear: 252, leadership: 80, war: 62, intelligence: 82, politics: 88, charisma: 90, skills: ['海戰', '外交', '人才'] },
  // 周瑜: 美周郎
  { id: 53, name: '周瑜', portraitId: 53, birthYear: 175, deathYear: 210, leadership: 93, war: 70, intelligence: 96, politics: 80, charisma: 90, skills: ['海戰', '情報', '火計', '風變', '同討'] },
  // 陸遜: 書生拜大將
  { id: 54, name: '陸遜', portraitId: 54, birthYear: 183, deathYear: 245, leadership: 92, war: 62, intelligence: 95, politics: 85, charisma: 82, skills: ['海戰', '情報', '火計', '連環'] },
  // 呂蒙: 吳下阿蒙
  { id: 55, name: '呂蒙', portraitId: 55, birthYear: 178, deathYear: 219, leadership: 88, war: 82, intelligence: 85, politics: 62, charisma: 72, skills: ['海戰', '步兵', '情報'] },
  // 甘寧: 錦帆賊
  { id: 56, name: '甘寧', portraitId: 56, birthYear: 165, deathYear: 220, leadership: 80, war: 90, intelligence: 52, politics: 38, charisma: 68, skills: ['海戰', '弓兵'] },
  // 太史慈: 神射手
  { id: 57, name: '太史慈', portraitId: 57, birthYear: 166, deathYear: 206, leadership: 82, war: 90, intelligence: 62, politics: 48, charisma: 75, skills: ['弓兵', '騎兵'] },
  // 黃蓋: 苦肉計
  { id: 58, name: '黃蓋', portraitId: 58, birthYear: 165, deathYear: 220, leadership: 78, war: 80, intelligence: 62, politics: 55, charisma: 68, skills: ['海戰', '火計'] },
  // 魯肅: 老實人
  { id: 59, name: '魯肅', portraitId: 59, birthYear: 172, deathYear: 217, leadership: 68, war: 38, intelligence: 88, politics: 92, charisma: 85, skills: ['外交', '人才'] },
  // 張昭: 內政大臣
  { id: 60, name: '張昭', portraitId: 60, birthYear: 156, deathYear: 236, leadership: 45, war: 22, intelligence: 82, politics: 95, charisma: 78, skills: ['外交', '人才'] },
  // 程普: 江東老臣
  { id: 61, name: '程普', portraitId: 61, birthYear: 155, deathYear: 210, leadership: 78, war: 78, intelligence: 60, politics: 55, charisma: 65, skills: ['步兵', '海戰'] },
  // 韓當: 江東老臣
  { id: 62, name: '韓當', portraitId: 62, birthYear: 158, deathYear: 227, leadership: 72, war: 78, intelligence: 52, politics: 48, charisma: 58, skills: ['海戰', '弓兵'] },

  // ===== 群雄 =====
  // 呂布: 人中呂布
  { id: 70, name: '呂布', portraitId: 70, birthYear: 161, deathYear: 199, leadership: 88, war: 100, intelligence: 28, politics: 18, charisma: 40, skills: ['騎兵', '弓兵'] },
  // 董卓: 魔王
  { id: 71, name: '董卓', portraitId: 71, birthYear: 132, deathYear: 192, leadership: 80, war: 82, intelligence: 55, politics: 42, charisma: 20, skills: ['騎兵', '做敵'] },
  // 袁紹: 四世三公
  { id: 72, name: '袁紹', portraitId: 72, birthYear: 153, deathYear: 202, leadership: 78, war: 62, intelligence: 65, politics: 72, charisma: 82, skills: ['騎兵', '人才'] },
  // 袁術: 淮南王
  { id: 73, name: '袁術', portraitId: 73, birthYear: 155, deathYear: 199, leadership: 55, war: 52, intelligence: 48, politics: 58, charisma: 60, skills: [] },
  // 劉表: 荊州牧
  { id: 74, name: '劉表', portraitId: 74, birthYear: 142, deathYear: 208, leadership: 62, war: 42, intelligence: 68, politics: 78, charisma: 75, skills: ['外交'] },
  // 劉璋: 益州牧
  { id: 75, name: '劉璋', portraitId: 75, birthYear: 167, deathYear: 220, leadership: 45, war: 35, intelligence: 52, politics: 58, charisma: 60, skills: [] },
  // 馬騰: 西涼太守
  { id: 76, name: '馬騰', portraitId: 76, birthYear: 156, deathYear: 211, leadership: 82, war: 85, intelligence: 52, politics: 55, charisma: 78, skills: ['騎兵'] },
  // 公孫瓚: 白馬將軍
  { id: 77, name: '公孫瓚', portraitId: 77, birthYear: 165, deathYear: 199, leadership: 78, war: 80, intelligence: 48, politics: 52, charisma: 68, skills: ['騎兵', '弓兵'] },
  // 陶謙: 徐州牧
  { id: 78, name: '陶謙', portraitId: 78, birthYear: 132, deathYear: 194, leadership: 55, war: 42, intelligence: 60, politics: 72, charisma: 70, skills: [] },
  // 張魯: 五斗米道
  { id: 79, name: '張魯', portraitId: 79, birthYear: 160, deathYear: 216, leadership: 58, war: 45, intelligence: 62, politics: 65, charisma: 72, skills: [] },
  // 孟獲: 南蠻王
  { id: 80, name: '孟獲', portraitId: 80, birthYear: 165, deathYear: 225, leadership: 72, war: 82, intelligence: 28, politics: 22, charisma: 68, skills: ['步兵'] },
  // 貂蟬: 絕世美女
  { id: 81, name: '貂蟬', portraitId: 81, birthYear: 170, deathYear: 220, leadership: 15, war: 18, intelligence: 72, politics: 60, charisma: 98, skills: ['做敵'] },
  // 張角: 大賢良師
  { id: 82, name: '張角', portraitId: 82, birthYear: 140, deathYear: 184, leadership: 80, war: 55, intelligence: 72, politics: 42, charisma: 95, skills: ['情報', '流言', '落雷'] },
  // 張寶: 地公將軍
  { id: 83, name: '張寶', portraitId: 83, birthYear: 142, deathYear: 184, leadership: 62, war: 58, intelligence: 55, politics: 32, charisma: 60, skills: ['流言'] },
  // 張梁: 人公將軍
  { id: 84, name: '張梁', portraitId: 84, birthYear: 144, deathYear: 184, leadership: 60, war: 62, intelligence: 45, politics: 28, charisma: 55, skills: [] },
  // 華雄: 猛將
  { id: 85, name: '華雄', portraitId: 85, birthYear: 155, deathYear: 191, leadership: 72, war: 88, intelligence: 35, politics: 22, charisma: 45, skills: ['步兵'] },
  // 顏良: 河北四庭柱
  { id: 86, name: '顏良', portraitId: 86, birthYear: 158, deathYear: 200, leadership: 75, war: 90, intelligence: 38, politics: 28, charisma: 48, skills: ['騎兵'] },
  // 文醜: 河北四庭柱
  { id: 87, name: '文醜', portraitId: 87, birthYear: 159, deathYear: 200, leadership: 72, war: 88, intelligence: 35, politics: 25, charisma: 45, skills: ['騎兵'] },

  // ===== Phase 1.3: Additional officers for 190 scenario =====
  // 董卓軍
  { id: 88, name: '李儒', portraitId: 88, birthYear: 145, deathYear: 192, leadership: 48, war: 32, intelligence: 88, politics: 75, charisma: 35, skills: ['情報', '做敵'] },
  { id: 89, name: '張濟', portraitId: 89, birthYear: 155, deathYear: 196, leadership: 75, war: 78, intelligence: 52, politics: 48, charisma: 55, skills: ['騎兵'] },
  { id: 90, name: '牛輔', portraitId: 90, birthYear: 158, deathYear: 192, leadership: 65, war: 68, intelligence: 42, politics: 38, charisma: 45, skills: ['騎兵'] },
  { id: 91, name: '李傕', portraitId: 91, birthYear: 152, deathYear: 198, leadership: 72, war: 75, intelligence: 48, politics: 42, charisma: 40, skills: ['騎兵'] },
  { id: 92, name: '郭汜', portraitId: 92, birthYear: 153, deathYear: 197, leadership: 70, war: 76, intelligence: 45, politics: 40, charisma: 38, skills: ['騎兵'] },
  
  // 袁紹軍
  { id: 93, name: '田豐', portraitId: 93, birthYear: 155, deathYear: 200, leadership: 58, war: 35, intelligence: 92, politics: 85, charisma: 62, skills: ['情報', '人才'] },
  { id: 94, name: '沮授', portraitId: 94, birthYear: 158, deathYear: 200, leadership: 62, war: 38, intelligence: 90, politics: 82, charisma: 65, skills: ['情報'] },
  { id: 95, name: '審配', portraitId: 95, birthYear: 160, deathYear: 204, leadership: 65, war: 55, intelligence: 78, politics: 80, charisma: 58, skills: ['情報'] },
  { id: 96, name: '逢紀', portraitId: 96, birthYear: 162, deathYear: 202, leadership: 55, war: 42, intelligence: 82, politics: 75, charisma: 52, skills: ['做敵'] },
  { id: 97, name: '高覽', portraitId: 97, birthYear: 160, deathYear: 201, leadership: 75, war: 82, intelligence: 55, politics: 48, charisma: 58, skills: ['騎兵'] },
  
  // 袁術軍
  { id: 98, name: '紀靈', portraitId: 98, birthYear: 158, deathYear: 199, leadership: 78, war: 85, intelligence: 52, politics: 45, charisma: 55, skills: ['步兵'] },
  { id: 99, name: '張勳', portraitId: 99, birthYear: 160, deathYear: 197, leadership: 70, war: 75, intelligence: 48, politics: 42, charisma: 50, skills: ['步兵'] },
  { id: 100, name: '楊弘', portraitId: 100, birthYear: 155, deathYear: 197, leadership: 52, war: 35, intelligence: 78, politics: 72, charisma: 58, skills: ['外交'] },
  
  // 劉表軍
  { id: 101, name: '蔡瑁', portraitId: 101, birthYear: 158, deathYear: 208, leadership: 72, war: 68, intelligence: 68, politics: 62, charisma: 55, skills: ['海戰', '情報'] },
  { id: 102, name: '蒯良', portraitId: 102, birthYear: 155, deathYear: 208, leadership: 58, war: 32, intelligence: 88, politics: 85, charisma: 68, skills: ['情報', '人才'] },
  { id: 103, name: '蒯越', portraitId: 103, birthYear: 158, deathYear: 214, leadership: 62, war: 38, intelligence: 85, politics: 82, charisma: 65, skills: ['情報'] },
  { id: 104, name: '文聘', portraitId: 104, birthYear: 165, deathYear: 226, leadership: 82, war: 85, intelligence: 68, politics: 60, charisma: 70, skills: ['步兵', '騎兵'] },
  
  // 公孫瓚軍
  { id: 105, name: '田楷', portraitId: 105, birthYear: 160, deathYear: 199, leadership: 68, war: 72, intelligence: 58, politics: 55, charisma: 60, skills: ['騎兵'] },
  { id: 106, name: '嚴綱', portraitId: 106, birthYear: 158, deathYear: 191, leadership: 70, war: 76, intelligence: 48, politics: 45, charisma: 55, skills: ['弓兵', '騎兵'] },
  
  // 陶謙軍
  { id: 107, name: '糜竺', portraitId: 107, birthYear: 165, deathYear: 220, leadership: 52, war: 28, intelligence: 72, politics: 85, charisma: 80, skills: ['外交', '人才'] },
  { id: 108, name: '糜芳', portraitId: 108, birthYear: 168, deathYear: 223, leadership: 58, war: 55, intelligence: 48, politics: 52, charisma: 45, skills: [] },
  { id: 109, name: '陳登', portraitId: 109, birthYear: 163, deathYear: 201, leadership: 72, war: 68, intelligence: 82, politics: 78, charisma: 68, skills: ['情報', '海戰'] },
  
  // 馬騰軍
  { id: 110, name: '龐德', portraitId: 110, birthYear: 178, deathYear: 219, leadership: 82, war: 92, intelligence: 58, politics: 48, charisma: 72, skills: ['騎兵', '步兵'] },
  { id: 111, name: '馬岱', portraitId: 111, birthYear: 182, deathYear: 235, leadership: 78, war: 82, intelligence: 62, politics: 55, charisma: 68, skills: ['騎兵'] },
  
  // 在野 / 其他
  { id: 112, name: '徐庶', portraitId: 112, birthYear: 172, deathYear: 232, leadership: 72, war: 58, intelligence: 92, politics: 78, charisma: 75, skills: ['情報', '人才', '火計'] },
  { id: 113, name: '張任', portraitId: 113, birthYear: 165, deathYear: 214, leadership: 85, war: 88, intelligence: 72, politics: 62, charisma: 68, skills: ['弓兵', '步兵'] },
  { id: 114, name: '嚴顏', portraitId: 114, birthYear: 155, deathYear: 220, leadership: 80, war: 85, intelligence: 65, politics: 58, charisma: 72, skills: ['弓兵', '步兵'] },
];
