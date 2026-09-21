import { getGame } from '@/config/games';
import { cn } from '@/utils/cn';

/** Identity cell shared by every account-bearing table. */
export function AccountCell({
  id,
  title,
  gameId,
  className,
}: {
  id: string;
  title: string;
  gameId: string;
  className?: string;
}) {
  const game = getGame(gameId);
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded border border-line-2 bg-panel-2 text-[9.5px] font-bold text-ink-2"
        title={game.name}
      >
        {game.monogram}
      </span>
      <div className="min-w-0">
        <div className="num text-[12px] font-medium text-ink">{id}</div>
        <div className="max-w-[236px] truncate text-[11.5px] text-ink-3" title={title}>
          {title}
        </div>
      </div>
    </div>
  );
}
