/**
 * Officer Acted Flag Enforcement Tests
 *
 * RTK IV rule: each officer can perform ONE action per turn.
 * The `acted` boolean flag tracks this. Every officer-dispatching command must:
 *   1. Check `acted === true` and reject if already acted
 *   2. Set `acted = true` on the officer after execution
 *
 * This test file covers ALL command categories:
 *   - Domestic: developCommerce, developAgriculture, reinforceDefense, developFloodControl,
 *               developTechnology, trainTroops, manufacture, disasterRelief
 *   - Personnel: recruitOfficer, searchOfficer, recruitPOW, draftTroops, transport, transferOfficer
 *   - Military: startBattle (commander check)
 *   - Diplomacy: improveRelations, formAlliance, requestJointAttack, proposeCeasefire, demandSurrender
 *   - Strategy: rumor, counterEspionage, inciteRebellion, arson, spy, gatherIntelligence
 *
 * Commands that do NOT consume an officer's turn (by design):
 *   - setTaxRate, promoteOfficer, rewardOfficer, executeOfficer, dismissOfficer,
 *     appointGovernor, appointAdvisor, breakAlliance, exchangeHostage
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { RTK4Skill } from '../types';

// ── Standard test state setup ──
function setupState() {
  useGameStore.setState({
    phase: 'playing',
    scenario: null,
    playerFaction: {
      id: 1, name: '曹操', rulerId: 1, color: '#3b82f6', isPlayer: true,
      relations: { 2: 60 }, allies: [2], ceasefires: [],
      hostageOfficerIds: [], powOfficerIds: [], advisorId: null,
    },
    cities: [
      {
        id: 1, name: '許昌', x: 50, y: 50, factionId: 1, population: 200000, gold: 50000, food: 50000,
        commerce: 50, agriculture: 50, defense: 30, troops: 30000, adjacentCityIds: [2, 3],
        floodControl: 50, technology: 80, peopleLoyalty: 70, morale: 60, training: 60,
        crossbows: 5000, warHorses: 5000, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      },
      {
        id: 2, name: '洛陽', x: 60, y: 50, factionId: 2, population: 100000, gold: 10000, food: 50000,
        commerce: 50, agriculture: 50, defense: 30, troops: 10000, adjacentCityIds: [1],
        floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      },
      {
        id: 3, name: '鄴', x: 70, y: 50, factionId: 1, population: 100000, gold: 10000, food: 50000,
        commerce: 50, agriculture: 50, defense: 30, troops: 10000, adjacentCityIds: [1],
        floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
        crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
      },
    ],
    officers: [
      {
        id: 1, name: '曹操', leadership: 95, war: 75, intelligence: 95, politics: 95, charisma: 95,
        skills: ['intelligence', 'rumor', 'provoke', 'tigerTrap', 'arson', 'manufacture', 'espionage', 'diplomacy'] as RTK4Skill[],
        portraitId: 1, birthYear: 155, deathYear: 220, treasureId: null, factionId: 1, cityId: 1,
        acted: false, loyalty: 100, isGovernor: true, rank: 'common' as const, relationships: [],
      },
      {
        id: 2, name: '荀彧', leadership: 60, war: 40, intelligence: 95, politics: 95, charisma: 90,
        skills: ['talent', 'diplomacy'] as RTK4Skill[],
        portraitId: 2, birthYear: 163, deathYear: 212, treasureId: null, factionId: 1, cityId: 1,
        acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: [],
      },
      {
        id: 3, name: '張遼', leadership: 90, war: 92, intelligence: 75, politics: 60, charisma: 80,
        skills: [] as RTK4Skill[],
        portraitId: 3, birthYear: 169, deathYear: 222, treasureId: null, factionId: 1, cityId: 1,
        acted: false, loyalty: 100, isGovernor: false, rank: 'common' as const, relationships: [],
      },
      {
        id: 10, name: '呂布', leadership: 95, war: 100, intelligence: 20, politics: 15, charisma: 40,
        skills: [] as RTK4Skill[],
        portraitId: 10, birthYear: 160, deathYear: 200, treasureId: null, factionId: 2, cityId: 2,
        acted: false, loyalty: 50, isGovernor: true, rank: 'common' as const, relationships: [],
      },
      {
        id: 11, name: '貂蟬', leadership: 10, war: 10, intelligence: 70, politics: 80, charisma: 95,
        skills: [] as RTK4Skill[],
        portraitId: 11, birthYear: 170, deathYear: 230, treasureId: null, factionId: null, cityId: 1,
        acted: false, loyalty: 0, isGovernor: false, rank: 'common' as const, relationships: [],
      },
      {
        id: 12, name: '戰俘A', leadership: 50, war: 50, intelligence: 50, politics: 50, charisma: 50,
        skills: [] as RTK4Skill[],
        portraitId: 12, birthYear: 170, deathYear: 230, treasureId: null,
        factionId: -1 as unknown as number, cityId: 1,
        acted: false, loyalty: 30, isGovernor: false, rank: 'common' as const, relationships: [],
      },
    ],
    factions: [
      { id: 1, name: '曹操', rulerId: 1, color: '#3b82f6', isPlayer: true, relations: { 2: 60 }, allies: [2], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
      { id: 2, name: '董卓', rulerId: 10, color: '#ff0000', isPlayer: false, relations: { 1: 60 }, allies: [1], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null },
    ],
    year: 190, month: 1, selectedCityId: 1, activeCommandCategory: null, log: [],
    duelState: null, battleFormation: null, revealedCities: {},
  });
}

/** Mark the specified officer as acted and return the log count before the action */
function markActed(officerId: number): number {
  const state = useGameStore.getState();
  useGameStore.setState({
    officers: state.officers.map(o => o.id === officerId ? { ...o, acted: true } : o),
  });
  return useGameStore.getState().log.length;
}

describe('Acted Flag Enforcement (one action per turn)', () => {
  beforeEach(() => {
    setupState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Helper: test that an action rejects when officer already acted ──
  function expectRejectedWhenActed(
    actionName: string,
    officerId: number,
    doAction: () => void,
  ) {
    it(`${actionName} rejects when officer already acted`, () => {
      markActed(officerId);
      const logBefore = useGameStore.getState().log.length;
      doAction();
      const logs = useGameStore.getState().log.slice(logBefore);
      expect(logs.some(l => l.includes('已行動'))).toBe(true);
    });
  }

  // ── Helper: test that an action sets acted=true after execution ──
  function expectSetsActed(
    actionName: string,
    officerId: number,
    doAction: () => void,
  ) {
    it(`${actionName} sets acted=true after execution`, () => {
      doAction();
      const officer = useGameStore.getState().officers.find(o => o.id === officerId);
      expect(officer?.acted).toBe(true);
    });
  }

  // ════════════════════════════════════════════
  //  DOMESTIC (all use officer id=1 曹操)
  // ════════════════════════════════════════════
  describe('Domestic', () => {
    expectRejectedWhenActed('developCommerce', 1, () => useGameStore.getState().developCommerce(1, 1));
    expectSetsActed('developCommerce', 1, () => useGameStore.getState().developCommerce(1, 1));

    expectRejectedWhenActed('developAgriculture', 1, () => useGameStore.getState().developAgriculture(1, 1));
    expectSetsActed('developAgriculture', 1, () => useGameStore.getState().developAgriculture(1, 1));

    expectRejectedWhenActed('reinforceDefense', 1, () => useGameStore.getState().reinforceDefense(1, 1));
    expectSetsActed('reinforceDefense', 1, () => useGameStore.getState().reinforceDefense(1, 1));

    expectRejectedWhenActed('developFloodControl', 1, () => useGameStore.getState().developFloodControl(1, 1));
    expectSetsActed('developFloodControl', 1, () => useGameStore.getState().developFloodControl(1, 1));

    expectRejectedWhenActed('developTechnology', 1, () => useGameStore.getState().developTechnology(1, 1));
    expectSetsActed('developTechnology', 1, () => useGameStore.getState().developTechnology(1, 1));

    expectRejectedWhenActed('trainTroops', 1, () => useGameStore.getState().trainTroops(1, 1));
    expectSetsActed('trainTroops', 1, () => useGameStore.getState().trainTroops(1, 1));

    expectRejectedWhenActed('manufacture', 1, () => useGameStore.getState().manufacture(1, 'crossbows', 1));
    expectSetsActed('manufacture', 1, () => useGameStore.getState().manufacture(1, 'crossbows', 1));

    expectRejectedWhenActed('disasterRelief', 1, () => useGameStore.getState().disasterRelief(1, 1));
    expectSetsActed('disasterRelief', 1, () => useGameStore.getState().disasterRelief(1, 1));
  });

  // ════════════════════════════════════════════
  //  PERSONNEL
  // ════════════════════════════════════════════
  describe('Personnel', () => {
    expectRejectedWhenActed('recruitOfficer', 1, () => useGameStore.getState().recruitOfficer(11, 1));
    expectSetsActed('recruitOfficer', 1, () => useGameStore.getState().recruitOfficer(11, 1));

    expectRejectedWhenActed('searchOfficer', 1, () => useGameStore.getState().searchOfficer(1, 1));
    expectSetsActed('searchOfficer', 1, () => useGameStore.getState().searchOfficer(1, 1));

    expectRejectedWhenActed('recruitPOW', 1, () => useGameStore.getState().recruitPOW(12, 1));
    expectSetsActed('recruitPOW', 1, () => useGameStore.getState().recruitPOW(12, 1));

    expectRejectedWhenActed('draftTroops', 1, () => useGameStore.getState().draftTroops(1, 1000, 1));

    it('draftTroops sets acted=true after execution', () => {
      // Ensure room for drafting (troops < population * 0.12)
      useGameStore.setState({
        cities: useGameStore.getState().cities.map(c =>
          c.id === 1 ? { ...c, troops: 5000, population: 200000 } : c
        ),
      });
      useGameStore.getState().draftTroops(1, 1000, 1);
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.acted).toBe(true);
    });

    expectRejectedWhenActed('transport', 2, () => useGameStore.getState().transport(1, 3, { gold: 100 }, 2));
    expectSetsActed('transport', 2, () => useGameStore.getState().transport(1, 3, { gold: 100 }, 2));

    expectRejectedWhenActed('transferOfficer', 2, () => useGameStore.getState().transferOfficer(2, 3));
    expectSetsActed('transferOfficer', 2, () => useGameStore.getState().transferOfficer(2, 3));
  });

  // ════════════════════════════════════════════
  //  MILITARY (commander check)
  // ════════════════════════════════════════════
  describe('Military', () => {
    it('startBattle rejects when commander already acted', () => {
      // Officer 1 (曹操) is commander (highest leadership). Mark as acted.
      markActed(1);
      useGameStore.getState().setBattleFormation({ officerIds: [1], unitTypes: ['infantry'] });
      useGameStore.getState().startBattle(2);
      expect(useGameStore.getState().phase).toBe('playing');
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('已行動'));
    });

    it('startBattle sets acted=true on all attacking officers', () => {
      useGameStore.getState().setBattleFormation({ officerIds: [1, 2], unitTypes: ['infantry', 'infantry'] });
      useGameStore.getState().startBattle(2);
      const state = useGameStore.getState();
      const o1 = state.officers.find(o => o.id === 1);
      const o2 = state.officers.find(o => o.id === 2);
      expect(o1?.acted).toBe(true);
      expect(o2?.acted).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  //  DIPLOMACY
  // ════════════════════════════════════════════
  describe('Diplomacy', () => {
    expectRejectedWhenActed('improveRelations', 1, () => useGameStore.getState().improveRelations(2, 1));
    expectSetsActed('improveRelations', 1, () => useGameStore.getState().improveRelations(2, 1));

    it('formAlliance rejects when officer already acted', () => {
      // Remove existing alliance first so we can try forming one
      useGameStore.setState({
        factions: useGameStore.getState().factions.map(f => ({ ...f, allies: [] })),
        playerFaction: { ...useGameStore.getState().playerFaction!, allies: [] },
      });
      markActed(1);
      useGameStore.getState().formAlliance(2, 1);
      expect(useGameStore.getState().log).toContainEqual(expect.stringContaining('已行動'));
    });

    it('formAlliance sets acted=true after execution', () => {
      useGameStore.setState({
        factions: useGameStore.getState().factions.map(f => ({ ...f, allies: [] })),
        playerFaction: { ...useGameStore.getState().playerFaction!, allies: [] },
      });
      useGameStore.getState().formAlliance(2, 1);
      const officer = useGameStore.getState().officers.find(o => o.id === 1);
      expect(officer?.acted).toBe(true);
    });

    expectRejectedWhenActed('requestJointAttack', 1, () => useGameStore.getState().requestJointAttack(2, 2, 1));
    expectSetsActed('requestJointAttack', 1, () => useGameStore.getState().requestJointAttack(2, 2, 1));

    expectRejectedWhenActed('proposeCeasefire', 1, () => useGameStore.getState().proposeCeasefire(2, 1));
    expectSetsActed('proposeCeasefire', 1, () => useGameStore.getState().proposeCeasefire(2, 1));

    expectRejectedWhenActed('demandSurrender', 1, () => useGameStore.getState().demandSurrender(2, 1));
    expectSetsActed('demandSurrender', 1, () => useGameStore.getState().demandSurrender(2, 1));
  });

  // ════════════════════════════════════════════
  //  STRATEGY (officer 1 has all needed skills)
  // ════════════════════════════════════════════
  describe('Strategy', () => {
    expectRejectedWhenActed('rumor', 1, () => useGameStore.getState().rumor(2, 1));
    expectSetsActed('rumor', 1, () => useGameStore.getState().rumor(2, 1));

    expectRejectedWhenActed('counterEspionage', 1, () => useGameStore.getState().counterEspionage(2, 10, 1));
    expectSetsActed('counterEspionage', 1, () => useGameStore.getState().counterEspionage(2, 10, 1));

    expectRejectedWhenActed('inciteRebellion', 1, () => useGameStore.getState().inciteRebellion(2, 1));
    expectSetsActed('inciteRebellion', 1, () => useGameStore.getState().inciteRebellion(2, 1));

    expectRejectedWhenActed('arson', 1, () => useGameStore.getState().arson(2, 1));
    expectSetsActed('arson', 1, () => useGameStore.getState().arson(2, 1));

    expectRejectedWhenActed('spy', 1, () => useGameStore.getState().spy(2, 1));
    expectSetsActed('spy', 1, () => useGameStore.getState().spy(2, 1));

    expectRejectedWhenActed('gatherIntelligence', 1, () => useGameStore.getState().gatherIntelligence(2, 1));
    expectSetsActed('gatherIntelligence', 1, () => useGameStore.getState().gatherIntelligence(2, 1));
  });

  // ════════════════════════════════════════════
  //  LOG MESSAGES: no stamina references
  // ════════════════════════════════════════════
  describe('Log messages contain no stamina references', () => {
    it('acted rejection log does not mention stamina/體力', () => {
      markActed(1);
      useGameStore.getState().developCommerce(1, 1);
      const logs = useGameStore.getState().log;
      const lastLog = logs[logs.length - 1];
      expect(lastLog).not.toMatch(/體力/);
      expect(lastLog).not.toMatch(/stamina/i);
      expect(lastLog).toMatch(/已行動/);
    });

    it('commander acted rejection does not mention stamina', () => {
      markActed(1);
      useGameStore.getState().setBattleFormation({ officerIds: [1], unitTypes: ['infantry'] });
      useGameStore.getState().startBattle(2);
      const logs = useGameStore.getState().log;
      const battleLog = logs.find(l => l.includes('已行動') || l.includes('stamina'));
      expect(battleLog).toBeDefined();
      expect(battleLog).not.toMatch(/體力/);
      expect(battleLog).not.toMatch(/stamina/i);
    });

    it('success log for developCommerce does not mention stamina', () => {
      useGameStore.getState().developCommerce(1, 1);
      const logs = useGameStore.getState().log;
      const lastLog = logs[logs.length - 1];
      expect(lastLog).not.toMatch(/體力/);
      expect(lastLog).not.toMatch(/stamina/i);
    });

    it('success log for recruitOfficer does not mention stamina', () => {
      useGameStore.getState().recruitOfficer(11, 1);
      const logs = useGameStore.getState().log;
      const lastLog = logs[logs.length - 1];
      expect(lastLog).not.toMatch(/體力/);
      expect(lastLog).not.toMatch(/stamina/i);
    });

    it('success log for diplomacy does not mention stamina', () => {
      useGameStore.getState().improveRelations(2, 1);
      const logs = useGameStore.getState().log;
      const lastLog = logs[logs.length - 1];
      expect(lastLog).not.toMatch(/體力/);
      expect(lastLog).not.toMatch(/stamina/i);
    });
  });

  // ════════════════════════════════════════════
  //  TRANSPORT: no adjacency restriction (RTK IV rule)
  // ════════════════════════════════════════════
  describe('Transport allows non-adjacent friendly cities', () => {
    it('transport succeeds to a non-adjacent friendly city', () => {
      // Add a 4th city (factionId: 1) that is NOT adjacent to city 1
      useGameStore.setState({
        cities: [
          ...useGameStore.getState().cities,
          {
            id: 4, name: '長安', x: 80, y: 50, factionId: 1, population: 100000, gold: 5000, food: 5000,
            commerce: 50, agriculture: 50, defense: 30, troops: 5000, adjacentCityIds: [3],
            floodControl: 50, technology: 50, peopleLoyalty: 70, morale: 60, training: 60,
            crossbows: 0, warHorses: 0, batteringRams: 0, catapults: 0, taxRate: 'medium' as const,
          },
        ],
      });

      // City 1 (許昌) adjacentCityIds = [2, 3] — city 4 (長安) is NOT adjacent
      const city1 = useGameStore.getState().cities.find(c => c.id === 1)!;
      expect(city1.adjacentCityIds).not.toContain(4);

      // Transport gold from city 1 to city 4 (non-adjacent)
      useGameStore.getState().transport(1, 4, { gold: 1000 }, 2);

      const state = useGameStore.getState();
      const src = state.cities.find(c => c.id === 1)!;
      const dst = state.cities.find(c => c.id === 4)!;
      expect(src.gold).toBe(49000); // 50000 - 1000
      expect(dst.gold).toBe(6000);  // 5000 + 1000
    });
  });
});
