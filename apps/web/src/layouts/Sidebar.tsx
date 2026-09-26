import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Check, ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { IconButton } from '@/components/ui/Button';
import { NAV_GROUPS, NAV_ITEMS } from '@/config/navigation';
import { GAMES, getGame } from '@/config/games';
import { APP_NAME } from '@/config/app';
import { useAppState } from '@/app/providers/app-state-context';
import { cn } from '@/utils/cn';

const SIDEBAR_STATE_KEY = 'gamestock.sidebar.collapsed';

const initialCollapsedState = (): boolean => {
  try {
    const saved = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(max-width: 767px)').matches;
  } catch {
    return false;
  }
};

export function Sidebar() {
  const { gameId, setGameId } = useAppState();
  const game = getGame(gameId);
  const [collapsed, setCollapsed] = useState(initialCollapsedState);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STATE_KEY, String(next));
      } catch {
        // The navigation still works when browser storage is unavailable.
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200',
        collapsed ? 'w-[56px]' : 'w-[216px]',
      )}
    >
      <div className={cn('pb-3 pt-4', collapsed ? 'px-2' : 'px-3')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2 px-1')}>
          {!collapsed ? (
            <>
              <span className="flex size-6 items-center justify-center rounded-md border border-line-2 bg-panel-2">
                <span className="flex items-end gap-[2px]">
                  <span className="block h-1.5 w-[3px] rounded-[1px] bg-accent" />
                  <span className="block h-2.5 w-[3px] rounded-[1px] bg-accent" />
                  <span className="block h-3.5 w-[3px] rounded-[1px] bg-pos" />
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.02em] text-ink">
                {APP_NAME}
              </span>
            </>
          ) : null}
          <IconButton
            icon={collapsed ? PanelLeftOpen : PanelLeftClose}
            size="xs"
            variant="ghost"
            title={collapsed ? 'Показать навигацию' : 'Скрыть навигацию'}
            aria-label={collapsed ? 'Показать навигацию' : 'Скрыть навигацию'}
            onClick={toggleCollapsed}
          />
        </div>

        <div className={cn('mt-3', collapsed && 'flex justify-center')}>
          <DropdownMenu
            align="start"
            items={GAMES.map((item) => ({
              key: item.id,
              label: item.name,
              icon: item.id === gameId ? Check : undefined,
              onSelect: () => setGameId(item.id),
            }))}
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                title={collapsed ? game.name : undefined}
                aria-label={collapsed ? `Выбрать игру. Сейчас ${game.name}` : undefined}
                className={cn(
                  'flex items-center rounded-md border text-left transition-colors',
                  collapsed ? 'size-8 justify-center p-0' : 'w-[190px] gap-2 px-2 py-1.5',
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
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">
                        {game.name}
                      </span>
                    </span>
                    <ChevronsUpDown size={12} className="shrink-0 text-ink-4" />
                  </>
                ) : null}
              </button>
            )}
          />
        </div>
      </div>

      <nav className={cn('flex-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className={cn(collapsed ? 'mb-2' : 'mb-4')}>
            {collapsed ? (
              <div className="mx-2 mb-2 h-px bg-line" />
            ) : (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                {group.label}
              </p>
            )}
            <ul className="space-y-px">
              {NAV_ITEMS.filter((item) => item.group === group.id).map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center rounded-md py-[6px] text-[12.5px] transition-colors',
                        collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
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
                        {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                        {!collapsed && item.tag ? (
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

    </aside>
  );
}
