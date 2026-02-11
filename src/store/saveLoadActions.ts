import i18next from 'i18next';
import type { Faction } from '../types';
import type { GameState } from './gameStore';

type Set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type Get = () => GameState;

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
        };

        localStorage.setItem(`rtk4_save_${slot}`, JSON.stringify(saveData));
        get().addLog(i18next.t('logs:game.savedToSlot', { slot }));
        return true;
      } catch (e) {
        console.error('Save game failed:', e);
        get().addLog(i18next.t('logs:game.saveFailed'));
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
          log: [...saveData.log, `遊戲已從存檔 ${slot} 載入。`],
          activeCommandCategory: null,
          duelState: null,
        });

        return true;
      } catch (e) {
        console.error('Load game failed:', e);
        get().addLog(i18next.t('logs:game.loadFailed'));
        return false;
      }
    },

    getSaveSlots: () => {
      const slots = [];
      for (let i = 1; i <= 3; i++) {
        const saveDataStr = localStorage.getItem(`rtk4_save_${i}`);
        if (saveDataStr) {
          try {
            const saveData = JSON.parse(saveDataStr);
            slots.push({
              slot: i,
              date: saveData.timestamp,
              version: saveData.version || 'unknown',
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
