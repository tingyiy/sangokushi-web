/**
 * RTK IV Officer Skills (22 skills total)
 * Group 1: Strategy (外交, 情報, 人才, 製造, 做敵, 驅虎, 流言, 燒討)
 * Group 2: Military Types (諜報, 步兵, 騎兵, 弓兵, 海戰)
 * Group 3: Battle Tactics (火計, 落石, 同討, 天變, 風變, 混亂, 連環, 落雷)
 * Group 4: Special (修復, 罵聲, 虛報)
 */
export const RTK4_SKILLS = [
  // Group 1: Strategy
  '外交', '情報', '人才', '製造', '做敵', '驅虎', '流言', '燒討',
  // Group 2: Military Types
  '諜報', '步兵', '騎兵', '弓兵', '海戰',
  // Group 3: Battle Tactics
  '火計', '落石', '同討', '天變', '風變', '混亂', '連環', '落雷',
  // Group 4: Special
  '修復', '罵聲', '虛報',
] as const;

/** RTK IV Skill type */
export type RTK4Skill = typeof RTK4_SKILLS[number];

/** 武將（Officer）— a named historical character */
export interface Officer {
  id: number;
  name: string;           // 繁體中文名
  /** 統率 (Leadership) */
  leadership: number;
  /** 武力 (War / Martial) */
  war: number;
  /** 智力 (Intelligence) */
  intelligence: number;
  /** 政治 (Politics) */
  politics: number;
  /** 魅力 (Charisma) */
  charisma: number;
  /** 
   * 技能列表 - RTK IV 22個技能
   * Phase 1.1: Officer Skill System
   */
  skills: RTK4Skill[];
  /** 所屬勢力 id，null = 在野 (unaffiliated) */
  factionId: number | null;
  /** 所在城市 id */
  cityId: number;
  /** 體力 (stamina) 0-100 */
  stamina: number;
  /** 忠誠 (loyalty) 0-100, rulers always 100 */
  loyalty: number;
  /** 是否為太守 (governor of current city) */
  isGovernor: boolean;
}

/** 城市（City / Province） */
export interface City {
  id: number;
  name: string;
  /** Map coordinates for rendering (percentage of map) */
  x: number;
  y: number;
  /** 所屬勢力 id，null = 空城 */
  factionId: number | null;
  /** 人口 */
  population: number;
  /** 金 */
  gold: number;
  /** 糧 */
  food: number;
  /** 商業 */
  commerce: number;
  /** 農業 */
  agriculture: number;
  /** 防禦 */
  defense: number;
  /** 兵力 */
  troops: number;
  /** 鄰接城市 ids */
  adjacentCityIds: number[];
  
  // Phase 1.2: City Attribute Expansion
  /** 治水 (Flood Control) - reduces disaster damage */
  floodControl: number;
  /** 技術 (Technology) - gates weapon manufacturing */
  technology: number;
  /** 民忠 (People Loyalty) - affects population growth and unrest */
  peopleLoyalty: number;
  /** 士氣 (Morale) - affects troop performance in battle */
  morale: number;
  /** 訓練 (Training) - affects troop effectiveness */
  training: number;
  
  // Phase 1.2: Weapon Inventory
  /** 弩 (Crossbows) - enhances archer units */
  crossbows: number;
  /** 軍馬 (War Horses) - required for cavalry units */
  warHorses: number;
  /** 衝車 (Battering Rams) - bonus damage to gates in siege */
  batteringRams: number;
  /** 投石機 (Catapults) - ranged AoE damage in siege */
  catapults: number;
}

/** 勢力（Faction） */
export interface Faction {
  id: number;
  name: string;
  /** 君主 officer id */
  rulerId: number;
  /** 勢力顏色 (hex) */
  color: string;
  /** Is this faction player-controlled? */
  isPlayer: boolean;
  /** Relations (Hostility 0-100) with other factions. Key: factionId */
  relations: Record<number, number>;
  /** Allied faction IDs */
  allies: number[];
}

/** 劇本（Scenario） */
export interface Scenario {
  id: number;
  name: string;
  year: number;
  description: string;
  factions: Faction[];
  cities: City[];
  officers: Officer[];
}

/** 遊戲階段 */
export type GamePhase =
  | 'title'        // 標題畫面
  | 'scenario'     // 劇本選擇
  | 'faction'      // 勢力選擇
  | 'playing'      // 遊戲中
  | 'battle'       // 戰鬥
  | 'duel'         // 單挑
  | 'victory'      // 勝利畫面
  | 'defeat';      // 敗北畫面

/** 指令分類 */
export type CommandCategory = '內政' | '軍事' | '人事' | '外交' | '謀略' | '結束';

export interface TurnCommand {
  category: CommandCategory;
  name: string;
  description: string;
  execute: () => void;
}
