import i18next from 'i18next';
import type { Faction, Officer } from '../types';
import type { GameState } from './gameStore';
import { serializeMemory, restoreMemory } from '../llm/memory';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

export const MAX_SAVE_SLOTS = 10;

interface SaveSlotInfo {
  slot: number;
  date: string | null;
  version: string | null;
  scenarioName?: string;
  rulerName?: string;
  year?: number;
  month?: number;
  isAuto?: boolean;
}

export function createSaveLoadActions(set: Set, get: Get): Pick<GameState, 'saveGame' | 'loadGame' | 'getSaveSlots' | 'deleteSave'> {
  return {
    saveGame: (slot) => {
      try {
        const state = get();
        const saveData = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          phase: state.phase,
          scenario: state.scenario,
          playerFactionId: state.playerFaction?.id,
          cities: state.cities,
          officers: state.officers,
          factions: state.factions,
          year: state.year,
          month: state.month,
          selectedCityId: state.selectedCityId,
          log: state.log,
          revealedCities: state.revealedCities,
          llmMemory: serializeMemory(),
        };

        localStorage.setItem(`rtk4_save_${slot}`, JSON.stringify(saveData));
        // Auto-save is silent — no log entry
        if (slot !== 'auto') {
          get().addLog(i18next.t('logs:game.savedToSlot', { slot }));
        }
        return true;
      } catch (e) {
        console.error('Save game failed:', e);
        if (slot !== 'auto') {
          get().addLog(i18next.t('logs:game.saveFailed'));
        }
        return false;
      }
    },

    loadGame: (slot) => {
      try {
        const saveDataStr = localStorage.getItem(`rtk4_save_${slot}`);
        if (!saveDataStr) {
          get().addLog(i18next.t('logs:game.slotNotFound', { slot }));
          return false;
        }

        const saveData = JSON.parse(saveDataStr);

        // Version check for future migrations
        if (!saveData.version) {
          console.warn('Save file has no version');
        }

        // Restore player faction reference
        const playerFaction = saveData.factions.find((f: Faction) => f.id === saveData.playerFactionId);

        set({
          phase: saveData.phase,
          scenario: saveData.scenario,
          playerFaction: playerFaction || null,
          cities: saveData.cities,
          officers: saveData.officers,
          factions: saveData.factions,
          year: saveData.year,
          month: saveData.month,
          selectedCityId: saveData.selectedCityId,
          log: [...saveData.log, i18next.t('logs:game.loadedFromSlot', { slot })],
          activeCommandCategory: null,
          duelState: null,
          revealedCities: saveData.revealedCities || {},
        });

        // Restore LLM agent memory if present in save data
        if (saveData.llmMemory) {
          restoreMemory(saveData.llmMemory);
        }

        return true;
      } catch (e) {
        console.error('Load game failed:', e);
        get().addLog(i18next.t('logs:game.loadFailed'));
        return false;
      }
    },

    getSaveSlots: (): SaveSlotInfo[] => {
      const slots: SaveSlotInfo[] = [];

      // Auto-save slot (slot 0, isAuto: true)
      const autoDataStr = localStorage.getItem('rtk4_save_auto');
      if (autoDataStr) {
        try {
          const autoData = JSON.parse(autoDataStr);
          const playerFaction = autoData.factions?.find((f: Faction) => f.id === autoData.playerFactionId);
          const ruler = playerFaction
            ? autoData.officers?.find((o: Officer) => o.id === playerFaction.rulerId)
            : null;
          slots.push({
            slot: 0,
            date: autoData.timestamp,
            version: autoData.version || 'unknown',
            scenarioName: autoData.scenario?.name,
            rulerName: ruler?.name ?? playerFaction?.name,
            year: autoData.year,
            month: autoData.month,
            isAuto: true,
          });
        } catch {
          slots.push({ slot: 0, date: null, version: null, isAuto: true });
        }
      } else {
        slots.push({ slot: 0, date: null, version: null, isAuto: true });
      }

      // Manual save slots (1–MAX_SAVE_SLOTS)
      for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
        const saveDataStr = localStorage.getItem(`rtk4_save_${i}`);
        if (saveDataStr) {
          try {
            const saveData = JSON.parse(saveDataStr);
            const playerFaction = saveData.factions?.find((f: Faction) => f.id === saveData.playerFactionId);
            const ruler = playerFaction
              ? saveData.officers?.find((o: Officer) => o.id === playerFaction.rulerId)
              : null;
            slots.push({
              slot: i,
              date: saveData.timestamp,
              version: saveData.version || 'unknown',
              scenarioName: saveData.scenario?.name,
              rulerName: ruler?.name ?? playerFaction?.name,
              year: saveData.year,
              month: saveData.month,
            });
          } catch {
            slots.push({ slot: i, date: null, version: null });
          }
        } else {
          slots.push({ slot: i, date: null, version: null });
        }
      }
      return slots;
    },

    deleteSave: (slot) => {
      try {
        localStorage.removeItem(`rtk4_save_${slot}`);
        get().addLog(i18next.t('logs:game.slotDeleted', { slot }));
        return true;
      } catch (e) {
        console.error('Delete save failed:', e);
        return false;
      }
    },
  };
}
