import { describe, it, expect } from 'vitest';
import { baseOfficers } from './officers';
import { RTK4_SKILLS } from '../types';
import type { RTK4Skill } from '../types';

/**
 * Officer data coherence tests.
 *
 * These tests validate structural integrity of the officer roster:
 * - Every defined skill is assigned to at least one officer
 * - All officer skills reference valid RTK4 skill keys
 * - No duplicate skills on a single officer
 */
describe('Officer Data Coherence', () => {
  it('every RTK4 skill should be assigned to at least one officer', () => {
    const assignedSkills = new Set<RTK4Skill>();
    for (const officer of baseOfficers) {
      for (const skill of officer.skills) {
        assignedSkills.add(skill);
      }
    }

    const unassigned: string[] = [];
    for (const skill of RTK4_SKILLS) {
      if (!assignedSkills.has(skill)) {
        unassigned.push(skill);
      }
    }

    expect(unassigned, `Orphaned skills with no officer: ${unassigned.join(', ')}`).toEqual([]);
  });

  it('all officer skills should reference valid RTK4 skill keys', () => {
    const validSkills = new Set<string>(RTK4_SKILLS);
    const invalid: { officer: string; skill: string }[] = [];

    for (const officer of baseOfficers) {
      for (const skill of officer.skills) {
        if (!validSkills.has(skill)) {
          invalid.push({ officer: officer.name, skill });
        }
      }
    }

    expect(invalid, `Officers with invalid skills: ${JSON.stringify(invalid)}`).toEqual([]);
  });

  it('no officer should have duplicate skills', () => {
    const duplicates: { officer: string; skill: string }[] = [];

    for (const officer of baseOfficers) {
      const seen = new Set<string>();
      for (const skill of officer.skills) {
        if (seen.has(skill)) {
          duplicates.push({ officer: officer.name, skill });
        }
        seen.add(skill);
      }
    }

    expect(duplicates, `Officers with duplicate skills: ${JSON.stringify(duplicates)}`).toEqual([]);
  });
});
