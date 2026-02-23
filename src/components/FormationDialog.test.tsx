import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../i18n';
import { FormationDialog } from './FormationDialog';
import { useGameStore } from '../store/gameStore';

vi.mock('../store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

describe('FormationDialog', () => {
  const mockStartBattle = vi.fn();
  const mockSetBattleFormation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as vi.Mock).mockReturnValue({
      selectedCityId: 1,
      cities: [
        { id: 1, name: '許昌', warHorses: 2000, crossbows: 2000, troops: 50000, food: 500000 },
        { id: 2, name: '洛陽', warHorses: 0, crossbows: 0, troops: 10000, food: 100000 }
      ],
      officers: [
        { id: 1, name: '荀彧', leadership: 85, war: 60, intelligence: 95, cityId: 1, factionId: 1, acted: false, rank: 'common', treasureId: null },
        { id: 2, name: '夏侯惇', leadership: 90, war: 95, intelligence: 70, cityId: 1, factionId: 1, acted: false, rank: 'common', treasureId: null },
      ],
      playerFaction: { id: 1, rulerId: 99 },
      startBattle: mockStartBattle,
      setBattleFormation: mockSetBattleFormation,
    });
  });

  it('renders correctly', () => {
    render(<FormationDialog targetCityId={2} onClose={() => {}} />);
    expect(screen.getByText(/出征準備/)).toBeDefined();
    expect(screen.getByText('荀彧')).toBeDefined();
  });

  it('allows selecting officers and starting battle', () => {
    render(<FormationDialog targetCityId={2} onClose={() => {}} />);
    
    const officerItem = screen.getByText('夏侯惇');
    fireEvent.click(officerItem);
    
    const confirmBtn = screen.getByText('確認出陣');
    fireEvent.click(confirmBtn);
    
    expect(mockSetBattleFormation).toHaveBeenCalledWith({
      officerIds: [2],
      unitTypes: ['infantry'],
      troops: [50000], // min(50000/1, 90*1000*1.0) = 50000 (garrison-limited)
      food: 500000, // min(50000 * 10, 500000) = 500000
    });
    expect(mockStartBattle).toHaveBeenCalledWith(2);
  });

  it('defaults food to totalAllocated × 10, capped by city food', () => {
    // City food is 500000, so for 50000 troops → min(500000, 500000) = 500000
    render(<FormationDialog targetCityId={2} onClose={() => {}} />);

    // Select officer (gets 50000 troops auto-assigned)
    fireEvent.click(screen.getByText('夏侯惇'));

    const foodInput = document.querySelector('.food-input') as HTMLInputElement;
    expect(foodInput).toBeTruthy();
    expect(Number(foodInput.value)).toBe(500000);
  });

  it('passes manually edited food value through setBattleFormation', () => {
    render(<FormationDialog targetCityId={2} onClose={() => {}} />);

    fireEvent.click(screen.getByText('夏侯惇'));

    const foodInput = document.querySelector('.food-input') as HTMLInputElement;
    fireEvent.change(foodInput, { target: { value: '100000' } });
    expect(Number(foodInput.value)).toBe(100000);

    fireEvent.click(screen.getByText('確認出陣'));

    expect(mockSetBattleFormation).toHaveBeenCalledWith(
      expect.objectContaining({ food: 100000 })
    );
  });
});
