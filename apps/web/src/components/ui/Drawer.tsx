import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { useOnEscape } from '@/hooks/useOnEscape';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * Right-side drawer used for record details. Takes roughly half the screen so
 * the underlying table stays visible for context.
 */
export function Drawer({
  open,
  onClose,
  header,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useOnEscape(open, onClose);
  useBodyScrollLock(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Закрыть панель"
        onClick={onClose}
        className="anim-fade absolute inset-0 cursor-default bg-black/55"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="anim-slide-right relative z-10 flex h-full w-[52%] min-w-[680px] max-w-[980px] flex-col border-l border-line-2 bg-panel shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.9)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line bg-panel-2 px-5 py-4">
          <div className="min-w-0 flex-1">{header}</div>
          <IconButton icon={X} onClick={onClose} aria-label="Закрыть" />
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-between gap-3 border-t border-line bg-panel-2 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
