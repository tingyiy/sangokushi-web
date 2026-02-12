import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';
import { getSeason } from './map/mapData';

/**
 * GameHeader Component
 * Displays compact date badge overlay with season indicator.
 */
export function GameHeader() {
  const { t } = useTranslation();
  const { year, month, playerFaction } = useGameStore();

  const season = useMemo(() => getSeason(month), [month]);

  return (
    <div className="date-badge rtk-frame">
      <span className="badge-date">
        {t('header.dateLabel', { year, month })}
        <span className="badge-season">{t(`header.season.${season}`)}</span>
      </span>
      <span className="badge-faction" style={{ color: playerFaction?.color ?? '#e5e7eb' }}>
        {localizedName(playerFaction?.name ?? '')}
      </span>
    </div>
  );
}
