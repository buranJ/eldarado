import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { useOnEscape } from '@/hooks/useOnEscape';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { cn } from '@/utils/cn';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'w-[440px]',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useOnEscape(open, onClose);
  useBodyScrollLock(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="anim-fade absolute inset-0 cursor-default bg-black/65"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'anim-pop relative z-10 overflow-hidden rounded-xl border border-line-2 bg-panel',
          'shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{description}</p>
            ) : null}
          </div>
          <IconButton icon={X} onClick={onClose} aria-label="Закрыть" />
        </header>
        {children ? <div className="px-5 py-4">{children}</div> : null}
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-panel-2 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
