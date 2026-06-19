import { useState } from 'react';
import type { ShareSaveResult } from '../lib/share';

interface ShareModalProps {
  currentCode: string | null;
  onSave: () => Promise<ShareSaveResult | null>;
  onSaveAsNew: () => Promise<ShareSaveResult | null>;
  onLoad: (code: string) => Promise<boolean>;
  onClose: () => void;
}

export function ShareModal({ currentCode, onSave, onSaveAsNew, onLoad, onClose }: ShareModalProps) {
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<ShareSaveResult | null>(null);
  const [loadCode, setLoadCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await onSave();
    setSaveResult(result);
    setSaving(false);
  }

  async function handleSaveAsNew() {
    setSaving(true);
    const result = await onSaveAsNew();
    setSaveResult(result);
    setSaving(false);
  }

  async function handleLoad() {
    if (loadCode.trim().length !== 4) return;
    setLoading(true);
    const ok = await onLoad(loadCode.trim());
    setLoading(false);
    if (ok) onClose();
  }

  const displayedCode = saveResult?.code ?? currentCode;
  const displayedExpiry = saveResult?.expiresAt;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Save &amp; Share</h2>
        <p className="modal-help">
          Save the current map to get a 4-character code. The code becomes part of the page URL
          (e.g. <code>netmap.packnation.org/ab3d</code>) — bookmark or share that link directly. Anyone with the
          code/link can load this map for the next 7 days.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : currentCode ? `Update This Link (${currentCode})` : 'Generate Code'}
          </button>
          {currentCode && (
            <button type="button" className="toolbar-btn" onClick={handleSaveAsNew} disabled={saving}>
              {saving ? 'Saving...' : 'Save as New Link'}
            </button>
          )}
        </div>
        {displayedCode && (
          <div className="modal-preview">
            Code: <strong>{displayedCode}</strong>
            {displayedExpiry && ` — expires ${new Date(displayedExpiry).toLocaleString()}`}
          </div>
        )}

        <h2 style={{ marginTop: '1.5rem' }}>Load by Code</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="modal-textarea"
            style={{ minHeight: 'unset', padding: '0.5rem' }}
            value={loadCode}
            onChange={(e) => setLoadCode(e.target.value.slice(0, 4))}
            placeholder="e.g. 2a5d"
            maxLength={4}
            autoFocus
          />
          <button
            type="button"
            className="toolbar-btn toolbar-btn-primary"
            onClick={handleLoad}
            disabled={loading || loadCode.trim().length !== 4}
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        <div className="modal-actions">
          <button type="button" className="toolbar-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
