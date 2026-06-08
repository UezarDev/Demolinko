// src/engine/SaveManager.ts - Independent serialization module for browser localStorage persistence.

export interface SaveData {
  totalGold: number;
  activeUpgrades: string[];
  highestDayReached: number;
}

const SAVE_KEY = 'demolinko_save';

export class SaveManager {
  /**
   * Saves the player's run metrics to browser LocalStorage.
   */
  public static save(data: SaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('SaveManager: Failed to write state to localStorage:', e);
    }
  }

  /**
   * Loads the player's run metrics from LocalStorage. Returns null if none exist.
   */
  public static load(): SaveData | null {
    try {
      const dataStr = localStorage.getItem(SAVE_KEY);
      if (!dataStr) return null;
      return JSON.parse(dataStr) as SaveData;
    } catch (e) {
      console.error('SaveManager: Failed to parse state from localStorage:', e);
      return null;
    }
  }

  /**
   * Completely deletes all persistent data under SaveManager.
   */
  public static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.error('SaveManager: Failed to clear storage state:', e);
    }
  }
}
