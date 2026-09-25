import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface MenuItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'success';
  separatorBefore?: boolean;
}

interface Position {
  top: number;
  left: number;
  right: number;
}

export function DropdownMenu({
  trigger,
  items,
  align = 'end',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  /* Measured after opening so no ref is read while rendering. */
  useLayoutEffect(() => {
    if (!open) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      /* The menu is portalled, so it is not inside the anchor element. */
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  return (
    <div ref={anchorRef} className="relative inline-flex">
      {trigger({ open, toggle })}
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="anim-pop fixed z-50 min-w-[184px] overflow-hidden rounded-lg border border-line-2 bg-panel-3 py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]"
              style={{
                top: position.top,
                left: align === 'start' ? position.left : undefined,
                right: align === 'end' ? position.right : undefined,
              }}
            >
              {items.map((item) => (
                <div key={item.key}>
                  {item.separatorBefore ? <div className="my-1 h-px bg-line-2" /> : null}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      close();
                      item.onSelect?.();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors',
                      'disabled:pointer-events-none disabled:text-ink-4',
                      item.tone === 'danger'
                        ? 'text-neg hover:bg-[#2a1518]'
                        : item.tone === 'success'
                          ? 'text-pos hover:bg-[#11291a]'
                          : 'text-ink-2 hover:bg-panel-4 hover:text-ink',
                    )}
                  >
                    {item.icon ? <item.icon size={13} strokeWidth={2} /> : null}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
