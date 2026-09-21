import {
  Banknote,
  Boxes,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  Sparkles,
  Store,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown as a small trailing tag in the sidebar. */
  tag?: string;
  group: 'pipeline' | 'operations' | 'system';
}

export const NAV_GROUPS: { id: NavItem['group']; label: string }[] = [
  { id: 'pipeline', label: 'Пайплайн' },
  { id: 'operations', label: 'Операции' },
  { id: 'system', label: 'Система' },
];

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Обзор', icon: LayoutDashboard, group: 'pipeline' },
  { to: '/marketplace', label: 'Маркетплейс', icon: Store, group: 'pipeline' },
  { to: '/top-accounts', label: 'Топ аккаунтов', icon: Trophy, group: 'pipeline' },
  { to: '/inventory', label: 'Инвентарь', icon: Boxes, group: 'operations' },
  { to: '/listings', label: 'Объявления', icon: Megaphone, group: 'operations' },
  { to: '/sales', label: 'Продажи', icon: Receipt, group: 'operations' },
  { to: '/ai-analysis', label: 'AI-анализ', icon: Sparkles, group: 'system' },
  { to: '/finance', label: 'Финансы', icon: Banknote, tag: 'скоро', group: 'system' },
  { to: '/settings', label: 'Настройки', icon: Settings, group: 'system' },
];
