import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface SaveLoadMenuProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'load';
}

/**
 * SaveLoadMenu Component
 * Provides UI for saving and loading games with 3 slots (RTK IV style).
 * Phase 0.2: Save/Load system implementation.
 */
const SaveLoadMenu: React.FC<SaveLoadMenuProps> = ({ isOpen, onClose, mode }) => {
  const { saveGame, loadGame, getSaveSlots, deleteSave, year, month, playerFaction } = useGameStore();
  const [saveSlots, setSaveSlots] = useState<{ slot: number; date: string | null; version: string | null }[]>([]);
  const [message, setMessage] = useState<string>('');

  // Refresh save slots when menu opens
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setSaveSlots(getSaveSlots());
        setMessage('');
      });
    }
  }, [isOpen, getSaveSlots]);

  const handleSlotClick = (slot: number) => {
    if (mode === 'save') {
      const success = saveGame(slot);
      if (success) {
        setMessage(`已儲存至存檔 ${slot}`);
        setSaveSlots(getSaveSlots());
      } else {
        setMessage('儲存失敗！');
      }
    } else {
      const success = loadGame(slot);
      if (success) {
        onClose();
      } else {
        setMessage('載入失敗！');
      }
    }
  };

  const handleDelete = (slot: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`確定要刪除存檔 ${slot} 嗎？`)) {
      deleteSave(slot);
      setSaveSlots(getSaveSlots());
      setMessage(`存檔 ${slot} 已刪除`);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '空存檔';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#2a2a3a',
          border: '2px solid #555',
          borderRadius: '8px',
          padding: '30px',
          minWidth: '400px',
          maxWidth: '500px',
        }}
      >
        <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>
          {mode === 'save' ? '儲存遊戲' : '載入遊戲'}
        </h2>

        {message && (
          <div
            style={{
              padding: '10px',
              marginBottom: '15px',
              background: message.includes('失敗') ? '#4a0000' : '#004a00',
              color: '#fff',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          {saveSlots.map((slot) => (
            <div
              key={slot.slot}
              onClick={() => handleSlotClick(slot.slot)}
              style={{
                padding: '15px',
                marginBottom: '10px',
                background: slot.date ? '#3a3a4a' : '#2a2a3a',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#4a4a5a')}
              onMouseOut={(e) => (e.currentTarget.style.background = slot.date ? '#3a3a4a' : '#2a2a3a')}
            >
              <div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>
                  存檔 {slot.slot}
                </div>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>
                  {formatDate(slot.date)}
                  {slot.version && ` · v${slot.version}`}
                </div>
              </div>
              {mode === 'save' && slot.date && (
                <button
                  onClick={(e) => handleDelete(slot.slot, e)}
                  style={{
                    padding: '5px 10px',
                    background: '#600',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  刪除
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 30px',
              background: '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            取消
          </button>
        </div>

        {mode === 'save' && (
          <div style={{ marginTop: '15px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
            目前進度: {year}年{month}月 · {playerFaction?.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaveLoadMenu;
