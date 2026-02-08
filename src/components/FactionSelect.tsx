import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SelectionMinimap } from './map/SelectionMinimap';
import { Portrait } from './Portrait';

/**
 * FactionSelect Component - Phase 0.5
 * RTK IV style faction selection screen
 * Shows minimap on left, faction cards grid on right
 * Supports pagination for >9 factions
 */
export function FactionSelect() {
  const {
    scenario,
    factions,
    cities,
    officers,
    selectFaction,
    setPhase,
  } = useGameStore();

  // Local state for hover and pagination
  const [hoveredFactionId, setHoveredFactionId] = useState<number | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const FACTIONS_PER_PAGE = 9;
  const totalPages = Math.ceil(factions.length / FACTIONS_PER_PAGE);
  const currentFactions = factions.slice(
    page * FACTIONS_PER_PAGE,
    (page + 1) * FACTIONS_PER_PAGE
  );

  /**
   * Get the ruler officer for a faction
   */
  const getRuler = (factionId: number) => {
    const faction = factions.find(f => f.id === factionId);
    if (!faction) return null;
    return officers.find(o => o.id === faction.rulerId);
  };

  /**
   * Handle faction selection confirmation
   */
  const handleConfirm = () => {
    if (selectedFactionId !== null) {
      selectFaction(selectedFactionId);
    }
  };

  return (
    <div className="faction-select-screen">
      {/* Header bar */}
      <div className="faction-header">
        <span className="scenario-name">{scenario?.name}</span>
        <span className="faction-count">選擇君主 {factions.length}人</span>
        <div className="header-buttons">
          <button
            className="btn btn-confirm"
            onClick={handleConfirm}
            disabled={selectedFactionId === null}
          >
            決定
          </button>
          {totalPages > 1 && (
            <button
              className="btn btn-page"
              onClick={() => setPage((p) => (p + 1) % totalPages)}
            >
              下頁
            </button>
          )}
          <button className="btn btn-abort" onClick={() => setPhase('scenario')}>
            中止
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="faction-select-layout">
        {/* Left: Minimap */}
        <div className="faction-minimap-container">
          <SelectionMinimap
            cities={cities}
            factions={factions}
            highlightFactionId={hoveredFactionId ?? selectedFactionId}
          />
        </div>

        {/* Right: Faction cards grid */}
        <div className="faction-cards-container">
          <div className="faction-cards-grid">
            {currentFactions.map((faction) => {
              const ruler = getRuler(faction.id);
              const isSelected = selectedFactionId === faction.id;
              const isHovered = hoveredFactionId === faction.id;

              return (
                <div
                  key={faction.id}
                  className={`faction-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => setSelectedFactionId(faction.id)}
                  onMouseEnter={() => setHoveredFactionId(faction.id)}
                  onMouseLeave={() => setHoveredFactionId(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedFactionId(faction.id);
                    }
                  }}
                >
                  {/* Faction color banner */}
                  <div
                    className="faction-banner"
                    style={{ backgroundColor: faction.color }}
                  />
                  {/* Ruler portrait */}
                  <div className="faction-portrait">
                    {ruler ? (
                      <Portrait
                        portraitId={ruler.portraitId}
                        name={ruler.name}
                        size="medium"
                      />
                    ) : (
                      <div className="portrait-placeholder">?</div>
                    )}
                  </div>
                  {/* Faction name */}
                  <div className="faction-info">
                    <span className="faction-name">{faction.name}</span>
                    {ruler && (
                      <span className="ruler-name">{ruler.name}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
