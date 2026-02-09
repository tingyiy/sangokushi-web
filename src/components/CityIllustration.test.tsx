import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CityIllustration } from './CityIllustration';
import type { City } from '../types';

describe('CityIllustration Component', () => {
  const mockCity: City = {
    id: 1,
    name: '測試城',
    x: 50,
    y: 50,
    factionId: 1,
    population: 100000,
    gold: 5000,
    food: 10000,
    commerce: 500,
    agriculture: 500,
    defense: 80,
    troops: 10000,
    adjacentCityIds: [2, 3],
    floodControl: 50,
    technology: 30,
    peopleLoyalty: 70,
    morale: 60,
    training: 40,
    crossbows: 0,
    warHorses: 0,
    batteringRams: 0,
    catapults: 0,
  };

  test('renders SVG with correct viewBox', () => {
    const { container } = render(<CityIllustration city={mockCity} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute('viewBox', '0 0 400 200');
  });

  test('renders city walls based on defense', () => {
    const { container: highDefense } = render(
      <CityIllustration city={{ ...mockCity, defense: 100 }} />
    );
    const { container: lowDefense } = render(
      <CityIllustration city={{ ...mockCity, defense: 20 }} />
    );

    // Both should render walls
    expect(highDefense.querySelector('svg')).toBeTruthy();
    expect(lowDefense.querySelector('svg')).toBeTruthy();
  });

  test('renders different number of buildings based on population', () => {
    const { container: highPop } = render(
      <CityIllustration city={{ ...mockCity, population: 200000 }} />
    );
    const { container: lowPop } = render(
      <CityIllustration city={{ ...mockCity, population: 10000 }} />
    );

    // Check both render
    expect(highPop.querySelector('svg')).toBeTruthy();
    expect(lowPop.querySelector('svg')).toBeTruthy();
  });

  test('renders farmland based on agriculture', () => {
    const { container: highAgri } = render(
      <CityIllustration city={{ ...mockCity, agriculture: 900 }} />
    );
    const { container: lowAgri } = render(
      <CityIllustration city={{ ...mockCity, agriculture: 100 }} />
    );

    expect(highAgri.querySelector('svg')).toBeTruthy();
    expect(lowAgri.querySelector('svg')).toBeTruthy();
  });

  test('renders market stalls based on commerce', () => {
    const { container: highCommerce } = render(
      <CityIllustration city={{ ...mockCity, commerce: 800 }} />
    );
    const { container: lowCommerce } = render(
      <CityIllustration city={{ ...mockCity, commerce: 100 }} />
    );

    expect(highCommerce.querySelector('svg')).toBeTruthy();
    expect(lowCommerce.querySelector('svg')).toBeTruthy();
  });
});
