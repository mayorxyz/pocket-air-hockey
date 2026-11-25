import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const BUTTON =
  'w-full min-w-0 min-h-11 px-3 py-2 rounded-xl text-sm leading-tight cursor-pointer transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d151e]/90 backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-sm max-h-full flex flex-col rounded-3xl bg-[#14202c] border border-white/15 text-center shadow-2xl">
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pb-1">
          <h2
            id="confirm-dialog-title"
            className="font-display m-0 text-xl font-extrabold text-white leading-tight [text-wrap:balance]"
          >
            {title}
          </h2>
          <p id="confirm-dialog-desc" className="m-0 mt-2 text-sm text-[#b8c7d3] leading-relaxed">
            {message}
          </p>
        </div>
        <div className="shrink-0 grid grid-cols-2 gap-2 p-4 pt-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className={`${BUTTON} bg-white/12 hover:bg-white/18 font-bold text-white`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${BUTTON} font-display font-extrabold text-white ${
              destructive ? 'bg-[#c9301a] hover:bg-[#b02a16]' : 'bg-[#2459d6] hover:bg-[#1e4ec0]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};