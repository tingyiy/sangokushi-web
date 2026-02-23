import { create } from 'zustand';
import i18next from 'i18next';
import { localizedName } from '../i18n/dataNames';
import type { BattleState, BattleUnit, BattleMode, UnitType, TerrainType, BattleTerrainType } from '../types/battle';
import type { Officer } from '../types';
import {
  getMovementRange,
  getAttackRange,
  getAttackModifier,
  getDefenseModifier,
  calculateTacticSuccess,
  type BattleTactic
} from '../utils/unitTypes';
import {
  generateSiegeMap,
  generateFieldBattleMap,
  isSiegeBattle,
  getGatePositions
} from '../utils/siegeMap';
import { getDistance } from '../utils/hex';
import { hasSkill } from '../utils/skills';
import { getMoveRange } from '../utils/pathfinding';
import { cityBaseStats } from '../data/cities';
import { useGameStore } from './gameStore';

interface BattleActions {
  initBattle: (
    attackerId: number,
    defenderId: number,
    defenderCityId: number,
    attackerOfficers: Officer[],
    defenderOfficers: Officer[],
    attackerMorale?: number,
    defenderMorale?: number,
    attackerTraining?: number,
    attackerUnitTypes?: UnitType[],
    defenderUnitTypes?: UnitType[],
    attackerTroops?: number[],
    defenderTroops?: number[],
    playerFactionId?: number,
    attackDirection?: 'north' | 'south' | 'east' | 'west',
    attackerFood?: number,
    defenderFood?: number,
    defenderTraining?: number,
    battleTerrain?: BattleTerrainType,
  ) => void;
  selectUnit: (unitId: string | null) => void;
  setMode: (mode: BattleMode) => void;
  moveUnit: (unitId: string, q: number, r: number) => void;
  attackUnit: (attackerUnitId: string, targetUnitId: string) => void;
  attackGate: (attackerUnitId: string, gateQ: number, gateR: number) => void;
  executeTactic: (unitId: string, tactic: BattleTactic, targetId?: string, targetHex?: { q: number, r: number }) => void;
  applyDuelResults: (winnerOfficerId: number, loserOfficerId: number) => void;
  endUnitTurn: (unitId: string) => void;
  endPlayerPhase: () => void;
  /** Process one enemy unit. Returns true if more enemy units remain. */
  stepEnemyPhase: () => boolean;
  runEnemyTurn: () => void;
  nextDay: () => void;
  /** Resume battle after month transition: reset day to 1, resupply defender food */
  resumeBattle: (defenderFoodResupply: number) => void;
  checkBattleEnd: () => void;
  addBattleLog: (msg: string) => void;
  inspectUnit: (unitId: string | null) => void;
  triggerBetrayal: (unitId: string) => void;
}

const DEFAULT_MAP_WIDTH = 21;
const DEFAULT_MAP_HEIGHT = 21;

export const useBattleStore = create<BattleState & BattleActions>((set, get) => ({
  units: [],
  turn: 1,
  day: 1,
  weather: 'sunny',
  windDirection: 0,
  activeUnitId: null,
  attackerId: 0,
  defenderId: 0,
  defenderCityId: 0,
  isFinished: false,
  battlePaused: false,
  winnerFactionId: null,
  battleMap: generateFieldBattleMap(DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT),
  isSiege: false,
  gates: [],
  fireHexes: [],
  mode: 'idle',
  selectedTactic: null,
  capturedOfficerIds: [],
  routedOfficerIds: [],
  battleLog: [],
  inspectedUnitId: null,
  turnPhase: 'player',
  playerFactionId: 0,
  defenseCoefficient: 1.0,
  attackerFood: 0,
  defenderFood: 0,
  attackerStarveDays: 0,
  defenderStarveDays: 0,
  moleOfficerIds: [],

  addBattleLog: (msg) => set(s => ({ battleLog: [...s.battleLog.slice(-49), msg] })),

  inspectUnit: (unitId) => set({ inspectedUnitId: unitId }),

  triggerBetrayal: (unitId: string) => {
    const state = get();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;
    if (!state.moleOfficerIds.includes(unit.officerId)) return;

    // Switch unit factionId to attacker
    const updatedUnits = state.units.map(u => {
      if (u.id === unitId) {
        return { ...u, factionId: state.attackerId };
      }
      // All active defender units lose 15 morale
      if (u.factionId === state.defenderId && u.status === 'active') {
        const newMorale = Math.max(0, u.morale - 15);
        return { ...u, morale: newMorale, status: newMorale < 20 ? 'routed' as const : u.status };
      }
      return u;
    });

    set({
      units: updatedUnits,
      moleOfficerIds: state.moleOfficerIds.filter(id => id !== unit.officerId),
    });

    // Clear moleForFactionId on the game store officer
    useGameStore.setState(gs => ({
      officers: gs.officers.map(o =>
        o.id === unit.officerId ? { ...o, moleForFactionId: null } : o
      ),
    }));

    get().addBattleLog(i18next.t('logs:battle.moleBetrayal', {
      officer: localizedName(unit.officer.name),
      troops: unit.troops,
    }));
    get().addBattleLog(i18next.t('logs:battle.moleMoraleDrop'));

    // Check if battle ends after betrayal
    get().checkBattleEnd();
  },

  setMode: (mode) => set({ mode, selectedTactic: mode === 'tactic' ? get().selectedTactic : null }),

  initBattle: (
    attackerId,
    defenderId,
    defenderCityId,
    attackerOfficers,
    defenderOfficers,
    attackerMorale = 60,
    defenderMorale = 60,
    attackerTraining = 40,
    attackerUnitTypes = [],
    defenderUnitTypes = [],
    attackerTroops = [],
    defenderTroops = [],
    playerFactionId = attackerId,
    attackDirection = 'west',
    attackerFood = 0,
    defenderFood = 0,
    defenderTraining = 60,
    battleTerrain = 'plains' as BattleTerrainType,
  ) => {
    const units: BattleUnit[] = [];
    const isSiege = isSiegeBattle(defenderCityId);
    const width = DEFAULT_MAP_WIDTH;
    const height = DEFAULT_MAP_HEIGHT;

    const battleMap = isSiege
      ? generateSiegeMap(width, height, battleTerrain)
      : generateFieldBattleMap(width, height, battleTerrain);

    const gates = isSiege ? getGatePositions(battleMap).map(g => ({ ...g, hp: 3000, maxHp: 3000 })) : [];

    // Compute attacker/defender spawn positions based on attack direction
    // Attack direction = which edge the attacker enters from
    const getSpawnPositions = (side: 'north' | 'south' | 'east' | 'west', count: number, isDefenderSiege: boolean) => {
      const positions: { x: number; y: number }[] = [];
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);

      if (isDefenderSiege) {
        // Defenders go inside the walls (wall margin = 3)
        const wallL = 3 + 1 + 1; // DEFAULT_WALL_MARGIN + 1 (wall) + 1 (inside)
        const wallR = width - 3 - 2 - 1;
        const cx = Math.floor((wallL + wallR) / 2);
        const cy = centerY;
        const offsets = [
          { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 },
          { x: 0, y: -1 }, { x: 0, y: 1 },
        ];
        for (let i = 0; i < count; i++) {
          const o = offsets[i] || offsets[0];
          positions.push({ x: cx + o.x, y: cy + o.y });
        }
        return positions;
      }

      // For attackers (any map) or field-battle defenders: place along an edge
      for (let i = 0; i < count; i++) {
        const spread = i - Math.floor(count / 2); // center the group
        switch (side) {
          case 'west':
            positions.push({ x: 1, y: Math.max(1, Math.min(height - 2, centerY + spread * 2)) });
            break;
          case 'east':
            positions.push({ x: width - 2, y: Math.max(1, Math.min(height - 2, centerY + spread * 2)) });
            break;
          case 'north':
            positions.push({ x: Math.max(1, Math.min(width - 2, centerX + spread * 2)), y: 1 });
            break;
          case 'south':
            positions.push({ x: Math.max(1, Math.min(width - 2, centerX + spread * 2)), y: height - 2 });
            break;
        }
      }
      return positions;
    };

    const oppositeDir: Record<string, 'north' | 'south' | 'east' | 'west'> = {
      north: 'south', south: 'north', east: 'west', west: 'east'
    };

    const attackerSpawns = getSpawnPositions(attackDirection, attackerOfficers.length, false);
    const defenderSpawns = isSiege
      ? getSpawnPositions(attackDirection, defenderOfficers.length, true)
      : getSpawnPositions(oppositeDir[attackDirection], defenderOfficers.length, false);

    // Attacker units
    attackerOfficers.forEach((off, i) => {
      const unitType = attackerUnitTypes[i] || 'infantry';
      const troops = attackerTroops[i] ?? 5000;
      const spawn = attackerSpawns[i] || attackerSpawns[0];
      units.push({
        id: `attacker-${off.id}`,
        officerId: off.id,
        officer: off,
        factionId: attackerId,
        troops,
        maxTroops: troops,
        morale: attackerMorale,
        training: attackerTraining,
        x: spawn.x,
        y: spawn.y,
        z: -spawn.x - spawn.y,
        type: unitType,
        status: 'active',
        direction: 0,
        hasMoved: false,
        arrivalDay: 1,
      });
    });

    // Defender units
    defenderOfficers.forEach((off, i) => {
      const unitType = defenderUnitTypes[i] || 'infantry';
      const troops = defenderTroops[i] ?? 5000;
      const spawn = defenderSpawns[i] || defenderSpawns[0];
      units.push({
        id: `defender-${off.id}`,
        officerId: off.id,
        officer: off,
        factionId: defenderId,
        troops,
        maxTroops: troops,
        morale: defenderMorale,
        training: defenderTraining,
        x: spawn.x,
        y: spawn.y,
        z: -spawn.x - spawn.y,
        type: unitType,
        status: 'active',
        direction: isSiege ? 0 : 3,
        hasMoved: false,
        arrivalDay: 1,
      });
    });

    // Select the first player unit as active (not enemy unit)
    const firstPlayerUnit = units.find(u => u.factionId === playerFactionId);

    // Scan defender officers for moles (moleForFactionId === attackerId)
    const moleOfficerIds = defenderOfficers
      .filter(o => o.moleForFactionId === attackerId)
      .map(o => o.id);

    set({
      units,
      attackerId,
      defenderId,
      defenderCityId,
      turn: 1,
      day: 1,
      isFinished: false,
      battlePaused: false,
      winnerFactionId: null,
      activeUnitId: firstPlayerUnit?.id || null,
      battleMap,
      isSiege,
      gates,
      fireHexes: [],
      capturedOfficerIds: [],
      routedOfficerIds: [],
      weather: 'sunny',
      windDirection: Math.floor(Math.random() * 6),
      mode: 'idle',
      selectedTactic: null,
      battleLog: [],
      inspectedUnitId: null,
      turnPhase: 'player',
      playerFactionId,
      defenseCoefficient: cityBaseStats[defenderCityId]?.defenseCoefficient ?? 1.0,
      attackerFood,
      defenderFood,
      attackerStarveDays: 0,
      defenderStarveDays: 0,
      moleOfficerIds,
    });

    // Check if battle should end immediately (e.g. all defenders have 0 troops)
    get().checkBattleEnd();
  },

  /** Player clicks a friendly unit to make it the active (selected) unit */
  selectUnit: (unitId) => set({ activeUnitId: unitId, mode: 'idle' }),

  moveUnit: (unitId, q, r) => {
    const state = get();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;
    if (unit.status !== 'active') return;
    if (unit.hasMoved) return;

    if (q < 0 || q >= state.battleMap.width || r < 0 || r >= state.battleMap.height) return;
    // Cannot stop on any occupied hex (friend or foe)
    if (state.units.some(u => u.id !== unitId && u.x === q && u.y === r && u.troops > 0)) return;

    // Enemy units block the path entirely; friendly units are passable but not destinations
    const blocked = new Set(
      state.units.filter(u => u.troops > 0 && u.id !== unitId && u.factionId !== unit.factionId)
        .map(u => `${u.x},${u.y}`)
    );
    // Gates only block the attacker faction; defenders pass through their own gates freely
    const isDefender = unit.factionId === state.defenderId;
    if (!isDefender) {
      state.gates.filter(g => g.hp > 0).forEach(g => blocked.add(`${g.q},${g.r}`));
    }
    const occupied = new Set(
      state.units.filter(u => u.troops > 0 && u.id !== unitId && u.factionId === unit.factionId)
        .map(u => `${u.x},${u.y}`)
    );

    // For defenders, treat gate terrain as passable (plain)
    const effectiveTerrain = isDefender
      ? state.battleMap.terrain.map(col => col.map(t => t === 'gate' ? 'plain' as const : t))
      : state.battleMap.terrain;

    const range = getMovementRange(unit.type);
    const validMoves = getMoveRange(
      { q: unit.x, r: unit.y }, range,
      state.battleMap.width, state.battleMap.height,
      effectiveTerrain, blocked, occupied
    );
    if (!validMoves.has(`${q},${r}`)) return;

    set({
      units: state.units.map(u =>
        u.id === unitId
          ? { ...u, x: q, y: r, z: -q - r, hasMoved: true }
          : u
      ),
      mode: 'idle',
    });

    get().addBattleLog(i18next.t('logs:battle.move', { name: localizedName(unit.officer.name), q, r }));
  },

  attackUnit: (attackerUnitId, targetUnitId) => {
    const state = get();
    const attacker = state.units.find(u => u.id === attackerUnitId);
    const target = state.units.find(u => u.id === targetUnitId);
    if (!attacker || !target) return;

    const dist = getDistance({ q: attacker.x, r: attacker.y }, { q: target.x, r: target.y });
    const atkRange = getAttackRange(attacker.type);
    if (dist > atkRange) return;

    let terrain: TerrainType = 'plain';
    if (target.x >= 0 && target.x < state.battleMap.width && target.y >= 0 && target.y < state.battleMap.height) {
      terrain = state.battleMap.terrain[target.x][target.y];
    }

    const attackMod = getAttackModifier(attacker.type, terrain, attacker.officer);
    const defenseMod = getDefenseModifier(target.type, terrain, target.officer);

    const trainingBonus = 1 + (attacker.training / 200);
    const baseDamage = (attacker.officer.war * attacker.troops) / 1000;
    const targetDefense = (target.officer.leadership * target.troops) / 1000;
    // City defense coefficient reduces damage dealt to defending faction's units
    const cityDefCoeff = (target.factionId === state.defenderId)
      ? state.defenseCoefficient
      : 1.0;
    const modDamage = (baseDamage / Math.max(1, targetDefense)) * 500 * trainingBonus * attackMod / (defenseMod * cityDefCoeff);
    const damage = Math.floor(Math.max(50, modDamage));

    const targetRange = getAttackRange(target.type);
    let counterDamage = 0;
    if (dist <= targetRange) {
      counterDamage = Math.floor(damage * 0.3);
    }

    const moraleDamage = Math.floor(damage / 100) + 2;

    const newUnits = state.units.map(u => {
      if (u.id === targetUnitId) {
        const newTroops = Math.max(0, u.troops - damage);
        const newMorale = Math.max(0, u.morale - moraleDamage);
        let newStatus = u.status;
        if (newMorale < 20 && newTroops > 0) {
          newStatus = 'routed';
        }
        return { ...u, troops: newTroops, morale: newMorale, status: newStatus };
      }
      if (u.id === attackerUnitId) {
        return {
          ...u,
          troops: Math.max(0, u.troops - counterDamage),
          status: 'done' as const,
        };
      }
      return u;
    });

    set({ units: newUnits, mode: 'idle', activeUnitId: null });

    get().addBattleLog(counterDamage > 0 ? i18next.t('logs:battle.attackWithCounter', { attacker: localizedName(attacker.officer.name), target: localizedName(target.officer.name), damage, counter: counterDamage }) : i18next.t('logs:battle.attack', { attacker: localizedName(attacker.officer.name), target: localizedName(target.officer.name), damage }));

    // POW check
    const defeatedTarget = newUnits.find(u => u.id === targetUnitId);
    if (defeatedTarget && defeatedTarget.troops <= 0) {
      get().addBattleLog(i18next.t('logs:battle.unitDestroyed', { name: localizedName(target.officer.name) }));
      const captureChance = 30 + (attacker.officer.war - defeatedTarget.officer.war) + (attacker.officer.charisma / 2);
      const rand = Math.random() * 100;
      if (rand < captureChance) {
        set(s => ({ capturedOfficerIds: [...s.capturedOfficerIds, defeatedTarget.officerId] }));
        get().addBattleLog(i18next.t('logs:battle.unitCaptured', { name: localizedName(target.officer.name) }));
      }

      const isCommander = state.units.filter(u => u.factionId === defeatedTarget.factionId)[0].id === defeatedTarget.id;
      if (isCommander) {
        set(s => ({
          units: s.units.map(u =>
            u.factionId === defeatedTarget.factionId && u.troops > 0
              ? { ...u, morale: Math.max(0, u.morale - 30), status: 'routed' as const }
              : u
          ),
          // Mark all surviving units of defeated faction as routed
          routedOfficerIds: [
            ...s.routedOfficerIds,
            ...s.units
              .filter(u => u.factionId === defeatedTarget.factionId && u.troops > 0 && u.id !== defeatedTarget.id)
              .map(u => u.officerId),
          ],
        }));
        get().addBattleLog(i18next.t('logs:battle.commanderDefeated', { name: localizedName(target.officer.name) }));

        // RTK IV: Commander defeat ends the battle immediately
        const loserFactionId = defeatedTarget.factionId;
        const winnerFactionId = loserFactionId === state.attackerId ? state.defenderId : state.attackerId;
        set({ isFinished: true, winnerFactionId });
        return; // Battle is over, skip further checks
      }
    }

    if (defeatedTarget && defeatedTarget.status === 'routed') {
      get().addBattleLog(i18next.t('logs:battle.unitRouted', { name: localizedName(target.officer.name) }));
      set(s => ({ routedOfficerIds: [...s.routedOfficerIds, defeatedTarget.officerId] }));
    }

    get().checkBattleEnd();
  },

  attackGate: (attackerUnitId, gateQ, gateR) => {
    const state = get();
    const attacker = state.units.find(u => u.id === attackerUnitId);
    if (!attacker) return;

    const gateIndex = state.gates.findIndex(g => g.q === gateQ && g.r === gateR);
    if (gateIndex === -1) return;

    const damage = Math.floor((attacker.officer.war * attacker.troops) / 1500 / state.defenseCoefficient);

    const newGates = [...state.gates];
    newGates[gateIndex] = { ...newGates[gateIndex], hp: Math.max(0, newGates[gateIndex].hp - damage) };

    let newBattleMap = state.battleMap;

    let newUnits = state.units.map(u => u.id === attackerUnitId ? { ...u, status: 'done' as const } : u);

    if (newGates[gateIndex].hp <= 0) {
      const newTerrain = state.battleMap.terrain.map((col, q) =>
        q === gateQ ? col.map((t, r) => r === gateR ? 'plain' as TerrainType : t) : col
      );
      newBattleMap = { ...state.battleMap, terrain: newTerrain };
      newGates.splice(gateIndex, 1);
      get().addBattleLog(i18next.t('logs:battle.gateBroken'));
      // Gate breach: defender morale drops -15 (RTK IV: breaching the gate shakes defender resolve)
      get().addBattleLog(i18next.t('logs:battle.gateBreach', { penalty: 15 }));
      newUnits = newUnits.map(u => {
        if (u.factionId === state.defenderId && u.troops > 0) {
          const newMorale = Math.max(0, u.morale - 15);
          let newStatus = u.status;
          // Route any defender with morale < 20 (including 'done' units that already acted)
          if (newMorale < 20 && u.status !== 'routed' && u.status !== 'arriving') {
            newStatus = 'routed';
          }
          return { ...u, morale: newMorale, status: newStatus };
        }
        return u;
      });
    } else {
      get().addBattleLog(i18next.t('logs:battle.gateAttack', { attacker: localizedName(attacker.officer.name), damage, remaining: newGates[gateIndex].hp }));
    }

    set({
      battleMap: newBattleMap,
      gates: newGates,
      units: newUnits,
      mode: 'idle',
      activeUnitId: null,
    });

    get().checkBattleEnd();
  },

  executeTactic: (unitId, tactic, targetId, targetHex) => {
    const state = get();
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    if (!hasSkill(unit.officer, tactic)) return;

    let success = false;
    let targetUnit: BattleUnit | undefined;

    if (targetId) {
      targetUnit = state.units.find(u => u.id === targetId);
    }

    const chance = calculateTacticSuccess(
      tactic,
      unit.officer.intelligence,
      targetUnit?.officer.intelligence
    );
    const roll = Math.random() * 100;
    success = roll < chance;

    let nextUnits = [...state.units];

    if (success) {
      get().addBattleLog(i18next.t('logs:battle.tacticSuccess', { name: localizedName(unit.officer.name), tactic: i18next.t(`data:skill.${tactic}`) }));

      switch (tactic) {
        case 'firePlot':
          if (targetHex) {
            set(s => ({ fireHexes: [...s.fireHexes, { q: targetHex.q, r: targetHex.r, turnsLeft: 3 }] }));
            if (targetUnit) {
              nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.floor(u.troops * 0.9), morale: u.morale - 5 } : u);
            }
          }
          break;
        case 'confusion':
          if (targetUnit) {
            nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, status: 'confused' as const, confusedTurns: 2 } : u);
          }
          break;
        case 'taunt':
          if (targetUnit) {
            nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, morale: Math.max(0, u.morale - 10) } : u);
          }
          break;
        case 'inspire':
          nextUnits = nextUnits.map(u => u.id === unitId ? { ...u, morale: Math.min(100, u.morale + 15) } : u);
          break;
        case 'ambush':
          if (targetUnit) {
            const dmg = Math.floor(unit.troops * 0.2);
            nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.max(0, u.troops - dmg), morale: u.morale - 10, status: 'confused' as const } : u);
          }
          break;
        case 'jointAttack':
          if (targetUnit) {
            const friend = nextUnits.find(u => u.factionId === targetUnit!.factionId && u.id !== targetUnit!.id);
            if (friend) {
              const dmg = Math.floor(targetUnit.troops * 0.1);
              nextUnits = nextUnits.map(u => u.id === friend.id ? { ...u, troops: Math.max(0, u.troops - dmg) } : u);
            }
          }
          break;
        case 'weatherChange': {
          const weathers = ['sunny', 'rain', 'cloudy', 'storm'] as const;
          set({ weather: weathers[Math.floor(Math.random() * 4)] });
          break;
        }
        case 'windChange':
          set({ windDirection: Math.floor(Math.random() * 6) });
          break;
        case 'repair':
          set(s => ({ gates: s.gates.map(g => ({ ...g, hp: Math.min(g.maxHp, g.hp + 500) })) }));
          break;
        case 'rockfall':
          if (targetUnit) {
            let terr: TerrainType = 'plain';
            if (targetUnit.x >= 0 && targetUnit.x < state.battleMap.width && targetUnit.y >= 0 && targetUnit.y < state.battleMap.height) {
              terr = state.battleMap.terrain[targetUnit.x][targetUnit.y];
            }
            if (terr === 'mountain' || terr === 'gate') {
              const dmg = Math.floor(targetUnit.troops * 0.15);
              nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.max(0, u.troops - dmg), morale: u.morale - 10 } : u);
            }
          }
          break;
        case 'chainLink':
          if (targetUnit) {
            nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, chained: true, status: 'confused' as const, confusedTurns: 3 } : u);
          }
          break;
        case 'lightning':
          if (targetHex && targetUnit) {
            const dmg = Math.floor(targetUnit.troops * 0.5);
            nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, troops: Math.max(0, u.troops - dmg), morale: u.morale - 30 } : u);
          }
          break;
        case 'falseReport':
          if (targetUnit) {
            nextUnits = nextUnits.map(u => u.id === targetId ? { ...u, status: 'confused' as const, confusedTurns: 3, morale: u.morale - 20 } : u);
          }
          break;
      }
    } else {
      get().addBattleLog(i18next.t('logs:battle.tacticFail', { name: localizedName(unit.officer.name), tactic: i18next.t(`data:skill.${tactic}`) }));
    }

    set({
      units: nextUnits.map(u => u.id === unitId ? { ...u, status: 'done' as const } : u),
      mode: 'idle',
      selectedTactic: null,
      activeUnitId: null,
    });

    get().checkBattleEnd();
  },

  applyDuelResults: (winnerOfficerId, loserOfficerId) => {
    const state = get();
    const newUnits = state.units.map(u => {
      if (u.officerId === winnerOfficerId) {
        return { ...u, morale: Math.min(100, u.morale + 20) };
      }
      if (u.officerId === loserOfficerId) {
        const newMorale = Math.max(0, u.morale - 30);
        return {
          ...u,
          morale: newMorale,
          status: newMorale < 20 ? 'routed' as const : u.status
        };
      }
      return u;
    });
    set({ units: newUnits });
  },

  /** Mark a single unit as done (player chose to skip this unit's remaining actions) */
  endUnitTurn: (unitId) => {
    set(s => ({
      units: s.units.map(u => u.id === unitId ? { ...u, status: 'done' as const } : u),
      activeUnitId: null,
      mode: 'idle',
    }));
  },

  /** Player clicks "結束回合": mark all remaining player units as done, switch to enemy phase */
  endPlayerPhase: () => {
    const state = get();
    const pFactionId = state.playerFactionId;

    // Mark all remaining player active units as done; decrement confusedTurns for confused units
    set({
      units: state.units.map(u => {
        if (u.factionId !== pFactionId) return u;
        if (u.status === 'confused') {
          const ct = (u.confusedTurns || 0) - 1;
          return { ...u, status: 'done' as const, confusedTurns: ct };
        }
        if (u.status === 'active') {
          return { ...u, status: 'done' as const };
        }
        return u;
      }),
      activeUnitId: null,
      mode: 'idle',
      turnPhase: 'enemy',
    });

    get().addBattleLog(i18next.t('logs:battle.enemyPhase'));
  },

  /** Process one enemy unit. Returns true if more enemy units remain to act. */
  stepEnemyPhase: (): boolean => {
    if (get().isFinished) return false;

    const state = get();
    const pFactionId = state.playerFactionId;

    // Find the next enemy unit that hasn't acted yet
    const nextEnemy = state.units.find(u =>
      u.factionId !== pFactionId && u.troops > 0 && (u.status === 'active' || u.status === 'confused')
    );

    if (!nextEnemy) {
      // No more enemy units — advance to next day
      get().nextDay();
      return false;
    }

    if (nextEnemy.status === 'confused') {
      const ct = nextEnemy.confusedTurns || 0;
      set(s => ({
        units: s.units.map(u =>
          u.id === nextEnemy.id ? { ...u, status: 'done' as const, confusedTurns: ct - 1 } : u
        ),
        activeUnitId: nextEnemy.id,
      }));
      get().addBattleLog(i18next.t('logs:battle.confused', { name: localizedName(nextEnemy.officer.name) }));

      const moreAfterConfused = get().units.some(u =>
        u.factionId !== pFactionId && u.troops > 0 && (u.status === 'active' || u.status === 'confused')
      );
      if (!moreAfterConfused && !get().isFinished) {
        get().nextDay();
      }
      return moreAfterConfused;
    }

    // Set this enemy as active and run its AI
    set({ activeUnitId: nextEnemy.id });
    get().runEnemyTurn();

    // Check if there are more enemy units to process
    const hasMore = get().units.some(u =>
      u.factionId !== pFactionId && u.troops > 0 && (u.status === 'active' || u.status === 'confused')
    ) && !get().isFinished;

    if (!hasMore && !get().isFinished) {
      get().nextDay();
    }

    return hasMore;
  },

  /** AI logic for a single enemy unit (the current activeUnit) */
  runEnemyTurn: () => {
    const state = get();
    const activeUnit = state.units.find(u => u.id === state.activeUnitId);
    if (!activeUnit || activeUnit.status !== 'active') {
      if (activeUnit) {
        set(s => ({
          units: s.units.map(u => u.id === activeUnit.id ? { ...u, status: 'done' as const } : u),
        }));
      }
      return;
    }

    const enemies = state.units.filter(u => u.factionId !== activeUnit.factionId && u.troops > 0 && u.status !== 'routed' && u.status !== 'arriving');
    if (enemies.length === 0) {
      set(s => ({
        units: s.units.map(u => u.id === activeUnit.id ? { ...u, status: 'done' as const } : u),
      }));
      return;
    }

    // ── Ruler guard: non-commander units prioritize defending the commander ──
    const commander = state.units.filter(u => u.factionId === activeUnit.factionId && u.troops > 0)[0];
    const isActiveCommander = commander && commander.id === activeUnit.id;
    let guardTarget: typeof enemies[0] | null = null;

    if (commander && !isActiveCommander) {
      // Find enemies threatening the commander (within 2 hexes)
      const threats = enemies.filter(e =>
        getDistance({ q: e.x, r: e.y }, { q: commander.x, r: commander.y }) <= 2
      );
      if (threats.length > 0) {
        // Pick the closest threat to the commander
        guardTarget = threats.reduce((best, e) => {
          const d = getDistance({ q: e.x, r: e.y }, { q: commander.x, r: commander.y });
          const bestD = getDistance({ q: best.x, r: best.y }, { q: commander.x, r: commander.y });
          return d < bestD ? e : best;
        });
      }
    }

    // Use guard target if present, otherwise nearest enemy
    const nearest = guardTarget ?? enemies.reduce((best, e) => {
      const d = getDistance({ q: e.x, r: e.y }, { q: activeUnit.x, r: activeUnit.y });
      const bestD = getDistance({ q: best.x, r: best.y }, { q: activeUnit.x, r: activeUnit.y });
      return d < bestD ? e : best;
    });

    const distToNearest = getDistance({ q: nearest.x, r: nearest.y }, { q: activeUnit.x, r: activeUnit.y });
    const atkRange = getAttackRange(activeUnit.type);

    // ── Siege attacker: PRIORITIZE gates over attacking enemies behind walls ──
    const isAttackerUnit = state.isSiege && activeUnit.factionId === state.attackerId;
    const intactGates = state.gates.filter(g => g.hp > 0);

    // Check if a breach exists: siege map always starts with 4 gates; fewer means at least one was breached
    const hasBreached = state.isSiege && intactGates.length < 4;

    // Determine whether this unit should use gate-targeting or normal combat
    let useGateTargeting = isAttackerUnit && intactGates.length > 0;

    if (useGateTargeting && hasBreached) {
      // A breach exists AND intact gates remain. Check if the unit can reach any enemy
      // through a breach — if so, use normal combat instead of gate targeting.
      const blockedForReach = new Set(
        state.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId !== activeUnit.factionId)
          .map(u => `${u.x},${u.y}`)
      );
      intactGates.forEach(g => blockedForReach.add(`${g.q},${g.r}`));
      const occupiedForReach = new Set(
        state.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId === activeUnit.factionId)
          .map(u => `${u.x},${u.y}`)
      );

      // Check reachability with a generous range (entire map traversal)
      const reachable = getMoveRange(
        { q: activeUnit.x, r: activeUnit.y }, 30,
        state.battleMap.width, state.battleMap.height,
        state.battleMap.terrain, blockedForReach, occupiedForReach
      );

      // Can we pathfind to a hex within attack range of any enemy?
      const canReachEnemy = enemies.some(e => {
        for (let dq = -atkRange; dq <= atkRange; dq++) {
          for (let dr = -atkRange; dr <= atkRange; dr++) {
            const hex = { q: e.x + dq, r: e.y + dr };
            if (getDistance(hex, { q: e.x, r: e.y }) <= atkRange && reachable.has(`${hex.q},${hex.r}`)) {
              return true;
            }
          }
        }
        return false;
      });

      if (canReachEnemy) {
        useGateTargeting = false; // Enemy reachable through breach — use normal combat
      }
    }

    if (useGateTargeting) {
      // Find nearest intact gate
      const nearestGate = intactGates.reduce((best, g) => {
        const d = getDistance({ q: g.q, r: g.r }, { q: activeUnit.x, r: activeUnit.y });
        const bestD = getDistance({ q: best.q, r: best.r }, { q: activeUnit.x, r: activeUnit.y });
        return d < bestD ? g : best;
      });

      const distToGate = getDistance({ q: nearestGate.q, r: nearestGate.r }, { q: activeUnit.x, r: activeUnit.y });

      // If adjacent to a gate, attack it (gate takes priority over units)
      if (distToGate <= 1) {
        get().attackGate(activeUnit.id, nearestGate.q, nearestGate.r);
        return;
      }

      // If enemy is in attack range AND outside walls (field combat), attack them
      // But DON'T attack enemies behind/on gates — focus on breaking the gate first
      if (distToNearest <= atkRange) {
        const nearestTerrain = state.battleMap.terrain[nearest.x]?.[nearest.y];
        const isEnemyBehindWalls = nearestTerrain === 'gate' || nearestTerrain === 'city'
          || nearest.factionId === state.defenderId;
        if (!isEnemyBehindWalls) {
          get().attackUnit(activeUnit.id, nearest.id);
          return;
        }
        // Enemy is behind walls — ignore them, keep heading for the gate
      }

      // Use proper pathfinding to move toward the gate (can route around friendly units)
      const moveRange = getMovementRange(activeUnit.type);
      const blocked = new Set(
        state.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId !== activeUnit.factionId)
          .map(u => `${u.x},${u.y}`)
      );
      // Gates block attacker movement
      state.gates.filter(g => g.hp > 0).forEach(g => blocked.add(`${g.q},${g.r}`));
      const occupied = new Set(
        state.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId === activeUnit.factionId)
          .map(u => `${u.x},${u.y}`)
      );

      const validMoves = getMoveRange(
        { q: activeUnit.x, r: activeUnit.y }, moveRange,
        state.battleMap.width, state.battleMap.height,
        state.battleMap.terrain, blocked, occupied
      );

      // Pick the reachable hex closest to the nearest gate
      let bestHex = { q: activeUnit.x, r: activeUnit.y };
      let bestDist = distToGate;
      for (const [key] of validMoves) {
        const [cq, cr] = key.split(',').map(Number);
        const d = getDistance({ q: cq, r: cr }, { q: nearestGate.q, r: nearestGate.r });
        if (d < bestDist) {
          bestDist = d;
          bestHex = { q: cq, r: cr };
        }
      }

      if (bestHex.q !== activeUnit.x || bestHex.r !== activeUnit.y) {
        get().moveUnit(activeUnit.id, bestHex.q, bestHex.r);
      }

      // After moving, try to attack the gate
      const movedUnit = get().units.find(u => u.id === activeUnit.id);
      if (movedUnit) {
        const newDistToGate = getDistance({ q: movedUnit.x, r: movedUnit.y }, { q: nearestGate.q, r: nearestGate.r });
        if (newDistToGate <= 1) {
          get().attackGate(activeUnit.id, nearestGate.q, nearestGate.r);
          return;
        }
      }

      // Mark as done if couldn't reach gate
      set(s => ({
        units: s.units.map(u => u.id === activeUnit.id ? { ...u, status: 'done' as const } : u),
      }));
      return;
    }

    // If in attack range (non-siege or gates already breached), attack
    if (distToNearest <= atkRange) {
      get().attackUnit(activeUnit.id, nearest.id);
      return;
    }

    // Try to move closer using proper BFS pathfinding
    const aiMoveRange = getMovementRange(activeUnit.type);
    const isDefenderUnit = state.isSiege && activeUnit.factionId === state.defenderId;

    // Siege defender sortie decision: RTK IV defenders almost never leave the walls.
    // Staying behind walls forces the attacker to waste time breaking gates and risks
    // losing on the 30-day time limit. Only sortie with overwhelming troop advantage.
    let shouldSortie = true;
    if (isDefenderUnit) {
      const allyTroops = state.units.filter(u => u.factionId === activeUnit.factionId && u.troops > 0 && u.status !== 'routed')
        .reduce((sum, u) => sum + u.troops, 0);
      const enemyTroops = enemies.reduce((sum, u) => sum + u.troops, 0);
      shouldSortie = allyTroops >= enemyTroops * 2;
    }

    // Build blocked/occupied sets (same logic as moveUnit validation)
    const aiBlocked = new Set(
      state.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId !== activeUnit.factionId)
        .map(u => `${u.x},${u.y}`)
    );
    if (!isDefenderUnit) {
      state.gates.filter(g => g.hp > 0).forEach(g => aiBlocked.add(`${g.q},${g.r}`));
    }
    // Defenders that shouldn't sortie: block gate hexes to keep them inside
    if (isDefenderUnit && !shouldSortie) {
      state.gates.filter(g => g.hp > 0).forEach(g => aiBlocked.add(`${g.q},${g.r}`));
    }
    const aiOccupied = new Set(
      state.units.filter(u => u.troops > 0 && u.id !== activeUnit.id && u.factionId === activeUnit.factionId)
        .map(u => `${u.x},${u.y}`)
    );

    // For defenders, treat gate terrain as passable
    const aiEffectiveTerrain = isDefenderUnit
      ? state.battleMap.terrain.map(col => col.map(t => t === 'gate' ? 'plain' as const : t))
      : state.battleMap.terrain;

    const validMoves = getMoveRange(
      { q: activeUnit.x, r: activeUnit.y }, aiMoveRange,
      state.battleMap.width, state.battleMap.height,
      aiEffectiveTerrain, aiBlocked, aiOccupied
    );

    // Pick the reachable hex closest to the nearest enemy
    let bestHex = { q: activeUnit.x, r: activeUnit.y };
    let bestDist = distToNearest;
    for (const [key] of validMoves) {
      const [cq, cr] = key.split(',').map(Number);
      const d = getDistance({ q: cq, r: cr }, { q: nearest.x, r: nearest.y });
      if (d < bestDist) {
        bestDist = d;
        bestHex = { q: cq, r: cr };
      }
    }

    if (bestHex.q !== activeUnit.x || bestHex.r !== activeUnit.y) {
      get().moveUnit(activeUnit.id, bestHex.q, bestHex.r);
    }

    // After moving, try attack
    const updatedUnit = get().units.find(u => u.id === activeUnit.id);
    if (updatedUnit) {
      const newDist = getDistance({ q: updatedUnit.x, r: updatedUnit.y }, { q: nearest.x, r: nearest.y });
      if (newDist <= atkRange) {
        get().attackUnit(activeUnit.id, nearest.id);
        return;
      }
    }

    // Done
    set(s => ({
      units: s.units.map(u => u.id === activeUnit.id ? { ...u, status: 'done' as const } : u),
    }));
  },

  nextDay: () => {
    const state = get();
    const newDay = state.day + 1;

    // RTK IV: battles last 30 days per month. At month end, battle pauses
    // for the strategic layer (taxes, harvest, AI turns, diplomacy) before resuming.
    const DAYS_PER_MONTH = 30;
    if (newDay > DAYS_PER_MONTH) {
      set({ battlePaused: true });
      get().addBattleLog(i18next.t('logs:battle.monthEnd'));
      return;
    }

    get().addBattleLog(i18next.t('logs:battle.dayHeader', { day: newDay }));

    // Fire damage
    let newFireHexes = [...state.fireHexes];
    let unitsWithFireDamage = [...state.units];

    unitsWithFireDamage = unitsWithFireDamage.map(u => {
      if (newFireHexes.some(f => f.q === u.x && f.r === u.y)) {
        return { ...u, troops: Math.floor(u.troops * 0.9) };
      }
      return u;
    });

    // Fire spread
    if (newFireHexes.length > 0 && Math.random() < 0.2) {
      const source = newFireHexes[Math.floor(Math.random() * newFireHexes.length)];
      const neighbors = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
      ];
      const dirIndex = state.windDirection % 6;
      const targetDir = neighbors[dirIndex];
      const targetQ = source.q + targetDir.q;
      const targetR = source.r + targetDir.r;
      if (!newFireHexes.some(f => f.q === targetQ && f.r === targetR)) {
        newFireHexes.push({ q: targetQ, r: targetR, turnsLeft: 4 });
      }
    }

    // Chained fire spread
    state.units.filter(u => u.chained && u.troops > 0).forEach(u => {
      if (newFireHexes.some(f => f.q === u.x && f.r === u.y)) {
        state.units.filter(u2 => u2.chained && u2.id !== u.id && u2.troops > 0).forEach(u2 => {
          if (!newFireHexes.some(f => f.q === u2.x && f.r === u2.y)) {
            newFireHexes.push({ q: u2.x, r: u2.y, turnsLeft: 3 });
          }
        });
      }
    });

    newFireHexes = newFireHexes.map(f => ({ ...f, turnsLeft: f.turnsLeft - 1 })).filter(f => f.turnsLeft > 0);

    // ── Food consumption (RTK IV: 1 food per soldier per day) ──
    const attackerLivingTroops = unitsWithFireDamage
      .filter(u => u.factionId === state.attackerId && u.troops > 0)
      .reduce((sum, u) => sum + u.troops, 0);
    const defenderLivingTroops = unitsWithFireDamage
      .filter(u => u.factionId === state.defenderId && u.troops > 0)
      .reduce((sum, u) => sum + u.troops, 0);

    let newAttackerFood = Math.max(0, state.attackerFood - attackerLivingTroops);
    let newDefenderFood = Math.max(0, state.defenderFood - defenderLivingTroops);

    // ── Starvation morale drain (escalating: -5 × consecutive days without food) ──
    let newAttackerStarveDays = state.attackerStarveDays;
    let newDefenderStarveDays = state.defenderStarveDays;

    if (newAttackerFood <= 0 && attackerLivingTroops > 0) {
      newAttackerStarveDays += 1;
      const moralePenalty = 5 * newAttackerStarveDays;
      get().addBattleLog(i18next.t('logs:battle.starvation', { side: i18next.t('logs:battle.sideAttacker'), days: newAttackerStarveDays, penalty: moralePenalty }));
      unitsWithFireDamage = unitsWithFireDamage.map(u => {
        if (u.factionId === state.attackerId && u.troops > 0) {
          const newMorale = Math.max(0, u.morale - moralePenalty);
          let newStatus = u.status;
          if (newMorale < 20 && u.status !== 'routed' && u.status !== 'arriving') {
            newStatus = 'routed';
          }
          return { ...u, morale: newMorale, status: newStatus };
        }
        return u;
      });
    } else {
      newAttackerStarveDays = 0;
    }

    if (newDefenderFood <= 0 && defenderLivingTroops > 0) {
      newDefenderStarveDays += 1;
      const moralePenalty = 5 * newDefenderStarveDays;
      get().addBattleLog(i18next.t('logs:battle.starvation', { side: i18next.t('logs:battle.sideDefender'), days: newDefenderStarveDays, penalty: moralePenalty }));
      unitsWithFireDamage = unitsWithFireDamage.map(u => {
        if (u.factionId === state.defenderId && u.troops > 0) {
          const newMorale = Math.max(0, u.morale - moralePenalty);
          let newStatus = u.status;
          if (newMorale < 20 && u.status !== 'routed' && u.status !== 'arriving') {
            newStatus = 'routed';
          }
          return { ...u, morale: newMorale, status: newStatus };
        }
        return u;
      });
    } else {
      newDefenderStarveDays = 0;
    }

    // Routed units flee toward map edge (check terrain to avoid walls)
    const routedCaptures: number[] = [];
    const mapW = state.battleMap.width;
    const mapH = state.battleMap.height;
    unitsWithFireDamage = unitsWithFireDamage.map(u => {
      if (u.status === 'routed') {
        if (u.x <= 0 || u.x >= mapW - 1 || u.y <= 0 || u.y >= mapH - 1) {
          if (Math.random() < 0.2) {
            routedCaptures.push(u.officerId);
          }
          return { ...u, troops: 0 };
        }
        let newX = u.x;
        if (u.x < mapW / 2) {
          newX = u.x - 1;
        } else {
          newX = u.x + 1;
        }
        // Don't move onto impassable terrain (walls/mountains)
        if (newX >= 0 && newX < state.battleMap.width) {
          const targetTerrain = state.battleMap.terrain[newX][u.y];
          if (targetTerrain === 'city' || targetTerrain === 'mountain') {
            // Stuck behind walls — lose troops gradually (attrition) and chance of capture
            const attritionTroops = Math.max(0, u.troops - Math.floor(u.troops * 0.2));
            if (attritionTroops <= 0) {
              if (Math.random() < 0.3) routedCaptures.push(u.officerId);
              return { ...u, troops: 0 };
            }
            return { ...u, troops: attritionTroops };
          }
        }
        return { ...u, x: newX, y: u.y, z: -newX - u.y };
      }
      return u;
    });

    const resetUnits = unitsWithFireDamage.map(u => {
      if (u.status === 'routed' && u.troops <= 0) return { ...u, status: 'done' as const };
      if (u.status === 'routed') return u;
      if (u.status === 'arriving') {
        // Check if this unit arrives on the new day
        if (u.arrivalDay <= newDay) {
          get().addBattleLog(i18next.t('logs:battle.reinforcements', { name: localizedName(u.officer.name) }));
          return { ...u, status: 'active' as const, hasMoved: false };
        }
        return u; // still arriving
      }
      if (u.troops <= 0) return { ...u, status: 'done' as const };
      return {
        ...u,
        status: (u.confusedTurns && u.confusedTurns > 0) ? 'confused' as const : 'active' as const,
        hasMoved: false,
      };
    });

    set({
      day: newDay,
      units: resetUnits,
      fireHexes: newFireHexes,
      capturedOfficerIds: [...state.capturedOfficerIds, ...routedCaptures],
      activeUnitId: null,
      mode: 'idle',
      turnPhase: 'player',
      attackerFood: newAttackerFood,
      defenderFood: newDefenderFood,
      attackerStarveDays: newAttackerStarveDays,
      defenderStarveDays: newDefenderStarveDays,
    });

    // Check if battle should end after day processing (routed units left map, starvation rout, etc.)
    get().checkBattleEnd();
  },

  resumeBattle: (defenderFoodResupply) => {
    const state = get();
    if (!state.battlePaused) return;

    // Reset day counter for the new month
    // Resupply defender food from city stores
    // Reset starvation counters (fresh month = fresh supply check)
    // Reactivate all living, non-routed units
    const resetUnits = state.units.map(u => {
      if (u.troops <= 0 || u.status === 'routed') return u;
      return {
        ...u,
        status: 'active' as const,
        hasMoved: false,
      };
    });

    const firstPlayerUnit = resetUnits.find(
      u => u.factionId === state.playerFactionId && u.troops > 0 && u.status === 'active'
    );

    set({
      day: 1,
      battlePaused: false,
      defenderFood: state.defenderFood + defenderFoodResupply,
      attackerStarveDays: 0,
      defenderStarveDays: 0,
      units: resetUnits,
      activeUnitId: firstPlayerUnit?.id || null,
      mode: 'idle',
      turnPhase: 'player',
    });

    get().addBattleLog(i18next.t('logs:battle.battleResume'));
  },

  checkBattleEnd: () => {
    const state = get();
    // Include 'arriving' units — reinforcements on the way prevent elimination
    // 'done' units have merely finished acting this turn; they are still alive combatants.
    const attackers = state.units.filter(u => u.factionId === state.attackerId && u.troops > 0 && u.status !== 'routed');
    const defenders = state.units.filter(u => u.factionId === state.defenderId && u.troops > 0 && u.status !== 'routed');

    if (attackers.length === 0) {
      set({ isFinished: true, winnerFactionId: state.defenderId });
    } else if (defenders.length === 0) {
      set({ isFinished: true, winnerFactionId: state.attackerId });
    }
  }
}));
