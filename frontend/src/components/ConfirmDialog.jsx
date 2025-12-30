import { createPortal } from "react-dom";

function ConfirmDialog({
  open,
  title,
  message,
  cancelText = "Cancel",
  confirmText = "Confirm",
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return createPortal(
    <dialog className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box bg-slate-900 border border-slate-700">
        <h3 className="font-bold text-lg text-slate-200">{title}</h3>

        <p className="py-4 text-slate-400">{message}</p>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onCancel}>
            {cancelText}
          </button>

          <button className="btn btn-error" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>,
    document.body
  );
}

export default ConfirmDialog;
