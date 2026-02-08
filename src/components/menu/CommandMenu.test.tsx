import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandMenu } from './CommandMenu';
import { useGameStore } from '../../store/gameStore';

vi.mock('../../store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

// Mock the dialogs to avoid deep rendering issues
vi.mock('../FormationDialog', () => ({
  FormationDialog: () => <div data-testid="formation-dialog" />,
}));
vi.mock('../TransportDialog', () => ({
  TransportDialog: () => <div data-testid="transport-dialog" />,
}));

describe('CommandMenu', () => {
  const mockSetActiveCommandCategory = vi.fn();
  const mockEndTurn = vi.fn();
  const mockDevelopCommerce = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as vi.Mock).mockReturnValue({
      selectedCityId: 1,
      cities: [
        { id: 1, name: '許昌', factionId: 1, adjacentCityIds: [2] },
        { id: 2, name: '洛陽', factionId: 2, adjacentCityIds: [1] },
      ],
      officers: [
        { id: 1, name: '荀彧', cityId: 1, factionId: 1, isGovernor: true, stamina: 100, loyalty: 100, skills: ['製造'] },
      ],
      factions: [
        { id: 1, name: '曹操', color: '#ff0000', relations: { 2: 60 }, allies: [] },
        { id: 2, name: '董卓', color: '#0000ff', relations: { 1: 60 }, allies: [] },
      ],
      playerFaction: { id: 1 },
      activeCommandCategory: null,
      setActiveCommandCategory: mockSetActiveCommandCategory,
      endTurn: mockEndTurn,
      developCommerce: mockDevelopCommerce,
      addLog: vi.fn(),
    });
  });

  it('renders categories', () => {
    render(<CommandMenu />);
    expect(screen.getByText('內政')).toBeDefined();
    expect(screen.getByText('軍事')).toBeDefined();
    expect(screen.getByText('結束')).toBeDefined();
  });

  it('switches categories', () => {
    render(<CommandMenu />);
    fireEvent.click(screen.getByText('內政'));
    expect(mockSetActiveCommandCategory).toHaveBeenCalledWith('內政');
  });

  it('renders actions when category is active', () => {
    (useGameStore as unknown as vi.Mock).mockReturnValue({
      ...useGameStore({} as any),
      activeCommandCategory: '內政',
      selectedCityId: 1,
      cities: [{ id: 1, name: '許昌', factionId: 1, adjacentCityIds: [2] }],
      playerFaction: { id: 1 },
      officers: [{ id: 1, name: '荀彧', cityId: 1, factionId: 1, isGovernor: true, skills: ['製造'] }],
    });
    
    render(<CommandMenu />);
    expect(screen.getByText(/商業開發/)).toBeDefined();
    
    fireEvent.click(screen.getByText(/商業開發/));
    expect(mockDevelopCommerce).toHaveBeenCalledWith(1);
  });
});
