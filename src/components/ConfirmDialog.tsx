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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d151e]/88 backdrop-blur-sm safe-shell safe-scroll"
    >
      <div className="w-full max-w-[min(100%,21rem)] max-h-[90dvh] overflow-y-auto overscroll-contain my-auto rounded-3xl bg-[#14202c] border border-white/16 p-6 text-center shadow-2xl">
        <h2
          id="confirm-dialog-title"
          className="font-display text-[clamp(1.3rem,4.5vw,1.6rem)] font-extrabold text-white [text-wrap:balance]"
        >
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-sm sm:text-base text-[#b8c7d3] leading-snug">
          {message}
        </p>
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full min-h-12 rounded-2xl border border-white/18 font-display font-extrabold text-base text-white active:scale-[0.98] transition-transform cursor-pointer ${
              destructive ? 'bg-[#f0452d] hover:bg-[#e13c24]' : 'bg-[#2459d6] hover:bg-[#1f4ec0]'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 font-bold text-base text-white active:scale-[0.98] transition-transform cursor-pointer"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
