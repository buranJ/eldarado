import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'pos'
  | 'warn'
  | 'neg'
  | 'info'
  | 'violet'
  | 'muted';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-panel-3 text-ink-2 border-line-2',
  muted: 'bg-transparent text-ink-3 border-line',
  accent: 'bg-[#161b33] text-[#93a8ff] border-[#2b3566]',
  pos: 'bg-[#11291a] text-[#59c96c] border-[#22492e]',
  warn: 'bg-[#2a2011] text-[#e0a83a] border-[#4d3b1a]',
  neg: 'bg-[#2a1518] text-[#f0666a] border-[#4d2429]',
  info: 'bg-[#122234] text-[#58a6ff] border-[#1f3c5c]',
  violet: 'bg-[#221934] text-[#b58cf7] border-[#3c2b58]',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-1.5 py-px text-[11px] font-medium leading-[18px] whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}
