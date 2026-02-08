import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
        { id: 1, name: '許昌', warHorses: 2000, crossbows: 2000 },
        { id: 2, name: '洛陽', warHorses: 0, crossbows: 0 }
      ],
      officers: [
        { id: 1, name: '荀彧', leadership: 85, war: 60, intelligence: 95, cityId: 1, factionId: 1, stamina: 100 },
        { id: 2, name: '夏侯惇', leadership: 90, war: 95, intelligence: 70, cityId: 1, factionId: 1, stamina: 100 },
      ],
      playerFaction: { id: 1 },
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
    });
    expect(mockStartBattle).toHaveBeenCalledWith(2);
  });
});
