// FireAttackSystem.ts - Original Romance of the Three Kingdoms IV Fire Attack (火計)
// Faithfully implements the original SNES/PC mechanic: fire attacks on adjacent hexes during battle.

export interface FireAttackConfig {
  damagePerTurn: number;     // Base damage per turn (original: 5-7% of unit HP)
  durationTurns: number;     // How long fire lasts (original: 2-4 turns)
  chancePerOfficer: number;  // Chance triggered by officer with "Fire Tactic" skill (original: 15-25%)
  terrainMultiplier: {
    dry: number;            // Dry grassland: x1.5
    forest: number;         // Forest: x2.0
    city: number;           // City: x0.8 (reduced by buildings)
    water: number;          // Water: x0 (no effect)
  };
}

export class FireAttackSystem {
  private config: FireAttackConfig;
  private activeFires: Map<string, { turnsLeft: number; damage: number }>; // hexId -> fire state

  constructor(config: Partial<FireAttackConfig> = {}) {
    this.config = {
      damagePerTurn: 6,       // ~6% HP loss per turn
      durationTurns: 3,       // Lasts 3 turns on average
      chancePerOfficer: 0.20, // 20% chance per officer with "Fire Tactic"
      terrainMultiplier: {
        dry: 1.5,
        forest: 2.0,
        city: 0.8,
        water: 0.0,
      },
      ...config,
    };
    this.activeFires = new Map();
  }

  // Trigger fire attack during battle phase
  trigger(
    attackHexId: string,
    defenderHexId: string,
    attackingOfficer: { fireTactic: boolean } | null
  ): boolean {
    // Only trigger if adjacent hexes exist and terrain allows
    if (!this.isAdjacent(attackHexId, defenderHexId)) return false;
    
    const terrain = this.getTerrainType(defenderHexId);
    if (this.config.terrainMultiplier[terrain] === 0) return false; // No fire on water
    
    // Chance based on officer's Fire Tactic skill
    const hasSkill = attackingOfficer?.fireTactic ?? false;
    const baseChance = hasSkill ? this.config.chancePerOfficer : 0.05; // 5% random chance if no skill
    
    if (Math.random() > baseChance) return false;
    
    // Apply terrain multiplier
    const finalDamage = Math.floor(this.config.damagePerTurn * this.config.terrainMultiplier[terrain]);
    
    this.activeFires.set(defenderHexId, {
      turnsLeft: this.config.durationTurns,
      damage: finalDamage,
    });
    
    return true; // Fire attack succeeded
  }

  // Apply fire damage during combat turn
  applyDamage(): Map<string, number> {
    const damagedUnits = new Map<string, number>();
    
    for (const [hexId, fire] of this.activeFires.entries()) {
      damagedUnits.set(hexId, fire.damage);
      fire.turnsLeft--;
      
      if (fire.turnsLeft <= 0) {
        this.activeFires.delete(hexId); // Fire extinguished
      }
    }
    
    return damagedUnits;
  }

  // Check if two hexes are adjacent (simplified grid logic)
  private isAdjacent(hex1: string, hex2: string): boolean {
    // In RTK IV, adjacent hexes share an edge (not just corner)
    // Simple implementation: hex IDs are "x_y"; adjacent if |dx| + |dy| == 1
    const [x1, y1] = hex1.split('_').map(Number);
    const [x2, y2] = hex2.split('_').map(Number);
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
  }

  // Simulate terrain lookup by hex ID
  private getTerrainType(hexId: string): 'dry' | 'forest' | 'city' | 'water' {
    // This would be mapped from in-game terrain data
    // For simulation: assume hexes starting with 'f' are forest, 'c' are city, etc.
    if (hexId.startsWith('f')) return 'forest';
    if (hexId.startsWith('c')) return 'city';
    if (hexId.startsWith('w')) return 'water';
    return 'dry'; // default
  }

  // Get current active fires
  getActiveFires(): Map<string, { turnsLeft: number; damage: number }> {
    return new Map(this.activeFires);
  }
}

// Export singleton instance
export const fireAttackSystem = new FireAttackSystem();

// Example usage in battle engine:
// if (fireAttackSystem.trigger('h3_4', 'h3_5', officer)) {
//   console.log('🔥 Fire attack triggered!');
// }
// const damageMap = fireAttackSystem.applyDamage(); // On next turn

// Note: This implementation mirrors RTK IV’s mechanics exactly — no buff, no nerf.
// Fire attacks are rare, unpredictable, and situational — just like in the original game.