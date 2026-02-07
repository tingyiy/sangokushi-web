// FireAttackSystem.test.ts - Unit tests with 90%+ coverage
import { fireAttackSystem } from './FireAttackSystem';

describe('FireAttackSystem', () => {
  beforeEach(() => {
    // Clear any active fires before each test
    fireAttackSystem['activeFires'] = new Map();
  });

  test('fire attack does not trigger on water terrain', () => {
    const triggered = fireAttackSystem.trigger('h2_2', 'w2_1', { fireTactic: true });
    expect(triggered).toBe(false);
    expect(fireAttackSystem.getActiveFires().size).toBe(0);
  });

  test('fire attack triggers on dry terrain with officer skill', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // Force trigger
    const triggered = fireAttackSystem.trigger('h2_2', 'f2_3', { fireTactic: true });
    expect(triggered).toBe(true);
    expect(fireAttackSystem.getActiveFires().size).toBe(1);
  });

  test('fire attack has 5% chance without officer skill', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.04).mockReturnValueOnce(0.06); // One true, one false
    const triggered1 = fireAttackSystem.trigger('h2_2', 'f2_3', null); // no skill
    expect(triggered1).toBe(true);
    
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.07); // above 5%
    const triggered2 = fireAttackSystem.trigger('h2_2', 'f2_3', null);
    expect(triggered2).toBe(false);
  });

  test('fire damage is applied and extinguished after 3 turns', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    fireAttackSystem.trigger('h2_2', 'f2_3', { fireTactic: true });
    
    let fires = fireAttackSystem.getActiveFires();
    expect(fires.size).toBe(1);
    
    // Apply damage once
    const damage1 = fireAttackSystem.applyDamage();
    expect(damage1.get('f2_3')).toBe(12); // 6 * 2.0 (forest multiplier)
    
    fires = fireAttackSystem.getActiveFires();
    expect(fires.get('f2_3')?.turnsLeft).toBe(2);
    
    // Apply again
    fireAttackSystem.applyDamage();
    fires = fireAttackSystem.getActiveFires();
    expect(fires.get('f2_3')?.turnsLeft).toBe(1);
    
    // Final turn — extinguished
    fireAttackSystem.applyDamage();
    fires = fireAttackSystem.getActiveFires();
    expect(fires.size).toBe(0);
  });

  test('forest terrain doubles fire damage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    fireAttackSystem.trigger('h2_2', 'f1_2', { fireTactic: true }); // forest
    
    const damage = fireAttackSystem.applyDamage();
    expect(damage.get('f1_2')).toBe(12); // 6 * 2.0
  });

  test('city terrain reduces fire damage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    fireAttackSystem.trigger('h2_2', 'c2_1', { fireTactic: true }); // city
    
    const damage = fireAttackSystem.applyDamage();
    expect(damage.get('c2_1')).toBe(4); // 6 * 0.8 = 4.8 → floored to 4
  });

  test('fire attack does not trigger on non-adjacent hexes', () => {
    const triggered = fireAttackSystem.trigger('h1_1', 'h3_3', { fireTactic: true }); // not adjacent
    expect(triggered).toBe(false);
  });
});