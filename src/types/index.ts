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
  /** 兵種適性 */
  skills: string[];
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
  | 'battle';      // 戰鬥

/** 指令分類 */
export type CommandCategory = '內政' | '軍事' | '人事' | '外交' | '謀略' | '結束';

export interface TurnCommand {
  category: CommandCategory;
  name: string;
  description: string;
  execute: () => void;
}
