import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export function GameLog() {
  const log = useGameStore(s => s.log);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="game-log">
      <h4>戰報</h4>
      <div className="log-entries">
        {log.map((msg, i) => (
          <div key={i} className="log-entry">{msg}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
