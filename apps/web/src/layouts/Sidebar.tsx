import { NavLink } from 'react-router-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { NAV_GROUPS, NAV_ITEMS } from '@/config/navigation';
import { GAMES, getGame } from '@/config/games';
import { APP_NAME, APP_VERSION } from '@/config/app';
import { useAppState } from '@/app/providers/app-state-context';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { gameId, setGameId } = useAppState();
  const game = getGame(gameId);

  return (
    <aside className="flex w-[216px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="px-3 pb-3 pt-4">
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-6 items-center justify-center rounded-md border border-line-2 bg-panel-2">
            <span className="flex items-end gap-[2px]">
              <span className="block h-1.5 w-[3px] rounded-[1px] bg-accent" />
              <span className="block h-2.5 w-[3px] rounded-[1px] bg-accent" />
              <span className="block h-3.5 w-[3px] rounded-[1px] bg-pos" />
            </span>
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-ink">{APP_NAME}</span>
        </div>

        <DropdownMenu
          align="start"
          items={GAMES.map((item) => ({
            key: item.id,
            label:
              item.status === 'coming_soon' ? `${item.name} — скоро` : item.name,
            icon: item.id === gameId ? Check : undefined,
            disabled: item.status !== 'active',
            onSelect: () => setGameId(item.id),
          }))}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className={cn(
                'mt-3 flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                open
                  ? 'border-line-3 bg-panel-3'
                  : 'border-line-2 bg-panel-2 hover:border-line-3 hover:bg-panel-3',
              )}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded border border-line-2 text-[9px] font-bold text-ink-2"
                style={{ backgroundColor: '#16161c' }}
              >
                {game.monogram}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink">
                  {game.name}
                </span>
              </span>
              <ChevronsUpDown size={12} className="shrink-0 text-ink-4" />
            </button>
          )}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
              {group.label}
            </p>
            <ul className="space-y-px">
              {NAV_ITEMS.filter((item) => item.group === group.id).map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-md px-2 py-[6px] text-[12.5px] transition-colors',
                        isActive
                          ? 'bg-panel-3 text-ink'
                          : 'text-ink-2 hover:bg-panel-2 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={14}
                          strokeWidth={2}
                          className={isActive ? 'text-accent' : 'text-ink-3'}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.tag ? (
                          <span className="rounded bg-panel-2 px-1 text-[9.5px] uppercase tracking-[0.04em] text-ink-4">
                            {item.tag}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-4">Внутренняя панель</span>
          <span className="num text-[11px] text-ink-4">v{APP_VERSION}</span>
        </div>
      </div>
    </aside>
  );
}
