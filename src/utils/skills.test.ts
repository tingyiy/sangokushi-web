import { describe, test, expect } from 'vitest';
import type { Officer, RTK4Skill } from '../types';
import {
  hasSkill,
  officersWithSkill,
  canUseCommand,
  getAvailableCommands,
  hasSkillGroup,
  countSkillsInGroup,
  SKILL_REQUIREMENTS,
} from './skills';

const mockOfficer: Officer = {
  id: 1,
  name: '測試武將',
  portraitId: 1,
  birthYear: 160,
  deathYear: 220,
  leadership: 80,
  war: 85,
  intelligence: 70,
  politics: 65,
  charisma: 75,
  skills: ['流言', '火計', '騎兵', '步兵'] as RTK4Skill[],
  factionId: 1,
  cityId: 1,
  stamina: 100,
  loyalty: 80,
  isGovernor: false,
  treasureId: null,
};

const mockOfficerNoSkills: Officer = {
  ...mockOfficer,
  id: 2,
  name: '無技能武將',
  skills: [] as RTK4Skill[],
};

describe('skills', () => {
  describe('hasSkill', () => {
    test('returns true for officer with skill', () => {
      expect(hasSkill(mockOfficer, '流言')).toBe(true);
      expect(hasSkill(mockOfficer, '火計')).toBe(true);
      expect(hasSkill(mockOfficer, '騎兵')).toBe(true);
    });

    test('returns false for officer without skill', () => {
      expect(hasSkill(mockOfficer, '天變')).toBe(false);
      expect(hasSkill(mockOfficer, '情報')).toBe(false);
    });

    test('returns false for officer with no skills', () => {
      expect(hasSkill(mockOfficerNoSkills, '流言')).toBe(false);
    });
  });

  describe('officersWithSkill', () => {
    test('returns officers with specific skill', () => {
      const officers = [mockOfficer, mockOfficerNoSkills];
      expect(officersWithSkill(officers, '流言')).toHaveLength(1);
      expect(officersWithSkill(officers, '流言')[0].id).toBe(1);
    });

    test('returns empty array when no officers have skill', () => {
      const officers = [mockOfficerNoSkills];
      expect(officersWithSkill(officers, '流言')).toHaveLength(0);
    });

    test('returns all officers with skill', () => {
      const officer2 = { ...mockOfficer, id: 3, skills: ['流言'] as RTK4Skill[] };
      const officers = [mockOfficer, officer2];
      expect(officersWithSkill(officers, '流言')).toHaveLength(2);
    });
  });

  describe('canUseCommand', () => {
    test('returns true when officer has required skill', () => {
      expect(canUseCommand(mockOfficer, '火計')).toBe(true); // requires 火計
    });

    test('returns true when command has no requirement', () => {
      // Commands not in SKILL_REQUIREMENTS should be allowed
      expect(canUseCommand(mockOfficer, 'unknown_command')).toBe(true);
    });

    test('returns false when officer lacks required skill', () => {
      expect(canUseCommand(mockOfficerNoSkills, '放火')).toBe(false);
      expect(canUseCommand(mockOfficerNoSkills, '天變')).toBe(false);
    });

    test('handles all skill requirements', () => {
      // Test each defined requirement
      Object.entries(SKILL_REQUIREMENTS).forEach(([command, requiredSkill]) => {
        if (requiredSkill) {
          const officerWithSkill = { ...mockOfficer, skills: [requiredSkill] as RTK4Skill[] };
          expect(canUseCommand(officerWithSkill, command)).toBe(true);
          
          const officerWithoutSkill = { ...mockOfficer, skills: [] as RTK4Skill[] };
          expect(canUseCommand(officerWithoutSkill, command)).toBe(false);
        }
      });
    });
  });

  describe('getAvailableCommands', () => {
    test('returns commands officer can use', () => {
      const commands = getAvailableCommands(mockOfficer);
      expect(commands.length).toBeGreaterThan(0);
      expect(commands).toContain('火計');
    });

    test('returns empty array for officer with no applicable skills', () => {
      // Officer with no skills can only use commands with no requirements
      const commands = getAvailableCommands(mockOfficerNoSkills);
      const requiredCommands = Object.entries(SKILL_REQUIREMENTS)
        .filter(([, skill]) => skill !== null)
        .map(([cmd]) => cmd);
      
      requiredCommands.forEach(cmd => {
        expect(commands).not.toContain(cmd);
      });
    });
  });

  describe('hasSkillGroup', () => {
    test('returns true for strategy skills', () => {
      expect(hasSkillGroup(mockOfficer, 'strategy')).toBe(true);
    });

    test('returns true for military skills', () => {
      expect(hasSkillGroup(mockOfficer, 'military')).toBe(true);
    });

    test('returns false when officer has no skills in group', () => {
      expect(hasSkillGroup(mockOfficerNoSkills, 'strategy')).toBe(false);
      expect(hasSkillGroup(mockOfficerNoSkills, 'military')).toBe(false);
    });
  });

  describe('countSkillsInGroup', () => {
    test('counts skills correctly', () => {
      expect(countSkillsInGroup(mockOfficer, 'strategy')).toBe(1); // 流言
      expect(countSkillsInGroup(mockOfficer, 'military')).toBe(2); // 騎兵, 步兵
    });

    test('returns 0 for officer with no skills', () => {
      expect(countSkillsInGroup(mockOfficerNoSkills, 'strategy')).toBe(0);
    });

    test('counts tactics skills', () => {
      const officerWithTactics = { ...mockOfficer, skills: ['火計', '天變', '風變'] as RTK4Skill[] };
      expect(countSkillsInGroup(officerWithTactics, 'tactics')).toBe(3);
    });
  });
});
