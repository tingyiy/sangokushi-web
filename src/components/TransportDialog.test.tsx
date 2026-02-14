import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../i18n';
import { TransportDialog } from './TransportDialog';
import { useGameStore } from '../store/gameStore';

vi.mock('../store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

describe('TransportDialog', () => {
  const mockTransport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as vi.Mock).mockReturnValue({
      selectedCityId: 1,
      cities: [
        { id: 1, name: '許昌', gold: 5000, food: 10000, troops: 5000, factionId: 1 },
        { id: 2, name: '洛陽', gold: 1000, food: 1000, troops: 1000, factionId: 1 },
      ],
      officers: [
        { id: 1, name: '荀彧', cityId: 1, factionId: 1, acted: false, leadership: 85, war: 60 },
        { id: 2, name: '夏侯惇', cityId: 1, factionId: 1, acted: false, leadership: 90, war: 95 },
      ],
      playerFaction: { id: 1 },
      transport: mockTransport,
    });
  });

  it('renders with officer selection and all three resource inputs', () => {
    render(<TransportDialog toCityId={2} onClose={() => {}} />);
    expect(screen.getByText(/資源輸送/)).toBeDefined();
    expect(screen.getByText(/洛陽/)).toBeDefined();
    // Should have 3 number inputs for gold, food, troops
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBe(3);
    // Should have officer in the dropdown
    expect(screen.getByText(/荀彧/)).toBeDefined();
  });

  it('allows transporting multiple resources with selected officer', () => {
    render(<TransportDialog toCityId={2} onClose={() => {}} />);
    
    const inputs = screen.getAllByRole('spinbutton');
    // First input is gold, second is food
    fireEvent.change(inputs[0], { target: { value: '1000' } });
    fireEvent.change(inputs[1], { target: { value: '2000' } });
    
    const confirmBtn = screen.getByText('輸送');
    fireEvent.click(confirmBtn);
    
    // Should pass the first officer's id (荀彧 = id 1, auto-selected)
    expect(mockTransport).toHaveBeenCalledWith(1, 2, { gold: 1000, food: 2000 }, 1);
  });
});
