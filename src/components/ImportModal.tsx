import { useState } from 'react';
import { splitIntoBlocks, detectFormat } from '../lib/parser';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface ImportModalProps {
  onImport: (raw: string) => void;
  onClose: () => void;
}

export function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [text, setText] = useState('');
  const debouncedText = useDebouncedValue(text, 250);

  const blocks = splitIntoBlocks(debouncedText);
  const detected = blocks.map(detectFormat);
  const recognized = detected.filter((f) => f !== 'unknown').length;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Paste Device Output</h2>
        <p className="modal-help">
          Paste one or more device outputs — VyOS <code>show int</code> or Linux <code>ip a</code>. Multiple
          devices can be pasted together.
        </p>
        <textarea
          className="modal-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="vyos@RED-SCR> show int&#10;...&#10;&#10;net6_student6@red-host-1:~$ ip a&#10;..."
          rows={14}
          autoFocus
        />
        <div className="modal-preview">
          {blocks.length > 0
            ? `${blocks.length} block(s) detected — ${recognized} recognized`
            : 'No blocks detected yet'}
        </div>
        <div className="modal-actions">
          <button type="button" className="toolbar-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="toolbar-btn toolbar-btn-primary"
            disabled={text.trim().length === 0}
            onClick={() => {
              onImport(text);
              onClose();
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
