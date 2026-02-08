import type { Officer, RTK4Skill } from '../types';

/**
 * Skill System Utilities - Phase 1.1
 * Provides functions for checking officer skills and command requirements
 */

/** Check if an officer has a specific skill */
export function hasSkill(officer: Officer, skill: RTK4Skill): boolean {
  return officer.skills.includes(skill);
}

/** Get all officers with a specific skill from a list */
export function officersWithSkill(officers: Officer[], skill: RTK4Skill): Officer[] {
  return officers.filter(o => o.skills.includes(skill));
}

/** Skill requirements map: command -> required skill (null = no requirement) */
export const SKILL_REQUIREMENTS: Record<string, RTK4Skill | null> = {
  // 內政 (Domestic)
  '製造': '製造',
  // 謀略 (Strategy)
  '反間': '做敵',
  '煽動': '驅虎',
  '放火': '燒討',
  '諜報': '情報',
  '密偵': '情報',
  // 外交 (Diplomacy)
  '外交': '外交',
  // 戰鬥 (Battle Tactics)
  '火計': '火計',
  '落石': '落石',
  '同討': '同討',
  '天變': '天變',
  '風變': '風變',
  '混亂': '混亂',
  '連環': '連環',
  '落雷': '落雷',
  '修復': '修復',
  '罵聲': '罵聲',
  '虛報': '虛報',
};

/** Check if an officer can use a specific command */
export function canUseCommand(officer: Officer, command: string): boolean {
  const required = SKILL_REQUIREMENTS[command];
  if (!required) return true;
  return hasSkill(officer, required);
}

/** Get all available commands for an officer */
export function getAvailableCommands(officer: Officer): string[] {
  return Object.keys(SKILL_REQUIREMENTS).filter(cmd => canUseCommand(officer, cmd));
}

/** Check if an officer has any skills from a specific group */
export function hasSkillGroup(officer: Officer, group: 'strategy' | 'military' | 'tactics' | 'special'): boolean {
  const groups: Record<typeof group, RTK4Skill[]> = {
    strategy: ['外交', '情報', '人才', '製造', '做敵', '驅虎', '流言', '燒討'],
    military: ['諜報', '步兵', '騎兵', '弓兵', '海戰'],
    tactics: ['火計', '落石', '同討', '天變', '風變', '混亂', '連環', '落雷'],
    special: ['修復', '罵聲', '虛報'],
  };
  
  return groups[group].some(skill => hasSkill(officer, skill));
}

/** Count skills in a specific group */
export function countSkillsInGroup(officer: Officer, group: 'strategy' | 'military' | 'tactics' | 'special'): number {
  const groups: Record<typeof group, RTK4Skill[]> = {
    strategy: ['外交', '情報', '人才', '製造', '做敵', '驅虎', '流言', '燒討'],
    military: ['諜報', '步兵', '騎兵', '弓兵', '海戰'],
    tactics: ['火計', '落石', '同討', '天變', '風變', '混亂', '連環', '落雷'],
    special: ['修復', '罵聲', '虛報'],
  };
  
  return officer.skills.filter(skill => groups[group].includes(skill)).length;
}
