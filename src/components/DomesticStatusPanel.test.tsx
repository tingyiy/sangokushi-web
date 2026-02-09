import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DomesticStatusPanel } from './DomesticStatusPanel';
import { useGameStore } from '../store/gameStore';
import type { City, Faction } from '../types';

describe('DomesticStatusPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<DomesticStatusPanel isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders city status when open', () => {
    useGameStore.setState({
      playerFaction: { id: 1, name: '曹操' } as unknown as Faction,
      cities: [
        { id: 1, name: '許昌', factionId: 1, population: 100000, gold: 5000, food: 10000, commerce: 500, agriculture: 500, defense: 50, troops: 10000, morale: 60, training: 40 }
      ] as unknown as City[]
    });

    render(<DomesticStatusPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('全勢力狀況一覽')).toBeDefined();
    expect(screen.getByText('許昌')).toBeDefined();
    expect(screen.getByText('100,000')).toBeDefined();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<DomesticStatusPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });
});
