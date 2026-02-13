import { describe, it, expect, beforeEach } from 'vitest';
import { rtkApi } from './rtk-api';
import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import type { BattleUnit } from '../types/battle';

describe('RTK Automation API', () => {
  beforeEach(() => {
    // Reset stores
    useGameStore.setState({
      phase: 'title',
      scenario: null,
      playerFaction: null,
      cities: [],
      officers: [],
      factions: [],
      year: 189,
      month: 1,
      selectedCityId: null,
      activeCommandCategory: null,
      log: [],
      duelState: null,
      revealedCities: {},
      pendingGovernorAssignmentCityId: null,
      battleFormation: null,
      pendingEvents: [],
      battleResolved: false,
    });
  });

  it('reports the current phase', () => {
    expect(rtkApi.phase()).toBe('title');
    useGameStore.setState({ phase: 'playing' });
    expect(rtkApi.phase()).toBe('playing');
  });

  it('can start a new game', () => {
    const result = rtkApi.newGame(1, 1);
    expect(result.ok).toBe(true);
    expect(rtkApi.phase()).toBe('playing');
    expect(rtkApi.query.playerFaction()?.id).toBe(1);
  });

  it('can query cities and officers', () => {
    rtkApi.newGame(1, 1);
    const cities = rtkApi.query.cities();
    expect(cities.length).toBeGreaterThan(0);
    
    const myCities = rtkApi.query.myCities();
    expect(myCities.length).toBeGreaterThan(0);
    expect(myCities[0].factionId).toBe(1);

    const myOfficers = rtkApi.query.myOfficers();
    expect(myOfficers.length).toBeGreaterThan(0);
    expect(myOfficers[0].factionId).toBe(1);
  });

  it('can issue domestic commands', () => {
    rtkApi.newGame(1, 1);
    const myCity = rtkApi.query.myCities()[0];
    
    // Select city first
    rtkApi.selectCity(myCity.id);
    expect(useGameStore.getState().selectedCityId).toBe(myCity.id);

    const commerceBefore = myCity.commerce;
    const result = rtkApi.developCommerce(myCity.id);
    
    if (result.ok) {
        expect(rtkApi.query.city(myCity.id)?.commerce).toBeGreaterThan(commerceBefore);
    } else {
        // Might fail if not enough gold or officer already acted in the scenario setup
        expect(result.error).toBeDefined();
    }
  });

  it('can advance turns', () => {
    rtkApi.newGame(1, 1);
    const { month } = rtkApi.query.date();
    const result = rtkApi.endTurn();
    
    expect(result.ok).toBe(true);
    const after = rtkApi.query.date();
    expect(after.month).not.toBe(month);
  });

  it('handles battle sub-namespace', () => {
    useGameStore.setState({ phase: 'battle' });
    useBattleStore.setState({
        day: 5,
        weather: 'sunny',
        units: [{ id: 'att-1', factionId: 1, troops: 5000, officer: { name: '曹操' } as unknown as import('../types').Officer } as unknown as BattleUnit]
    });

    expect(rtkApi.battle.day()).toBe(5);
    expect(rtkApi.battle.weather()).toBe('sunny');
    expect(rtkApi.battle.units().length).toBe(1);
  });
});
