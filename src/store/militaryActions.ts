import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { Officer } from '../types';
import type { UnitType } from '../types/battle';
import type { GameState } from './gameStore';
import { useBattleStore } from './battleStore';
import { hasSkill } from '../utils/skills';
import { autoAssignGovernorInPlace, getAttackDirection } from './storeHelpers';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export function createMilitaryActions(set: Set, get: Get): Pick<GameState, 'setBattleFormation' | 'startDuel' | 'initMidBattleDuel' | 'duelAction' | 'endDuel' | 'startBattle' | 'aiStartBattle' | 'retreat' | 'resolveBattle'> {
  return {
    setBattleFormation: (formation) => set({ battleFormation: formation }),

    startDuel: () => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      if (!city) return;

      // Find best player officer in city
      const pOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id);
      if (pOfficers.length === 0) {
        get().addLog(i18next.t('logs:error.noCityOfficers'));
        return;
      }
      const p1 = pOfficers.reduce((prev, current) => (prev.war > current.war ? prev : current));

      // Find random enemy in adjacent cities
      const enemyCityIds = city.adjacentCityIds.filter(id => {
        const neighbor = state.cities.find(c => c.id === id);
        return neighbor && neighbor.factionId && neighbor.factionId !== state.playerFaction?.id;
      });

      if (enemyCityIds.length === 0) {
        get().addLog(i18next.t('logs:error.noEnemyNearby'));
        return;
      }

      const targetCityId = enemyCityIds[Math.floor(Math.random() * enemyCityIds.length)];
      const duelCity = state.cities.find(c => c.id === targetCityId)!;

      const eOfficers = state.officers.filter(o => o.cityId === targetCityId && o.factionId === duelCity.factionId);
      if (eOfficers.length === 0) {
        get().addLog(i18next.t('logs:error.emptyCityDuel', { city: localizedName(duelCity.name) }));
        return;
      }
      const p2 = eOfficers[Math.floor(Math.random() * eOfficers.length)];

      set({
        phase: 'duel',
        duelState: {
          p1,
          p2,
          p1Hp: 100,
          p2Hp: 100,
          round: 1,
          turn: 0,
          logs: [`${p1.name} 向 ${duelCity.name} 的 ${p2.name} 發起了挑戰！`, '戰鬥開始！'],
          result: null,
        }
      });
    },

    initMidBattleDuel: (p1, p2) => {
      set({
        phase: 'duel',
        duelState: {
          p1,
          p2,
          p1Hp: 100,
          p2Hp: 100,
          round: 1,
          turn: 0,
          logs: [`${p1.name} 與 ${p2.name} 展開了生死決鬥！`],
          result: null,
          isBattleDuel: true
        }
      });
    },

    duelAction: (action) => {
      const state = get();
      const ds = state.duelState;
      if (!ds || ds.result) return;

      let p1Dmg = 0;
      let p2Dmg = 0;
      let logMsg = '';
      const logs = [...ds.logs];

      // Player Phase
      if (action === 'flee') {
        set({ duelState: { ...ds, logs: [...logs, `${ds.p1.name} 逃跑了！`], result: 'flee' } });
        return;
      }

      // Hit calculation
      // Base damage = War / 10 + Random(1-10)

      let hitChance = 80 + (ds.p1.war - ds.p2.war);
      let damageMult = 1;

      if (action === 'heavy') {
        hitChance -= 20;
        damageMult = 1.5;
      } else if (action === 'defend') {
        damageMult = 0; // Don't attack
      }

      if (action !== 'defend') {
        const roll = Math.random() * 100;
        if (roll < hitChance) {
          const base = Math.max(1, ds.p1.war / 5);
          const dmg = Math.floor((base + Math.random() * 10) * damageMult);
          p2Dmg = dmg;
          logMsg = `${ds.p1.name} 使用 ${action === 'heavy' ? '大喝' : '攻擊'}，造成了 ${dmg} 點傷害！`;
        } else {
          logMsg = `${ds.p1.name} 的攻擊落空了！`;
        }
      } else {
        logMsg = `${ds.p1.name} 採取了防禦姿態。`;
      }
      logs.push(logMsg);

      const newP2Hp = Math.max(0, ds.p2Hp - p2Dmg);

      if (newP2Hp === 0) {
        set({ duelState: { ...ds, p2Hp: 0, logs: [...logs, `${ds.p2.name} 被擊敗了！`], result: 'win' } });
        return;
      }

      // AI Phase
      const aiAction = ds.p2Hp < 30 ? 'heavy' : 'attack';
      let aiHitChance = 80 + (ds.p2.war - ds.p1.war);
      let aiDamageMult = 1;

      if (aiAction === 'heavy') {
        aiHitChance -= 20;
        aiDamageMult = 1.5;
      }

      // Player defense bonus
      if (action === 'defend') {
        aiDamageMult *= 0.5;
        logs.push(`(防禦生效！傷害減半)`);
      }

      const aiRoll = Math.random() * 100;
      if (aiRoll < aiHitChance) {
        const base = Math.max(1, ds.p2.war / 5);
        const dmg = Math.floor((base + Math.random() * 10) * aiDamageMult);
        p1Dmg = dmg;
        logs.push(`${ds.p2.name} 還擊！造成了 ${dmg} 點傷害！`);
      } else {
        logs.push(`${ds.p2.name} 的攻擊被閃避了！`);
      }

      const newP1Hp = Math.max(0, ds.p1Hp - p1Dmg);

      if (newP1Hp === 0) {
        set({ duelState: { ...ds, p1Hp: 0, p2Hp: newP2Hp, logs: [...logs, `${ds.p1.name} 落馬了...`], result: 'lose' } });
        return;
      }

      set({
        duelState: {
          ...ds,
          p1Hp: newP1Hp,
          p2Hp: newP2Hp,
          logs: logs,
          round: ds.round + 1,
        }
      });
    },

    endDuel: () => {
      const state = get();
      const ds = state.duelState;
      if (ds && ds.isBattleDuel) {
        if (ds.result === 'win') {
          useBattleStore.getState().applyDuelResults(ds.p1.id, ds.p2.id);
        } else if (ds.result === 'lose') {
          useBattleStore.getState().applyDuelResults(ds.p2.id, ds.p1.id);
        }
        set({ phase: 'battle', duelState: null });
      } else {
        set({ phase: 'playing', duelState: null });
      }
    },

    startBattle: (targetCityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === state.selectedCityId);
      const targetCity = state.cities.find(c => c.id === targetCityId);
      if (!city || !targetCity || !state.playerFaction) return;

      let attackerOfficers: Officer[] = [];
      let attackerUnitTypes: UnitType[] = [];

      if (state.battleFormation) {
        attackerOfficers = state.battleFormation.officerIds.map(id => state.officers.find(o => o.id === id)!).filter(Boolean);
        attackerUnitTypes = state.battleFormation.unitTypes || attackerOfficers.map(() => 'infantry' as UnitType);
      } else {
        // Default fallback if no formation set (infantry)
        attackerOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === state.playerFaction?.id).slice(0, 5);
        attackerUnitTypes = attackerOfficers.map(() => 'infantry' as UnitType);
      }

      if (attackerOfficers.length === 0) {
        get().addLog(i18next.t('logs:error.noCommanders'));
        return;
      }

      // Calculate actual troop allocation per officer (based on city garrison, capped by leadership)
      // If the player specified troops in the formation, use those (still capped by leadership)
      const playerTroops = state.battleFormation?.troops;
      const troopsPerOfficer = attackerOfficers.map((off, i) => {
        const maxForOfficer = off.leadership * 100; // RTK IV: leadership determines max troops
        if (playerTroops && playerTroops[i] !== undefined) {
          return Math.min(playerTroops[i], maxForOfficer, city.troops);
        }
        const equalShare = Math.floor(city.troops / attackerOfficers.length);
        return Math.min(equalShare, maxForOfficer);
      });
      const totalTroopsToDeploy = troopsPerOfficer.reduce((sum, t) => sum + t, 0);
      if (totalTroopsToDeploy <= 0) {
        get().addLog(i18next.t('logs:error.insufficientTroopsBasic', { troops: city.troops }));
        return;
      }
      if (totalTroopsToDeploy > city.troops) {
        get().addLog(i18next.t('logs:error.insufficientTroopsRequired', { required: totalTroopsToDeploy, troops: city.troops }));
        return;
      }

      // Check commander availability (highest leadership officer)
      const commander = attackerOfficers.reduce((prev, curr) => (prev.leadership > curr.leadership ? prev : curr));
      if (commander.acted) {
        get().addLog(i18next.t('logs:error.commanderStamina', { name: localizedName(commander.name) }));
        return;
      }

      // Deduct weapons from city based on formation
      let crossbowsUsed = 0;
      let warHorsesUsed = 0;
      attackerUnitTypes.forEach(type => {
        if (type === 'archer') crossbowsUsed += 1000; // Assume 1000 per unit for now
        if (type === 'cavalry') warHorsesUsed += 1000;
      });

      if (city.crossbows < crossbowsUsed || city.warHorses < warHorsesUsed) {
        const shortages: string[] = [];
        if (city.crossbows < crossbowsUsed) shortages.push(`弩 需 ${crossbowsUsed}（現有 ${city.crossbows}）`);
        if (city.warHorses < warHorsesUsed) shortages.push(`軍馬 需 ${warHorsesUsed}（現有 ${city.warHorses}）`);
        get().addLog(i18next.t('logs:error.weaponShortage', { details: shortages.join(i18next.t('logs:common.comma')) }));
        return;
      }

      const defenderOfficers = state.officers.filter(o => o.cityId === targetCityId && o.factionId === targetCity.factionId).slice(0, 5);

      // ── Auto-capture undefended city ──
      // If the target city has NO defending officers, skip the battle and capture it directly.
      if (defenderOfficers.length === 0) {
        set({
          cities: state.cities.map(c => {
            if (c.id === city.id) return {
              ...c,
              troops: c.troops - totalTroopsToDeploy,
              crossbows: c.crossbows - crossbowsUsed,
              warHorses: c.warHorses - warHorsesUsed
            };
            if (c.id === targetCityId) return {
              ...c,
              factionId: state.playerFaction!.id,
              troops: totalTroopsToDeploy, // Garrison the conquering army
            };
            return c;
          }),
          officers: state.officers.map(o =>
            attackerOfficers.some(ao => ao.id === o.id)
              ? { ...o, acted: true, cityId: targetCityId, isGovernor: false }
              : o
          ),
          battleFormation: null,
        });
        // Make the first attacker officer the new governor
        set(s => ({
          officers: s.officers.map(o =>
            o.id === attackerOfficers[0].id ? { ...o, isGovernor: true } : o
          )
        }));
        // Auto-assign governor for the source city if the governor left
        {
          const officers = get().officers.slice();
          const promoted = autoAssignGovernorInPlace(officers, city.id, state.playerFaction!.id);
          if (promoted) set({ officers });
        }
        get().addLog(i18next.t('logs:military.captureEmptyCity', { city: localizedName(targetCity.name), commander: localizedName(commander.name) }));
        // Check if the losing faction has no more cities
        const loserFactionId = targetCity.factionId || 0;
        const remainingCities = get().cities.filter(c => c.factionId === loserFactionId);
        if (remainingCities.length === 0) {
          const loserFaction = state.factions.find(f => f.id === loserFactionId);
          get().addLog(i18next.t('logs:military.factionDestroyed', { faction: localizedName(loserFaction?.name ?? '') }));
        }
        return;
      }

      const defenderTroopsPerOfficer = defenderOfficers.map(off => {
        const maxForOfficer = off.leadership * 100;
        const equalShare = Math.floor(targetCity.troops / Math.max(1, defenderOfficers.length));
        return Math.min(equalShare, maxForOfficer);
      });
      const defenderTroopsDeployed = defenderTroopsPerOfficer.reduce((sum, t) => sum + t, 0);

      set({
        cities: state.cities.map(c => {
          if (c.id === city.id) return {
            ...c,
            troops: c.troops - totalTroopsToDeploy,
            crossbows: c.crossbows - crossbowsUsed,
            warHorses: c.warHorses - warHorsesUsed
          };
          if (c.id === targetCityId) return { ...c, troops: Math.max(0, c.troops - defenderTroopsDeployed) };
          return c;
        }),
        officers: state.officers.map(o =>
          attackerOfficers.some(ao => ao.id === o.id)
            ? { ...o, acted: true }
            : o
        ),
        battleFormation: null, // Clear after use
        battleResolved: false,
      });

      // Phase 1.2: Pass city morale and training to battle
      useBattleStore.getState().initBattle(
        state.playerFaction.id,
        targetCity.factionId || 0,
        targetCityId,
        attackerOfficers,
        defenderOfficers,
        city.morale,
        targetCity.morale,
        city.training,
        attackerUnitTypes,
        undefined, // defenderUnitTypes (auto-picked)
        troopsPerOfficer,
        defenderTroopsPerOfficer,
        undefined, // playerFactionId (defaults to attackerId)
        getAttackDirection(city, targetCity)
      );

      set({ phase: 'battle' });
      get().addLog(i18next.t('logs:military.marchToCity', { city: localizedName(targetCity.name) }));
    },

    aiStartBattle: (fromCityId: number, targetCityId: number) => {
      const state = get();
      const city = state.cities.find(c => c.id === fromCityId);
      const targetCity = state.cities.find(c => c.id === targetCityId);
      if (!city || !targetCity) return;

      const availableOfficers = state.officers.filter(o => o.cityId === city.id && o.factionId === city.factionId).sort((a, b) => b.leadership - a.leadership);
      if (availableOfficers.length === 0) return;

      const attackerOfficers = availableOfficers.slice(0, 5);

      // Select unit types based on officer skills and available resources
      let crossbowsAvailable = city.crossbows;
      let warHorsesAvailable = city.warHorses;
      const attackerUnitTypes: UnitType[] = attackerOfficers.map(o => {
        if (hasSkill(o, 'cavalry') && warHorsesAvailable >= 1000) {
          warHorsesAvailable -= 1000;
          return 'cavalry';
        }
        if (hasSkill(o, 'archery') && crossbowsAvailable >= 1000) {
          crossbowsAvailable -= 1000;
          return 'archer';
        }
        return 'infantry';
      });
      const crossbowsUsed = city.crossbows - crossbowsAvailable;
      const warHorsesUsed = city.warHorses - warHorsesAvailable;

      // Calculate actual troop allocation per officer
      const troopsPerOfficer = attackerOfficers.map(off => {
        const maxForOfficer = off.leadership * 100;
        const equalShare = Math.floor(city.troops / attackerOfficers.length);
        return Math.min(equalShare, maxForOfficer);
      });
      const totalTroopsToDeploy = troopsPerOfficer.reduce((sum, t) => sum + t, 0);
      const defenderOfficers = state.officers.filter(o => o.cityId === targetCityId && o.factionId === targetCity.factionId).slice(0, 5);
      const defenderTroopsPerOfficer = defenderOfficers.map(off => {
        const maxForOfficer = off.leadership * 100;
        const equalShare = Math.floor(targetCity.troops / Math.max(1, defenderOfficers.length));
        return Math.min(equalShare, maxForOfficer);
      });
      const defenderTroopsDeployed = defenderTroopsPerOfficer.reduce((sum, t) => sum + t, 0);

      set({
        cities: state.cities.map(c => {
          if (c.id === city.id) return {
            ...c,
            troops: Math.max(0, c.troops - totalTroopsToDeploy),
            crossbows: c.crossbows - crossbowsUsed,
            warHorses: c.warHorses - warHorsesUsed
          };
          if (c.id === targetCityId) return { ...c, troops: Math.max(0, c.troops - defenderTroopsDeployed) };
          return c;
        }),
        officers: state.officers.map(o =>
          attackerOfficers.some(ao => ao.id === o.id)
            ? { ...o, acted: true }
            : o
        ),
        battleResolved: false,
      });

      // AI vs AI: Auto-resolve to avoid state corruption during endTurn (C1)
      if (targetCity.factionId !== state.playerFaction?.id) {
        const attackerPower = attackerOfficers.reduce((s, o) => s + o.leadership + o.war, 0) + (totalTroopsToDeploy / 100);
        const defenderPower = defenderOfficers.reduce((s, o) => s + o.leadership + o.war, 0) + (defenderTroopsDeployed / 100);

        const winnerFactionId = attackerPower > defenderPower ? (city.factionId || 0) : (targetCity.factionId || 0);
        const loserFactionId = winnerFactionId === (city.factionId || 0) ? (targetCity.factionId || 0) : (city.factionId || 0);

        get().addLog(attackerPower > defenderPower ? i18next.t('logs:military.aiBattleWin', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }) : i18next.t('logs:military.aiBattleLose', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }));

        get().resolveBattle(
          winnerFactionId,
          loserFactionId,
          targetCityId,
          [
            ...attackerOfficers.map(o => ({ officerId: o.id, troops: attackerPower > defenderPower ? 2000 : 0, factionId: city.factionId || 0, status: 'active' })),
            ...defenderOfficers.map(o => ({ officerId: o.id, troops: attackerPower > defenderPower ? 0 : 2000, factionId: targetCity.factionId || 0, status: 'active' }))
          ]
        );
        return;
      }

      // AI vs Player: Switch to battle phase
      if (state.phase === 'battle') {
        get().addLog(i18next.t('logs:military.aiBattleFull', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), city: localizedName(targetCity.name) }));
        return;
      }

      useBattleStore.getState().initBattle(
        city.factionId || 0,
        targetCity.factionId || 0,
        targetCityId,
        attackerOfficers,
        defenderOfficers,
        city.morale,
        targetCity.morale,
        city.training,
        attackerUnitTypes,
        undefined, // defenderUnitTypes
        troopsPerOfficer,
        defenderTroopsPerOfficer,
        state.playerFaction?.id ?? targetCity.factionId ?? 0,
        getAttackDirection(city, targetCity)
      );

      set({ phase: 'battle' });
      get().addLog(i18next.t('logs:military.aiMarch', { faction: localizedName(state.factions.find(f => f.id === city.factionId)?.name ?? ''), from: localizedName(city.name), to: localizedName(targetCity.name) }));
    },

    retreat: () => {
      const state = get();
      if (state.phase !== 'battle') return;

      const battle = useBattleStore.getState();
      // The player is retreating, so the OTHER faction wins
      const loserFactionId = battle.playerFactionId;
      const winnerFactionId = loserFactionId === battle.attackerId ? battle.defenderId : battle.attackerId;

      get().addLog(i18next.t('logs:game.retreat'));

      get().resolveBattle(
        winnerFactionId,
        loserFactionId,
        battle.defenderCityId,
        battle.units.map(u => ({
          officerId: u.officerId,
          troops: u.troops,
          factionId: u.factionId,
          status: 'routed'
        }))
      );

      set({ phase: 'playing' });
    },

    resolveBattle: (winnerFactionId, loserFactionId, cityId, battleUnits, capturedOfficerIds = []) => {
      const state = get();
      // Guard against double-firing (H8)
      if (state.battleResolved) return;

      const city = state.cities.find(c => c.id === cityId);
      if (!city) return;

      // Get surviving units for winner
      const winnerUnits = battleUnits.filter(u => u.factionId === winnerFactionId && u.troops > 0 && u.status !== 'routed');

      // Calculate surviving troops
      const totalSurvivingTroops = winnerUnits.reduce((sum, u) => sum + u.troops, 0);

      // Get participating officer IDs from battle
      const participatingOfficerIds = new Set(battleUnits.map(u => u.officerId));
      const capturedSet = new Set(capturedOfficerIds);

      // ── RTK IV Flee Logic ──
      // Determine the flee destination for the losing faction ONCE (all officers go to the same city).
      // Priority: adjacent friendly > adjacent unoccupied (claim) > nowhere (captured)
      // RTK IV only allows flee to directly connected (adjacent) cities.
      const adjacentFriendly = state.cities.filter(
        c => c.factionId === loserFactionId && c.id !== cityId && city.adjacentCityIds.includes(c.id)
      );
      const adjacentUnoccupied = state.cities.filter(
        c => c.factionId === null && city.adjacentCityIds.includes(c.id)
      );

      let fleeCity: typeof city | null = null;
      let claimingUnoccupied = false;

      if (adjacentFriendly.length > 0) {
        fleeCity = adjacentFriendly[Math.floor(Math.random() * adjacentFriendly.length)];
      } else if (adjacentUnoccupied.length > 0) {
        fleeCity = adjacentUnoccupied[Math.floor(Math.random() * adjacentUnoccupied.length)];
        claimingUnoccupied = true;
      }
      // If fleeCity is still null, nowhere to flee → all non-captured officers are captured

      // Process officer outcomes
      const winnerOfficerIds = new Set(
        battleUnits.filter(u => u.factionId === winnerFactionId).map(u => u.officerId)
      );

      const updatedOfficers = state.officers.map(o => {
        // If officer was captured during battle (in battleStore) AND belongs to the losing faction
        if (capturedSet.has(o.id) && o.factionId === loserFactionId) {
          get().addLog(i18next.t('logs:postBattle.captured', { name: localizedName(o.name) }));
          // Hold as POW at the battle city (will be processed by winner)
          return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
        }

        // If officer belongs to the losing faction and was in the battle city
        if (o.cityId === cityId && o.factionId === loserFactionId) {
          if (participatingOfficerIds.has(o.id)) {
            const unit = battleUnits.find(u => u.officerId === o.id);
            if (unit && (unit.troops <= 0 || unit.status === 'routed')) {
              // Officer's unit was destroyed or routed — try to flee
              if (fleeCity) {
                get().addLog(i18next.t('logs:postBattle.fleeToCity', { name: localizedName(o.name), city: localizedName(fleeCity.name) }));
                return { ...o, cityId: fleeCity.id, isGovernor: false };
              } else {
                // Nowhere to flee — captured
                get().addLog(i18next.t('logs:postBattle.nowhereToFlee', { name: localizedName(o.name) }));
                return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
              }
            }
          } else {
            // Officer was in city but didn't participate in battle
            if (Math.random() < 0.3) {
              // 30% chance to escape
              if (fleeCity) {
                get().addLog(i18next.t('logs:postBattle.abandonCity', { name: localizedName(o.name), city: localizedName(fleeCity.name) }));
                return { ...o, cityId: fleeCity.id, isGovernor: false };
              } else {
                get().addLog(i18next.t('logs:postBattle.abandonNoFlee', { name: localizedName(o.name) }));
                return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
              }
            } else {
              get().addLog(i18next.t('logs:postBattle.capturedSimple', { name: localizedName(o.name) }));
              return { ...o, factionId: -1 as unknown as number, cityId: cityId, isGovernor: false };
            }
          }
        }

        // Winning attacker officers: relocate to the conquered city
        if (winnerOfficerIds.has(o.id) && city.factionId !== winnerFactionId) {
          return { ...o, cityId: cityId, isGovernor: false };
        }

        return o;
      });

      // Make the first winning officer the governor of the conquered city
      if (city.factionId !== winnerFactionId) {
        const firstWinnerOfficerId = battleUnits.find(u => u.factionId === winnerFactionId)?.officerId;
        if (firstWinnerOfficerId) {
          const idx = updatedOfficers.findIndex(o => o.id === firstWinnerOfficerId);
          if (idx >= 0) {
            updatedOfficers[idx] = { ...updatedOfficers[idx], isGovernor: true };
          }
        }
      }

      // Transfer city ownership or update garrison
      const updatedCities = state.cities.map(c => {
        if (c.id === cityId) {
          if (c.factionId === winnerFactionId) {
            // Defender won - add surviving defending units back to garrison
            const defenderSurviving = battleUnits.filter(u => u.factionId === winnerFactionId && u.troops > 0).reduce((s, u) => s + u.troops, 0);
            return {
              ...c,
              troops: c.troops + Math.floor(defenderSurviving * 0.9),
            };
          } else {
            // Attacker won - replace garrison with winning surviving troops
            return {
              ...c,
              factionId: winnerFactionId,
              troops: Math.floor(totalSurvivingTroops * 0.8),
            };
          }
        }
        // Claim unoccupied city for the fleeing faction
        if (claimingUnoccupied && fleeCity && c.id === fleeCity.id) {
          return { ...c, factionId: loserFactionId };
        }
        return c;
      });

      // Update faction relations - increase hostility significantly
      let updatedFactions = state.factions.map(f => {
        if (f.id === winnerFactionId) {
          const currentHostility = f.relations[loserFactionId] ?? 60;
          return {
            ...f,
            relations: { ...f.relations, [loserFactionId]: Math.min(100, currentHostility + 20) }
          };
        }
        if (f.id === loserFactionId) {
          const currentHostility = f.relations[winnerFactionId] ?? 60;
          return {
            ...f,
            relations: { ...f.relations, [winnerFactionId]: Math.min(100, currentHostility + 20) }
          };
        }
        return f;
      });

      // ── Ruler Succession ──
      // If the losing faction's ruler was captured, the faction needs a new ruler.
      // If no officers remain in the faction, the faction is destroyed.
      const loserFaction = updatedFactions.find(f => f.id === loserFactionId);
      if (loserFaction) {
        const rulerCaptured = updatedOfficers.find(o => o.id === loserFaction.rulerId && o.factionId === -1);
        if (rulerCaptured) {
          const remainingOfficers = updatedOfficers.filter(o => o.factionId === loserFactionId);
          if (remainingOfficers.length > 0) {
            // Pick successor: highest rank, then highest leadership + charisma
            const rankOrder: Record<string, number> = { 'governor': 6, 'viceroy': 5, 'general': 4, 'advisor': 3, 'attendant': 2, 'common': 1 };
            const successor = remainingOfficers.reduce((prev, curr) => {
              const prevScore = (rankOrder[prev.rank] || 0) * 1000 + prev.leadership + prev.charisma;
              const currScore = (rankOrder[curr.rank] || 0) * 1000 + curr.leadership + curr.charisma;
              return currScore > prevScore ? curr : prev;
            });
            updatedFactions = updatedFactions.map(f =>
              f.id === loserFactionId ? { ...f, rulerId: successor.id } : f
            );
            get().addLog(i18next.t('logs:postBattle.rulerCaptured', { ruler: localizedName(rulerCaptured.name), successor: localizedName(successor.name) }));
          } else {
            // No officers left — faction is destroyed
            updatedFactions = updatedFactions.filter(f => f.id !== loserFactionId);
            get().addLog(i18next.t('logs:postBattle.factionDestroyed', { faction: localizedName(loserFaction.name) }));
          }
        }
      }

      // Auto-assign governors for any cities left without one (both factions)
      const affectedFactionIds = new Set([winnerFactionId, loserFactionId]);
      for (const fid of affectedFactionIds) {
        const factionCities = updatedCities.filter(c => c.factionId === fid);
        for (const fc of factionCities) {
          autoAssignGovernorInPlace(updatedOfficers, fc.id, fid);
        }
      }

      set({ cities: updatedCities, officers: updatedOfficers, factions: updatedFactions, battleResolved: true });

      const winnerFaction = state.factions.find(f => f.id === winnerFactionId);
      get().addLog(i18next.t('logs:postBattle.cityFallen', { city: localizedName(city.name), faction: localizedName(winnerFaction?.name ?? ''), troops: Math.floor(totalSurvivingTroops * 0.8) }));
    },
  };
}
