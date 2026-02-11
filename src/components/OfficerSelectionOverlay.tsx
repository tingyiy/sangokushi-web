import { useTranslation } from 'react-i18next';
import type { Officer } from '../types';

interface Props {
  officers: Officer[];
  title: string;
  onSelect: (officerId: number) => void;
  onClose: () => void;
}

export function OfficerSelectionOverlay({ officers, title, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="officer-overlay">
      <div className="officer-overlay-header">
        <span>{title}</span>
        <button className="btn btn-cmd" onClick={onClose}>{t('common.close')}</button>
      </div>
      <table className="officer-table">
        <thead>
          <tr>
            <th>{t('officer.colName')}</th>
            <th>{t('officer.colLeadership')}</th>
            <th>{t('officer.colWar')}</th>
            <th>{t('officer.colIntelligence')}</th>
            <th>{t('officer.colPolitics')}</th>
            <th>{t('officer.colCharisma')}</th>
          </tr>
        </thead>
        <tbody>
          {officers.map(o => (
            <tr key={o.id} onClick={() => onSelect(o.id)} style={{ cursor: 'pointer' }}>
              <td>{o.name}</td>
              <td>{o.leadership}</td>
              <td>{o.war}</td>
              <td>{o.intelligence}</td>
              <td>{o.politics}</td>
              <td>{o.charisma}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
