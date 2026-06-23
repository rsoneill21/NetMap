interface AlertModalProps {
  title?: string;
  message: string;
  onClose: () => void;
}

export function AlertModal({ title = 'Notice', message, onClose }: AlertModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>{title}</h2>
        <p className="modal-help">{message}</p>
        <div className="modal-actions">
          <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={onClose} autoFocus>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
