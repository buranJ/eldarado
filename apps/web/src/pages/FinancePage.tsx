import { Banknote, Boxes, Percent, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';

const PREVIEW_CARDS = [
  { label: 'Revenue', icon: Wallet },
  { label: 'Net Profit', icon: TrendingUp },
  { label: 'ROI', icon: Percent },
  { label: 'Capital in Inventory', icon: Boxes },
];

const PLANNED = [
  'P&L по играм, источникам и площадкам продажи',
  'Комиссии маркетплейсов и платёжных систем',
  'Движение капитала: закупка, замороженные средства, выплаты',
  'ROI по когортам закупки и срокам оборота',
];

export function FinancePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Финансы"
        subtitle="Финансовая аналитика по операциям закупки и перепродажи"
        actions={<Badge tone="warn">В разработке</Badge>}
      />

      <p className="max-w-[720px] text-[13px] leading-relaxed text-ink-2">
        Финансовая аналитика, P&amp;L, ROI, комиссии маркетплейсов и движение капитала появятся на
        следующем этапе.
      </p>

      <div className="grid grid-cols-4 gap-3">
        {PREVIEW_CARDS.map((card) => (
          <StatCard key={card.label} label={card.label} value="—" icon={card.icon} disabled />
        ))}
      </div>

      <Panel>
        <PanelHeader title="Что появится в разделе" subtitle="Планируемый объём следующего этапа" />
        <ul className="divide-y divide-line">
          {PLANNED.map((item) => (
            <li key={item} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="size-1 rounded-full bg-ink-4" />
              <span className="text-[12.5px] text-ink-2">{item}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <EmptyState
          icon={Banknote}
          title="Графики пока недоступны"
          description="Визуализации будут построены на данных реальных сделок после подключения площадок продажи."
        />
      </Panel>
    </div>
  );
}
