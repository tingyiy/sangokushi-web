import { useGameStore } from '../store/gameStore';
import { scenarios } from '../data/scenarios';

export function ScenarioSelect() {
  const { phase, selectScenario, selectFaction, factions, setPhase } = useGameStore();

  if (phase === 'scenario') {
    return (
      <div className="screen-center">
        <h2>選擇劇本</h2>
        <div className="scenario-list">
          {scenarios.map(sc => (
            <button
              key={sc.id}
              className="btn btn-scenario"
              onClick={() => selectScenario(sc)}
            >
              <span className="scenario-year">{sc.year}年</span>
              <span className="scenario-name">{sc.name}</span>
              <span className="scenario-desc">{sc.description}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-back" onClick={() => setPhase('title')}>返回</button>
      </div>
    );
  }

  if (phase === 'faction') {
    return (
      <div className="screen-center">
        <h2>選擇勢力</h2>
        <div className="faction-grid">
          {factions.map(f => (
            <button
              key={f.id}
              className="btn btn-faction"
              style={{ borderColor: f.color }}
              onClick={() => selectFaction(f.id)}
            >
              <span className="faction-color" style={{ background: f.color }} />
              <span className="faction-name">{f.name}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-back" onClick={() => setPhase('scenario')}>返回</button>
      </div>
    );
  }

  return null;
}
