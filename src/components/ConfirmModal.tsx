interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <p className="modal-help">{message}</p>
        <div className="modal-actions">
          <button type="button" className="toolbar-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={onConfirm} autoFocus>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
