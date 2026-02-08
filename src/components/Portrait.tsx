import { useState } from 'react';

interface PortraitProps {
  /** Portrait ID - maps to image filename (e.g., 1.png) */
  portraitId: number;
  /** Officer name for alt text and fallback display */
  name: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Additional CSS class */
  className?: string;
}

/**
 * Portrait Component - Phase 0.5
 * Displays officer portrait with fallback for missing images
 * Uses placeholder colored rectangle with first character of name
 */
export function Portrait({ portraitId, name, size = 'medium', className }: PortraitProps) {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    small: { width: 48, height: 60 },
    medium: { width: 80, height: 100 },
    large: { width: 128, height: 160 },
  };

  const { width, height } = sizeMap[size];

  return (
    <div
      className={`portrait portrait-${size} ${className ?? ''}`}
      style={{ width, height }}
    >
      {!imageError && (
        <img
          src={`/portraits/${portraitId}.png`}
          alt={name}
          width={width}
          height={height}
          onError={() => setImageError(true)}
          className="portrait-image"
        />
      )}
      {imageError && (
        <div className="portrait-fallback">
          <span className="fallback-text">{name[0]}</span>
        </div>
      )}
    </div>
  );
}
