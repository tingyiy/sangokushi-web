import { describe, test, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Portrait } from './Portrait';

describe('Portrait Component', () => {
  test('renders with valid portraitId', () => {
    render(<Portrait portraitId={1} name="劉備" size="medium" />);
    
    const img = screen.getByAltText('劉備');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/portraits/1.png');
  });

  test('shows fallback when image fails to load', async () => {
    render(<Portrait portraitId={999} name="劉備" size="medium" />);
    
    const img = screen.getByAltText('劉備');
    // Simulate image error wrapped in act
    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });
    
    // Fallback should show first character
    expect(screen.getByText('劉')).toBeInTheDocument();
  });

  test('renders different sizes correctly', () => {
    const { container: small } = render(<Portrait portraitId={1} name="Test" size="small" />);
    const { container: medium } = render(<Portrait portraitId={1} name="Test" size="medium" />);
    const { container: large } = render(<Portrait portraitId={1} name="Test" size="large" />);
    
    // Check that different sizes have different dimensions
    const smallPortrait = small.querySelector('.portrait-small');
    const mediumPortrait = medium.querySelector('.portrait-medium');
    const largePortrait = large.querySelector('.portrait-large');
    
    expect(smallPortrait).toBeInTheDocument();
    expect(mediumPortrait).toBeInTheDocument();
    expect(largePortrait).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<Portrait portraitId={1} name="Test" size="medium" className="custom-class" />);
    
    const portrait = screen.getByAltText('Test').closest('.portrait');
    expect(portrait).toHaveClass('custom-class');
  });
});
