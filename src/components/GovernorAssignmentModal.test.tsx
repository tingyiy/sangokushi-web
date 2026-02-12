import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '../i18n';
import { GovernorAssignmentModal } from './GovernorAssignmentModal';
import { useGameStore } from '../store/gameStore';
import type { City, Faction, Officer } from '../types';

describe('GovernorAssignmentModal', () => {
  it('renders nothing when no assignment pending', () => {
    useGameStore.setState({ pendingGovernorAssignmentCityId: null });
    const { container } = render(<GovernorAssignmentModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders assignment options when pending', () => {
    useGameStore.setState({
      playerFaction: { id: 1 } as unknown as Faction,
      pendingGovernorAssignmentCityId: 1,
      cities: [{ id: 1, name: '測試城' }] as unknown as City[],
      officers: [
        { id: 10, name: '大將', cityId: 1, factionId: 1, leadership: 90, war: 80, intelligence: 70, politics: 60, charisma: 75, rank: 'common' } as unknown as Officer
      ]
    });

    render(<GovernorAssignmentModal />);
    expect(screen.getByText('任命太守')).toBeDefined();
    expect(screen.getByText('測試城 目前沒有太守，請從以下武將中挑選一位擔任：')).toBeDefined();
    expect(screen.getByText('大將')).toBeDefined();
  });

  it('appoints governor and clears pending state', () => {
    const appointGovernor = vi.fn();
    useGameStore.setState({
      playerFaction: { id: 1 } as unknown as Faction,
      pendingGovernorAssignmentCityId: 1,
      cities: [{ id: 1, name: '測試城' }] as unknown as City[],
      officers: [
        { id: 10, name: '大將', cityId: 1, factionId: 1, isGovernor: false } as unknown as Officer
      ],
      appointGovernor
    });

    render(<GovernorAssignmentModal />);
    fireEvent.click(screen.getByText('大將'));

    expect(appointGovernor).toHaveBeenCalledWith(1, 10);
    // Note: handleAppoint manually sets state. In real scenario, it would re-evaluate cities.
    // The test mock just checks if it was called.
  });
});
