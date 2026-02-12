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
  'manufacture': 'manufacture',
  // 謀略 (Strategy)
  '反間': 'provoke',
  '煽動': 'tigerTrap',
  '放火': 'arson',
  'espionage': 'intelligence',
  '密偵': 'intelligence',
  // 外交 (Diplomacy)
  'diplomacy': 'diplomacy',
  // 戰鬥 (Battle Tactics)
  'firePlot': 'firePlot',
  'rockfall': 'rockfall',
  'jointAttack': 'jointAttack',
  'weatherChange': 'weatherChange',
  'windChange': 'windChange',
  'confusion': 'confusion',
  'chainLink': 'chainLink',
  'lightning': 'lightning',
  'repair': 'repair',
  'taunt': 'taunt',
  'falseReport': 'falseReport',
  'inspire': 'inspire',
  'ambush': 'ambush',
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
    strategy: ['diplomacy', 'intelligence', 'talent', 'manufacture', 'provoke', 'tigerTrap', 'rumor', 'arson'],
    military: ['espionage', 'infantry', 'cavalry', 'archery', 'naval'],
    tactics: ['firePlot', 'rockfall', 'jointAttack', 'weatherChange', 'windChange', 'confusion', 'chainLink', 'lightning'],
    special: ['repair', 'taunt', 'falseReport', 'inspire', 'ambush'],
  };
  
  return groups[group].some(skill => hasSkill(officer, skill));
}

/** Count skills in a specific group */
export function countSkillsInGroup(officer: Officer, group: 'strategy' | 'military' | 'tactics' | 'special'): number {
  const groups: Record<typeof group, RTK4Skill[]> = {
    strategy: ['diplomacy', 'intelligence', 'talent', 'manufacture', 'provoke', 'tigerTrap', 'rumor', 'arson'],
    military: ['espionage', 'infantry', 'cavalry', 'archery', 'naval'],
    tactics: ['firePlot', 'rockfall', 'jointAttack', 'weatherChange', 'windChange', 'confusion', 'chainLink', 'lightning'],
    special: ['repair', 'taunt', 'falseReport', 'inspire', 'ambush'],
  };
  
  return officer.skills.filter(skill => groups[group].includes(skill)).length;
}
