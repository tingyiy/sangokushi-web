import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Officer, RTK4Skill, Faction } from '../types';

/**
 * RulerCreation Component - Phase 7.1
 * Allows player to create a custom ruler and faction.
 */
export function RulerCreation() {
  const { setPhase, cities, officers, factions, scenario } = useGameStore();
  
  const [name, setName] = useState('新君主');
  const [leadership, setLeadership] = useState(70);
  const [war, setWar] = useState(70);
  const [intelligence, setIntelligence] = useState(70);
  const [politics, setPolitics] = useState(70);
  const [charisma, setCharisma] = useState(70);
  const [startCityId, setStartCityId] = useState(1);
  const [color, setColor] = useState('#ff0000');

  const totalPoints = leadership + war + intelligence + politics + charisma;
  const maxPoints = 350;

  const handleCreate = () => {
    if (totalPoints > maxPoints) {
      alert(`能力點數總和不能超過 ${maxPoints}！`);
      return;
    }

    const newRulerId = 1000 + Math.floor(Math.random() * 9000);
    const newFactionId = 100 + Math.floor(Math.random() * 900);

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
      skills: ['步兵'] as RTK4Skill[],
      factionId: newFactionId,
      cityId: startCityId,
      stamina: 100,
      loyalty: 100,
      isGovernor: true,
      rank: '太守',
      relationships: [],
      treasureId: null,
    };

    const newFaction: Faction = {
      id: newFactionId,
      name: `${name}勢力`,
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
        <h2>新君主登錄</h2>
        
        <div className="form-group">
          <label htmlFor="ruler-name">姓名</label>
          <input id="ruler-name" type="text" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="stats-group">
          <div className="stat-input">
            <label htmlFor="stat-leadership">統率 ({leadership})</label>
            <input id="stat-leadership" type="range" min="1" max="100" value={leadership} onChange={e => setLeadership(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-war">武力 ({war})</label>
            <input id="stat-war" type="range" min="1" max="100" value={war} onChange={e => setWar(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-intelligence">智力 ({intelligence})</label>
            <input id="stat-intelligence" type="range" min="1" max="100" value={intelligence} onChange={e => setIntelligence(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-politics">政治 ({politics})</label>
            <input id="stat-politics" type="range" min="1" max="100" value={politics} onChange={e => setPolitics(Number(e.target.value))} />
          </div>
          <div className="stat-input">
            <label htmlFor="stat-charisma">魅力 ({charisma})</label>
            <input id="stat-charisma" type="range" min="1" max="100" value={charisma} onChange={e => setCharisma(Number(e.target.value))} />
          </div>
          <div className="points-total" style={{ color: totalPoints > maxPoints ? 'red' : 'white' }}>
            剩餘點數: {maxPoints - totalPoints}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="start-city">根據地</label>
          <select id="start-city" value={startCityId} onChange={e => setStartCityId(Number(e.target.value))}>
            {cities.filter(c => c.factionId === null).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="faction-color">旗幟顏色</label>
          <input id="faction-color" type="color" value={color} onChange={e => setColor(e.target.value)} />
        </div>

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={() => setPhase('scenario')}>返回</button>
          <button className="btn btn-primary" onClick={handleCreate}>建立君主</button>
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
