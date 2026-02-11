import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '../i18n';
import { RulerCreation } from './RulerCreation';
import { useGameStore } from '../store/gameStore';
import type { City } from '../types';

describe('RulerCreation', () => {
  it('renders form fields', () => {
    render(<RulerCreation />);
    expect(screen.getByText('新君主登錄')).toBeDefined();
    expect(screen.getByLabelText('姓名')).toBeDefined();
  });

  it('updates state on input', () => {
    render(<RulerCreation />);
    const nameInput = screen.getByLabelText('姓名') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '我的君主' } });
    expect(nameInput.value).toBe('我的君主');
  });

  it('creates ruler and faction', () => {
    useGameStore.setState({
      cities: [{ id: 1, name: '空白城', factionId: null }] as unknown as City[],
      factions: [],
      officers: []
    });

    render(<RulerCreation />);
    
    // Fill in name
    const nameInput = screen.getByLabelText('姓名');
    fireEvent.change(nameInput, { target: { value: '霸主' } });

    // Click create
    fireEvent.click(screen.getByText('建立君主'));

    const state = useGameStore.getState();
    expect(state.playerFaction?.name).toBe('霸主勢力');
    expect(state.officers.length).toBe(1);
    expect(state.officers[0].name).toBe('霸主');
    expect(state.cities[0].factionId).toBe(state.playerFaction?.id);
    expect(state.phase).toBe('settings');
  });
});
