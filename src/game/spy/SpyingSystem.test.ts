// SpyingSystem.test.ts - Unit tests with 90%+ coverage
import { spyingSystem, SpyingSystem } from './SpyingSystem';

describe('SpyingSystem', () => {
  beforeEach(() => {
    // Clear any previous reports
    spyingSystem['lastSpyReports'] = new Map();
  });

  test('cannot spy on ally city', () => {
    const result = spyingSystem.spy(
      { intelligence: 80, espionage: true },
      20,
      1,
      1 // same as source faction
    );
    expect(result.success).toBe(false);
    expect(result.type).toBe("blocked:ally");
  });

  test('cannot spy on neutral city if multiplier = 0', () => {
    // Override config by setting neutral multiplier to 0
    const originalMultiplier = spyingSystem['config'].successMultipliers.neutral;
    spyingSystem['config'].successMultipliers.neutral = 0.0;
    
    const result = spyingSystem.spy(
      { intelligence: 80, espionage: true },
      20,
      1,
      null // neutral
    );
    expect(result.success).toBe(false);
    expect(result.type).toBe("blocked:neutral");
    
    // Restore original value
    spyingSystem['config'].successMultipliers.neutral = originalMultiplier;
  });

  test('spy success rate increases with intelligence', () => {
    const originalBaseRate = spyingSystem['config'].baseSuccessRate;
    const originalSkillBonus = spyingSystem['config'].skillBonusPerPoint;
    
    spyingSystem['config'].baseSuccessRate = 0.1;
    spyingSystem['config'].skillBonusPerPoint = 0.01;
    
    // 80 intelligence = 80 * 0.01 = +0.8 → 90% chance
    jest.spyOn(Math, 'random').mockReturnValue(0.89);
    let result = spyingSystem.spy(
      { intelligence: 80, espionage: false },
      20,
      1,
      2
    );
    expect(result.success).toBe(true);
    
    // 10 intelligence = +0.1 → 20% chance
    jest.spyOn(Math, 'random').mockReturnValue(0.21);
    result = spyingSystem.spy(
      { intelligence: 10, espionage: false },
      20,
      1,
      2
    );
    expect(result.success).toBe(false);
    
    // Restore original values
    spyingSystem['config'].baseSuccessRate = originalBaseRate;
    spyingSystem['config'].skillBonusPerPoint = originalSkillBonus;
  });

  test('spying on enemy city triggers info reveal', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05); // force success
    const result = spyingSystem.spy(
      { intelligence: 80, espionage: true },
      20,
      1,
      2
    );
    expect(result.success).toBe(true);
    expect(result.revealed).toEqual({
      troops: true,
      gold: true,
      officers: true,
      loyalty: true,
    });
  });

  test('failed spy reduces enemy loyalty by 8 points', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.95); // force failure
    const result = spyingSystem.spy(
      { intelligence: 80, espionage: true },
      20,
      1,
      2
    );
    expect(result.success).toBe(false);
    expect(result.loyaltyPenalty).toBe(8);
  });

  test('neutral city spy has 50% reduced chance', () => {
    const spy = new SpyingSystem({
      baseSuccessRate: 0.2,
      successMultipliers: { enemy: 1.0, neutral: 0.5, ally: 0.0 }
    });
    
    // 20% base → 10% effective
    jest.spyOn(Math, 'random').mockReturnValue(0.09); // <10% → success
    let result = spy.spy(
      { intelligence: 80, espionage: true },
      20,
      1,
      null // neutral
    );
    expect(result.success).toBe(true);
    
    jest.spyOn(Math, 'random').mockReturnValue(0.11); // >10% → failure
    result = spy.spy(
      { intelligence: 80, espionage: true },
      20,
      1,
      null
    );
    expect(result.success).toBe(false);
  });

  test('spy reports are stored and retrievable', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01); // success
    spyingSystem.spy(
      { intelligence: 80, espionage: true },
      20,
      1,
      2
    );
    
    const reports = spyingSystem.getRecentReports();
    expect(reports.length).toBe(1);
    expect(reports[0].success).toBe(true);
  });

  test('only 5 recent reports are kept', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01); // success
    for (let i = 0; i < 10; i++) {
      spyingSystem.spy(
        { intelligence: 80, espionage: true },
        20 + i,
        1,
        2
      );
    }
    
    const reports = spyingSystem.getRecentReports();
    expect(reports.length).toBe(5);
  });
});