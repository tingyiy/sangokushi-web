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
        { id: 1, name: '許昌', gold: 5000, food: 10000, troops: 5000 },
        { id: 2, name: '洛陽', gold: 1000, food: 1000, troops: 1000 },
      ],
      transport: mockTransport,
    });
  });

  it('renders correctly', () => {
    render(<TransportDialog toCityId={2} onClose={() => {}} />);
    expect(screen.getByText(/資源輸送/)).toBeDefined();
    expect(screen.getByText(/洛陽/)).toBeDefined();
  });

  it('allows transporting resources', () => {
    render(<TransportDialog toCityId={2} onClose={() => {}} />);
    
    const amountInput = screen.getByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '1000' } });
    
    const confirmBtn = screen.getByText('輸送');
    fireEvent.click(confirmBtn);
    
    expect(mockTransport).toHaveBeenCalledWith(1, 2, 'gold', 1000);
  });
});
