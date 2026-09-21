import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import type { Toast, ToastTone } from '@/app/providers/toast-context';
import { cn } from '@/utils/cn';

const ICONS: Record<ToastTone, typeof Check> = {
  default: Info,
  success: Check,
  error: AlertTriangle,
  info: Info,
};

const TONES: Record<ToastTone, string> = {
  default: 'text-ink-2',
  success: 'text-pos',
  error: 'text-neg',
  info: 'text-info',
};

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[340px] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            className="anim-pop pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line-2 bg-panel-3 px-3.5 py-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]"
          >
            <Icon size={14} className={cn('mt-px shrink-0', TONES[toast.tone])} strokeWidth={2.2} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-ink">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Скрыть"
              onClick={() => onDismiss(toast.id)}
              className="mt-px shrink-0 text-ink-4 transition-colors hover:text-ink-2"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
