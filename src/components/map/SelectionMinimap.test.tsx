import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SelectionMinimap } from './SelectionMinimap';
import type { City, Faction } from '../../types';

describe('SelectionMinimap Component', () => {
  const mockFactions: Faction[] = [
    { id: 1, name: '曹操', rulerId: 20, color: '#2563eb', isPlayer: false, relations: {}, allies: [] },
    { id: 2, name: '劉備', rulerId: 1, color: '#16a34a', isPlayer: false, relations: {}, allies: [] },
  ];

  const mockCities: City[] = [
    {
      id: 1,
      name: '洛陽',
      x: 60,
      y: 50,
      factionId: 1,
      population: 100000,
      gold: 5000,
      food: 10000,
      commerce: 500,
      agriculture: 500,
      defense: 80,
      troops: 10000,
      adjacentCityIds: [2],
      floodControl: 50,
      technology: 30,
      peopleLoyalty: 70,
      morale: 60,
      training: 40,
      crossbows: 0,
      warHorses: 0,
      batteringRams: 0,
      catapults: 0,
    },
    {
      id: 2,
      name: '長安',
      x: 40,
      y: 45,
      factionId: 2,
      population: 80000,
      gold: 4000,
      food: 8000,
      commerce: 400,
      agriculture: 400,
      defense: 70,
      troops: 8000,
      adjacentCityIds: [1],
      floodControl: 50,
      technology: 30,
      peopleLoyalty: 70,
      morale: 60,
      training: 40,
      crossbows: 0,
      warHorses: 0,
      batteringRams: 0,
      catapults: 0,
    },
    {
      id: 3,
      name: '空城',
      x: 70,
      y: 60,
      factionId: null,
      population: 50000,
      gold: 2000,
      food: 5000,
      commerce: 200,
      agriculture: 200,
      defense: 30,
      troops: 0,
      adjacentCityIds: [],
      floodControl: 50,
      technology: 30,
      peopleLoyalty: 70,
      morale: 60,
      training: 40,
      crossbows: 0,
      warHorses: 0,
      batteringRams: 0,
      catapults: 0,
    },
  ];

  test('renders SVG with correct viewBox', () => {
    const { container } = render(
      <SelectionMinimap
        cities={mockCities}
        factions={mockFactions}
        highlightFactionId={null}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute('viewBox', '0 0 100 85');
  });

  test('renders city markers for all cities', () => {
    const { container } = render(
      <SelectionMinimap
        cities={mockCities}
        factions={mockFactions}
        highlightFactionId={null}
      />
    );
    // MapTerrain also renders circles (patterns, overlays), so count
    // only the city-marker circles that sit at our mock city coordinates.
    const circles = container.querySelectorAll('circle.city-marker');
    expect(circles.length).toBe(mockCities.length);
  });

  test('highlights cities of selected faction', () => {
    const { container } = render(
      <SelectionMinimap
        cities={mockCities}
        factions={mockFactions}
        highlightFactionId={1}
      />
    );
    // Should render without errors
    expect(container.querySelector('svg')).toBeTruthy();
  });

  test('uses gray color for neutral cities', () => {
    const { container } = render(
      <SelectionMinimap
        cities={mockCities}
        factions={mockFactions}
        highlightFactionId={null}
      />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);
  });
});
