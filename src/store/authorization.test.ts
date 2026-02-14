import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { RTK4Skill } from '../types';

/**
 * Authorization tests: verify that all player actions enforce ownership checks.
 *
 * Each action must refuse to modify state when:
 *   - The city belongs to an enemy faction
 *   - The officer belongs to an enemy faction (where applicable)
 *
 * Pattern: set selectedCityId to an enemy city (factionId: 2) and verify
 * that no state mutation occurs.
 */

/* ---------- helpers ---------- */

const PLAYER_FACTION_ID = 1;
const ENEMY_FACTION_ID = 2;

function makeCity(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, name: '許昌', x: 50, y: 50, factionId: PLAYER_FACTION_ID,
    population: 100000, gold: 10000, food: 50000,
    commerce: 50, agriculture: 50, defense: 30, troops: 10000,
    adjacentCityIds: [2],
    floodControl: 50, technology: 50, peopleLoyalty: 70,
    morale: 60, training: 60,
    crossbows: 2000, warHorses: 2000, batteringRams: 0, catapults: 0,
    taxRate: 'medium' as const,
    ...overrides,
  };
}

function makeOfficer(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, name: '荀彧', leadership: 85, war: 60, intelligence: 95, politics: 95, charisma: 90,
    skills: ['manufacture', 'talent', 'provoke', 'tigerTrap', 'arson', 'intelligence', 'diplomacy', 'rumor', 'espionage'] as RTK4Skill[],
    portraitId: 1, birthYear: 160, deathYear: 220, treasureId: null,
    factionId: PLAYER_FACTION_ID, cityId: 1,
    acted: false, loyalty: 100, isGovernor: true,
    rank: 'common' as const, relationships: [],
    ...overrides,
  };
}

function makeFaction(overrides: Record<string, unknown> = {}) {
  return {
    id: PLAYER_FACTION_ID, name: '曹操', rulerId: 1, color: '#3b82f6',
    isPlayer: true, relations: { [ENEMY_FACTION_ID]: 60 },
    allies: [], ceasefires: [], hostageOfficerIds: [], powOfficerIds: [], advisorId: null,
    ...overrides,
  };
}

function setupDefault() {
  const playerCity = makeCity({ id: 1, factionId: PLAYER_FACTION_ID });
  const enemyCity = makeCity({
    id: 2, name: '洛陽', x: 60, y: 50, factionId: ENEMY_FACTION_ID,
    adjacentCityIds: [1],
  });
  const playerOfficer = makeOfficer({ id: 1, factionId: PLAYER_FACTION_ID, cityId: 1 });
  const enemyOfficer = makeOfficer({
    id: 2, name: '呂布', factionId: ENEMY_FACTION_ID, cityId: 2,
    skills: [] as RTK4Skill[], isGovernor: true,
  });
  const playerFaction = makeFaction();
  const enemyFaction = makeFaction({
    id: ENEMY_FACTION_ID, name: '董卓', rulerId: 2, color: '#ff0000',
    isPlayer: false, relations: { [PLAYER_FACTION_ID]: 60 },
  });

  useGameStore.setState({
    phase: 'playing',
    scenario: null,
    playerFaction: playerFaction,
    cities: [playerCity, enemyCity],
    officers: [playerOfficer, enemyOfficer],
    factions: [playerFaction, enemyFaction],
    year: 190, month: 1,
    selectedCityId: 1,
    activeCommandCategory: null,
    log: [],
    duelState: null,
    battleFormation: null,
  });
}

/** Snapshot gold/food for a city before calling an action */
function snapshotCity(cityId: number) {
  const c = useGameStore.getState().cities.find(c => c.id === cityId)!;
  return { gold: c.gold, food: c.food, troops: c.troops, commerce: c.commerce, agriculture: c.agriculture, defense: c.defense };
}

/* ---------- tests ---------- */

describe('Authorization - City Ownership Checks', () => {
  beforeEach(setupDefault);

  // ─── Domestic Actions ───

  describe('Domestic actions reject enemy city', () => {
    const domesticActions: [string, (cityId: number) => void][] = [
      ['developCommerce', (id) => useGameStore.getState().developCommerce(id)],
      ['developAgriculture', (id) => useGameStore.getState().developAgriculture(id)],
      ['reinforceDefense', (id) => useGameStore.getState().reinforceDefense(id)],
      ['developFloodControl', (id) => useGameStore.getState().developFloodControl(id)],
      ['developTechnology', (id) => useGameStore.getState().developTechnology(id)],
      ['trainTroops', (id) => useGameStore.getState().trainTroops(id)],
      ['disasterRelief', (id) => useGameStore.getState().disasterRelief(id)],
    ];

    it.each(domesticActions)('%s does nothing on enemy city', (_name, action) => {
      const before = snapshotCity(2);
      action(2); // enemy city
      const after = snapshotCity(2);
      expect(after).toEqual(before);
    });

    it('manufacture does nothing on enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().manufacture(2, 'crossbows');
      const after = snapshotCity(2);
      expect(after).toEqual(before);
    });

    it('setTaxRate does nothing on enemy city', () => {
      const enemyCity = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(enemyCity.taxRate).toBe('medium');
      useGameStore.getState().setTaxRate(2, 'high');
      const afterCity = useGameStore.getState().cities.find(c => c.id === 2)!;
      expect(afterCity.taxRate).toBe('medium');
    });
  });

  // ─── Personnel Actions ───

  describe('Personnel actions reject enemy officers / cities', () => {
    it('rewardOfficer does nothing for enemy officer', () => {
      const before = snapshotCity(1);
      useGameStore.getState().rewardOfficer(2, 'gold', 1000); // officer 2 is enemy
      const after = snapshotCity(1);
      expect(after.gold).toBe(before.gold); // no gold deducted
    });

    it('dismissOfficer does nothing for enemy officer', () => {
      useGameStore.getState().dismissOfficer(2);
      const officer = useGameStore.getState().officers.find(o => o.id === 2)!;
      expect(officer.factionId).toBe(ENEMY_FACTION_ID); // unchanged
    });

    it('appointGovernor rejects officer from wrong faction', () => {
      useGameStore.getState().appointGovernor(2, 2);
      // enemyOfficer should still not be changed by playerFaction
      const officer = useGameStore.getState().officers.find(o => o.id === 2)!;
      expect(officer.factionId).toBe(ENEMY_FACTION_ID);
    });

    it('appointAdvisor does nothing for enemy officer', () => {
      useGameStore.getState().appointAdvisor(2);
      expect(useGameStore.getState().playerFaction?.advisorId).toBeNull();
    });

    it('transferOfficer does nothing for enemy officer', () => {
      useGameStore.getState().transferOfficer(2, 1);
      const officer = useGameStore.getState().officers.find(o => o.id === 2)!;
      expect(officer.cityId).toBe(2); // unchanged
    });

    it('transferOfficer rejects moving to enemy city', () => {
      useGameStore.getState().transferOfficer(1, 2);
      const officer = useGameStore.getState().officers.find(o => o.id === 1)!;
      expect(officer.cityId).toBe(1); // unchanged
    });

    it('draftTroops does nothing on enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().draftTroops(2, 1000);
      const after = snapshotCity(2);
      expect(after).toEqual(before);
    });

    it('transport rejects sending from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().transport(2, 1, { gold: 1000 });
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold); // no gold moved
    });

    it('transport rejects sending to enemy city', () => {
      const before1 = snapshotCity(1);
      useGameStore.getState().transport(1, 2, { gold: 1000 });
      // source city should not lose gold
      const after1 = snapshotCity(1);
      expect(after1.gold).toBe(before1.gold);
    });

    it('searchOfficer does nothing on enemy city', () => {
      const logBefore = useGameStore.getState().log.length;
      useGameStore.getState().searchOfficer(2);
      // Should not search — no acted flag set on player officer
      const officer = useGameStore.getState().officers.find(o => o.id === 1)!;
      expect(officer.acted).toBe(false);
      // No meaningful log added (just silent return)
      expect(useGameStore.getState().log.length).toBe(logBefore);
    });
  });

  // ─── Diplomacy Actions (use selectedCityId) ───

  describe('Diplomacy actions reject when selectedCityId is enemy city', () => {
    beforeEach(() => {
      // Point selectedCityId to enemy city
      useGameStore.setState({ selectedCityId: 2 });
    });

    it('improveRelations does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().improveRelations(ENEMY_FACTION_ID);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('formAlliance does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().formAlliance(ENEMY_FACTION_ID);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('requestJointAttack does nothing from enemy city', () => {
      useGameStore.getState().requestJointAttack(ENEMY_FACTION_ID, 1);
      const officer = useGameStore.getState().officers.find(o => o.id === 1)!;
      expect(officer.acted).toBe(false); // officer not consumed
    });

    it('proposeCeasefire does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().proposeCeasefire(ENEMY_FACTION_ID);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('demandSurrender does nothing from enemy city', () => {
      useGameStore.getState().demandSurrender(ENEMY_FACTION_ID);
      const officer = useGameStore.getState().officers.find(o => o.id === 1)!;
      expect(officer.acted).toBe(false);
    });
  });

  // Verify diplomacy works from own city (sanity check)
  it('improveRelations works from own city', () => {
    useGameStore.setState({ selectedCityId: 1 });
    useGameStore.getState().improveRelations(ENEMY_FACTION_ID);
    const city = useGameStore.getState().cities.find(c => c.id === 1)!;
    expect(city.gold).toBe(9000); // 10000 - 1000
  });

  // ─── Strategy Actions (use selectedCityId) ───

  describe('Strategy actions reject when selectedCityId is enemy city', () => {
    beforeEach(() => {
      useGameStore.setState({ selectedCityId: 2 });
    });

    it('rumor does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().rumor(1);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('counterEspionage does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().counterEspionage(1, 1);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('inciteRebellion does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().inciteRebellion(1);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('arson does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().arson(1);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('spy does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().spy(1);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });

    it('gatherIntelligence does nothing from enemy city', () => {
      const before = snapshotCity(2);
      useGameStore.getState().gatherIntelligence(1);
      const after = snapshotCity(2);
      expect(after.gold).toBe(before.gold);
    });
  });

  // Verify strategy works from own city (sanity check)
  it('rumor works from own city', () => {
    useGameStore.setState({ selectedCityId: 1 });
    useGameStore.getState().rumor(2);
    const city = useGameStore.getState().cities.find(c => c.id === 1)!;
    expect(city.gold).toBe(9500); // 10000 - 500
  });
});

describe('Authorization - No playerFaction', () => {
  beforeEach(() => {
    setupDefault();
    useGameStore.setState({ playerFaction: null });
  });

  it('developCommerce silently fails with no playerFaction', () => {
    const before = snapshotCity(1);
    useGameStore.getState().developCommerce(1);
    const after = snapshotCity(1);
    expect(after).toEqual(before);
  });

  it('setTaxRate silently fails with no playerFaction', () => {
    useGameStore.getState().setTaxRate(1, 'high');
    const city = useGameStore.getState().cities.find(c => c.id === 1)!;
    expect(city.taxRate).toBe('medium');
  });

  it('transport silently fails with no playerFaction', () => {
    const before = snapshotCity(1);
    useGameStore.getState().transport(1, 2, { gold: 1000 });
    const after = snapshotCity(1);
    expect(after.gold).toBe(before.gold);
  });

  it('improveRelations silently fails with no playerFaction', () => {
    useGameStore.setState({ selectedCityId: 1 });
    const before = snapshotCity(1);
    useGameStore.getState().improveRelations(ENEMY_FACTION_ID);
    const after = snapshotCity(1);
    expect(after.gold).toBe(before.gold);
  });
});
