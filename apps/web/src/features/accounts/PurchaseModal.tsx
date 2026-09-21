import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { formatMoney } from '@/utils/money';
import { formatPercent } from '@/utils/format';
import { riskLevel } from '@/config/scoring';
import type { GameAccount } from '@gamestock/domain';

export function PurchaseModal({
  account,
  open,
  onClose,
  onConfirm,
}: {
  account: GameAccount | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (accountId: string) => void;
}) {
  if (!account) return null;
  const analysis = account.analysis;
  const highRisk = analysis ? riskLevel(analysis.riskScore) === 'high' : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="w-[460px]"
      title="Подтвердить покупку аккаунта?"
      description={`${account.source.listingId} · ${account.source.title}`}
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm(account.id);
              onClose();
            }}
          >
            Подтвердить
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-line rounded-md border border-line bg-panel-2">
        <Row label="Источник" value={<MarketplaceBadge id={account.source.marketplace} />} />
        <Row
          label="Цена покупки"
          value={
            <span className="num text-[14px] font-semibold text-ink">
              {formatMoney(account.source.price)}
            </span>
          }
        />
        <Row
          label="Deal Score"
          value={analysis ? <ScoreBadge score={analysis.dealScore} showLabel /> : '—'}
        />
        <Row label="Risk Score" value={analysis ? <RiskBadge score={analysis.riskScore} /> : '—'} />
        <Row
          label="Рекомендуемая цена продажи"
          value={
            <span className="num text-[13px] text-ink">
              {formatMoney(analysis?.recommendedResalePrice)}
            </span>
          }
        />
        <Row
          label="Ожидаемая прибыль"
          value={
            <span className="num text-[13px] font-medium text-pos">
              {formatMoney(analysis?.estimatedProfit, { signed: true })}
              {analysis ? (
                <span className="ml-1.5 text-[12px] text-ink-3">
                  {formatPercent(analysis.estimatedMarginPercent, { signed: true })}
                </span>
              ) : null}
            </span>
          }
        />
      </dl>

      {highRisk ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-[#4d2429] bg-[#2a1518] px-3 py-2.5">
          <AlertTriangle size={13} className="mt-px shrink-0 text-neg" />
          <p className="text-[12px] leading-relaxed text-[#f0a0a2]">
            Высокий уровень риска. Проверьте условия передачи аккаунта и репутацию продавца перед
            покупкой.
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-4">
        Система только фиксирует покупку: оплату на площадке-источнике нужно провести вручную.
        Аккаунт появится в инвентаре со статусом «Куплен».
      </p>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
