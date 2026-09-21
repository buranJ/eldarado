import { Badge } from './ui/Badge';
import type { BadgeTone } from './ui/Badge';
import { STATUS_MAPS } from '@/config/statuses';
import type { StatusDomain } from '@/config/statuses';

/** Renders a localized status chip for any domain entity. */
export function StatusBadge({
  domain,
  status,
  dot = true,
}: {
  domain: StatusDomain;
  status: string;
  dot?: boolean;
}) {
  const def = STATUS_MAPS[domain][status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return (
    <Badge tone={def.tone} dot={dot}>
      {def.label}
    </Badge>
  );
}
