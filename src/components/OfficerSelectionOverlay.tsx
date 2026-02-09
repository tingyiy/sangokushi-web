import type { Officer } from '../types';

interface Props {
  officers: Officer[];
  title: string;
  onSelect: (officerId: number) => void;
  onClose: () => void;
}

export function OfficerSelectionOverlay({ officers, title, onSelect, onClose }: Props) {
  return (
    <div className="officer-overlay">
      <div className="officer-overlay-header">
        <span>{title}</span>
        <button className="btn btn-cmd" onClick={onClose}>結束</button>
      </div>
      <table className="officer-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>統</th>
            <th>武</th>
            <th>智</th>
            <th>政</th>
            <th>魅</th>
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
