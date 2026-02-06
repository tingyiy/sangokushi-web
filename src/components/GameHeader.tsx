import { useGameStore } from '../store/gameStore';

export function GameHeader() {
  const { year, month, playerFaction, cities, officers } = useGameStore();

  const ownCities = cities.filter(c => c.factionId === playerFaction?.id);
  const totalTroops = ownCities.reduce((s, c) => s + c.troops, 0);
  const totalGold = ownCities.reduce((s, c) => s + c.gold, 0);
  const totalFood = ownCities.reduce((s, c) => s + c.food, 0);
  const officerCount = officers.filter(o => o.factionId === playerFaction?.id).length;

  return (
    <div className="game-header">
      <div className="header-left">
        <span className="header-date">{year}年{month}月</span>
        <span className="header-faction" style={{ color: playerFaction?.color }}>
          {playerFaction?.name}
        </span>
      </div>
      <div className="header-right">
        <span>城{ownCities.length}</span>
        <span>將{officerCount}</span>
        <span>兵{totalTroops.toLocaleString()}</span>
        <span>金{totalGold.toLocaleString()}</span>
        <span>糧{totalFood.toLocaleString()}</span>
      </div>
    </div>
  );
}
