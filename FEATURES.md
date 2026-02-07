# sangokushi-web Features

## Implemented Features (Mimicking RTK IV)
- **Basic Engine:** React + Vite + TypeScript + Zustand scaffold.
- **Map:** 43 cities with adjacency graph and SVG strategic map.
- **Officers:** 60+ officers with full stat data.
- **Scenario:** 190年 反董卓聯盟.
- **Commands:** 
    - Internal Affairs (Commerce, Agriculture, Defense).
    - Personnel (Recruit unaffiliated officers).
    - Military (Draft troops).
- **Duel System (Ikki-uchi):** Turn-based 1v1 combat with Attack, Heavy Blow, Defend, and Flee.
- **Diplomacy System:** Hostility tracking, Goodwill (gifts), and Alliances based on Politics stats.
- **Rumor (流言):** Plot command to lower enemy officer loyalty in adjacent cities.
- **Fire Attacks (火計):** Tactical fire attacks in battle, terrain-dependent damage, 3-turn duration. [PR #1](https://github.com/tingyiy/sangokushi-web/pull/1)
- **Spying (間諜):** Infiltrating cities to gather intelligence. [PR #2](https://github.com/tingyiy/sangokushi-web/pull/2)

## Future Enhancements (To Be Implemented)
- **Naval Battles:** Combat on water bodies.
- **Unit Testing:** Integrate a testing framework (e.g., Vitest) and achieve high coverage.
- **Battle Engine:** Full hex-based tactical battle system.
- **Music & Sound:** Faithful recreation of original audio.