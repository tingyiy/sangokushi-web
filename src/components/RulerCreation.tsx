import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { localizedName } from '../i18n/dataNames';
import type { Officer, RTK4Skill, Faction } from '../types';

/**
 * RulerCreation Component - Phase 7.1
 * Allows player to create a custom ruler and faction.
 */
export function RulerCreation() {
  const { t } = useTranslation();
  const { setPhase, cities, officers, factions, scenario } = useGameStore();
  
  const [name, setName] = useState(t('ruler.defaultName'));
  const [leadership, setLeadership] = useState(70);
  const [war, setWar] = useState(70);
  const [intelligence, setIntelligence] = useState(70);
  const [politics, setPolitics] = useState(70);
  const [charisma, setCharisma] = useState(70);
  
  // Phase 7.1: Set first empty city as default
  const [startCityId, setStartCityId] = useState(() => {
    const firstEmpty = useGameStore.getState().cities.find(c => c.factionId === null);
    return firstEmpty?.id || 1;
  });
  const [color, setColor] = useState('#ff0000');

  const totalPoints = leadership + war + intelligence + politics + charisma;
  const maxPoints = 350;

  const handleCreate = () => {
    if (totalPoints > maxPoints) {
      alert(t('ruler.pointsExceeded', { max: maxPoints }));
      return;
    }

    if (cities.length === 0) {
      alert(t('ruler.noScenarioError'));
      setPhase('scenario');
      return;
    }

    // Fix Bug #2: Use non-colliding IDs
    const newRulerId = Math.max(...officers.map(o => o.id), 0) + 1;
    const newFactionId = Math.max(...factions.map(f => f.id), 0) + 1;

    // Fix Bug #3: Ensure relationships exists (handled by makeOfficer refactor but good to be safe)
    const newRuler: Officer = {
      id: newRulerId,
      name,
      portraitId: 1, // Default portrait
      birthYear: scenario?.year ? scenario.year - 30 : 160,
      deathYear: scenario?.year ? scenario.year + 50 : 240,
      leadership,
      war,
      intelligence,
      politics,
      charisma,
      skills: ['infantry'] as RTK4Skill[],
      factionId: newFactionId,
      cityId: startCityId,
      stamina: 100,
      loyalty: 100,
      isGovernor: true,
      rank: 'governor',
      relationships: [],
      treasureId: null,
    };

    const newFaction: Faction = {
      id: newFactionId,
      name: t('ruler.factionNameSuffix', { name }),
      rulerId: newRulerId,
      advisorId: null,
      color,
      isPlayer: true,
      relations: {},
      allies: [],
      ceasefires: [],
      hostageOfficerIds: [],
      powOfficerIds: [],
    };

    // Update cities: set ownership of the starting city
    const updatedCities = cities.map(c => 
      c.id === startCityId ? { ...c, factionId: newFactionId, troops: 10000, gold: 5000, food: 10000 } : c
    );

    // Update scenario/store with the new data
    useGameStore.setState({
      factions: [...factions, newFaction],
      officers: [...officers, newRuler],
      cities: updatedCities,
      playerFaction: newFaction,
    });

    setPhase('settings');
  };

  return (
    <div className="ruler-creation-screen">
      <div className="creation-card">
        <h2>{t('ruler.title')}</h2>
        
        <div className="form-group">
          <label htmlFor="ruler-name">{t('ruler.nameLabel')}</label>
          <input id="ruler-name" type="text" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="stats-group">
          <div className="stat-input">
            <label htmlFor="stat-leadership">{t('ruler.leadershipLabel', { value: leadership })}</label>
            <input id="stat-leadership" type="range" min="1" max="100" value={leadership} onChange={e => setLeadership(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-war">{t('ruler.warLabel', { value: war })}</label>
            <input id="stat-war" type="range" min="1" max="100" value={war} onChange={e => setWar(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-intelligence">{t('ruler.intelligenceLabel', { value: intelligence })}</label>
            <input id="stat-intelligence" type="range" min="1" max="100" value={intelligence} onChange={e => setIntelligence(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-politics">{t('ruler.politicsLabel', { value: politics })}</label>
            <input id="stat-politics" type="range" min="1" max="100" value={politics} onChange={e => setPolitics(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-charisma">{t('ruler.charismaLabel', { value: charisma })}</label>
            <input id="stat-charisma" type="range" min="1" max="100" value={charisma} onChange={e => setCharisma(Number(e.target.value))} />
          </div>
          <div className="points-total" style={{ color: totalPoints > maxPoints ? 'red' : 'white' }}>
            {t('ruler.remainingPoints', { points: maxPoints - totalPoints })}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="start-city">{t('ruler.startCity')}</label>
          <select id="start-city" value={startCityId} onChange={e => setStartCityId(Number(e.target.value))}>
            {cities.filter(c => c.factionId === null).map(c => (
              <option key={c.id} value={c.id}>{localizedName(c.name)}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="faction-color">{t('ruler.factionColor')}</label>
          <input id="faction-color" type="color" value={color} onChange={e => setColor(e.target.value)} />
        </div>

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={() => setPhase('scenario')}>{t('common.return')}</button>
          <button className="btn btn-primary" onClick={handleCreate}>{t('ruler.create')}</button>
        </div>
      </div>

      <style>{`
        .ruler-creation-screen {
          width: 100vw;
          height: 100vh;
          background: #0f172a;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
        }
        .creation-card {
          background: #1e293b;
          padding: 40px;
          border-radius: 12px;
          width: 500px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group input, .form-group select {
          padding: 10px;
          background: #334155;
          border: 1px solid #475569;
          color: white;
          border-radius: 4px;
        }
        .stat-input {
          margin-bottom: 10px;
        }
        .stat-input label {
          display: block;
          margin-bottom: 4px;
          font-size: 0.9rem;
        }
        .stat-input input {
          width: 100%;
        }
        .points-total {
          text-align: right;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .action-buttons {
          display: flex;
          gap: 20px;
          margin-top: 30px;
        }
        .btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #64748b; color: white; }
      `}</style>
    </div>
  );
}
