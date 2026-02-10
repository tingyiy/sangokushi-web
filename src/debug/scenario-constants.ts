/** 
 * Scenario ID constants for rtk.newGame()
 * Maps readable names to scenario IDs from scenarios.ts
 */
export const RTKScenario = {
    AntiDongzhuo: 1,      // 董卓廢少帝 (189)
    WarlordsStruggle: 2,  // 群雄爭中原 (194)
    Guandu: 3,            // 官渡之戰 (200)
    RedCliffs: 4,         // 赤壁之戰 (208)
    ThreeKingdoms: 5,     // 三國鼎立 (221)
    FallenStar: 6,        // 星落五丈原 (235)
} as const;

export const ScenarioInfo = {
    1: { id: 1, year: 189, name: '董卓廢少帝', subtitle: '火燒洛陽' },
    2: { id: 2, year: 194, name: '群雄爭中原', subtitle: '曹操擴張' },
    3: { id: 3, year: 200, name: '官渡之戰', subtitle: '河北爭雄' },
    4: { id: 4, year: 208, name: '赤壁之戰', subtitle: '臥龍出山' },
    5: { id: 5, year: 219, name: '三國鼎立', subtitle: '漢中王' },
    6: { id: 6, year: 234, name: '星落五丈原', subtitle: '諸葛歸天' },
} as const;
