import { ArrowUpRight, Boxes, Check, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { DataField, FieldGroup } from '@/components/DataField';
import { ScoreMeter } from '@/components/ScoreBadge';
import { RiskMeter } from '@/components/RiskBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getMarketplace } from '@/config/marketplaces';
import { getGame } from '@/config/games';
import { formatDateTime, formatRelative } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import {
  NO_DATA,
  formatBool,
  formatCount,
  formatNumber,
  formatPercent,
  formatRating,
  orNoData,
} from '@/utils/format';
import type { GameAccount } from '@gamestock/domain';

const nd = (value: number | null, formatter = formatNumber): string =>
  value === null ? NO_DATA : formatter(value);

const ATTRIBUTE_LABELS: Record<string, string> = {
  accountLevel: 'Уровень аккаунта',
  researchLevel: 'Уровень исследования',
  rank: 'Ранг',
  offerType: 'Тип предложения',
  mythicSkins: 'Мифические скины',
  upgradableWeapons: 'Прокачиваемое оружие',
  killFeedMessages: 'Kill-feed сообщения',
  sportsCars: 'Спортивные автомобили',
  vinyls: 'Винилы',
  cars: 'Автомобили',
  coins: 'Монеты',
  playtimeHours: 'Часы игры',
  gold: 'Gold',
};

export function AccountDrawer({
  account,
  open,
  onClose,
  onApprove,
  onReject,
  onBuy,
}: {
  account: GameAccount | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onBuy: (account: GameAccount) => void;
}) {
  const navigate = useNavigate();
  if (!account) return null;

  const { source, gameData, transfer, analysis } = account;
  const game = getGame(account.gameId);
  const sourceMarketplace = getMarketplace(source.marketplace);
  const purchased = account.status === 'purchased';
  const sourceAttributes = Object.entries(gameData.sourceAttributes).filter(
    ([key, value]) => key !== 'titleEn' && value !== null && value !== '',
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      header={
        <div>
          <div className="flex items-center gap-2">
            <span className="num text-[14px] font-semibold text-ink">
              {account.source.listingId}
            </span>
            <StatusBadge domain="account" status={account.status} />
            {(account.tags ?? []).map((tag) => (
              <Badge key={tag} tone="muted">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="mt-1 truncate text-[12.5px] text-ink-3" title={source.title}>
            {source.title}
          </p>
        </div>
      }
      footer={
        <>
          <p className="text-[11.5px] text-ink-4">
            Найден {formatRelative(source.foundAt)} · обновлён {formatRelative(source.lastSeenAt)}
          </p>
          <div className="flex items-center gap-2">
            {purchased ? (
              <Button variant="primary" icon={Boxes} onClick={() => navigate('/inventory')}>
                Перейти в инвентарь
              </Button>
            ) : (
              <>
                <Button
                  variant="danger"
                  icon={X}
                  onClick={() => onReject(account.id)}
                  disabled={account.status === 'rejected'}
                >
                  Отклонить
                </Button>
                <Button
                  variant="success"
                  icon={Check}
                  onClick={() => onApprove(account.id)}
                >
                  Одобрить и в инвентарь
                </Button>
                <Button variant="primary" icon={ShoppingCart} onClick={() => onBuy(account)}>
                  Купить · {formatMoney(source.price)}
                </Button>
              </>
            )}
          </div>
        </>
      }
    >
      {analysis ? (
        <div className="border-b border-line bg-panel-2 px-5 py-4">
          <div className="grid grid-cols-3 gap-3">
            <ScoreMeter score={analysis.dealScore} kind="deal" label="Deal Score" />
            <ScoreMeter score={analysis.qualityScore} kind="quality" label="Quality Score" />
            <RiskMeter score={analysis.riskScore} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            <SummaryTile label="Рыночная оценка" value={formatMoney(analysis.estimatedMarketValue)} />
            <SummaryTile
              label="Рекомендуемая цена"
              value={formatMoney(analysis.recommendedResalePrice)}
              accent
            />
            <SummaryTile
              label="Ожидаемая прибыль"
              value={formatMoney(analysis.estimatedProfit, { signed: true })}
              positive={analysis.estimatedProfit.amount > 0}
            />
            <SummaryTile
              label="Ожидаемая маржа"
              value={formatPercent(analysis.estimatedMarginPercent, { signed: true })}
              positive={analysis.estimatedMarginPercent > 0}
            />
          </div>
        </div>
      ) : (
        <div className="border-b border-line bg-panel-2 px-5 py-4">
          <p className="text-[12.5px] text-ink-3">
            Аккаунт ещё не проходил AI-анализ. Оценки появятся после ближайшего прогона модели.
          </p>
        </div>
      )}

      <div className="divide-y divide-line">
        {source.imageUrls.length ? (
          <div className="grid grid-cols-2 gap-2 px-5 py-4">
            {source.imageUrls.map((imageUrl, index) => (
              <img
                key={imageUrl}
                src={imageUrl}
                alt={`Фото аккаунта ${source.listingId} — ${index + 1}`}
                className="h-52 w-full rounded-lg border border-line object-contain"
              />
            ))}
          </div>
        ) : null}
        <FieldGroup title="Основное">
          <div>
            <DataField label="Игра" value={game.name} />
            <DataField label="Источник" value={<MarketplaceBadge id={source.marketplace} />} />
            <DataField label="ID объявления" value={source.listingId} mono />
            <DataField label="Цена покупки" value={formatMoney(source.price)} mono />
            <DataField label="Определённая валюта" value={source.detectedCurrency} />
            <DataField label="Автовыдача" value={formatBool(source.autoDelivery)} />
          </div>
          <div>
            <DataField label="Продавец" value={source.seller.name} />
            <DataField label="Рейтинг продавца" value={formatRating(source.seller.rating)} mono />
            <DataField
              label="Отзывы продавца"
              value={nd(source.seller.reviewsCount)}
              mono
            />
            <DataField
              label="Возраст аккаунта продавца"
              value={
                source.seller.accountAgeMonths === null
                  ? NO_DATA
                  : `${source.seller.accountAgeMonths} мес.`
              }
              mono
            />
            <DataField
              label="Полнота данных"
              value={account.dataQuality === null ? NO_DATA : `${account.dataQuality}%`}
              mono
            />
            <DataField
              label="Достоверность анализа"
              value={analysis ? `${analysis.analysisConfidence}%` : NO_DATA}
              mono
            />
          </div>
          <div className="col-span-2 mt-3">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-panel-2 px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-line-3 hover:text-ink"
            >
              Открыть на {sourceMarketplace.name}
              <ArrowUpRight size={13} />
            </a>
          </div>
        </FieldGroup>

        {account.gameId === 'clash-royale' ? (
          <>
            <FieldGroup title="Прокачка">
              <div>
                <DataField
                  label="Уровень Королевской башни"
                  value={nd(gameData.kingTowerLevel)}
                  mono
                />
                <DataField label="Уровень коллекции" value={nd(gameData.collectionLevel)} mono />
                <DataField label="Арена" value={orNoData(gameData.arenaName)} />
                <DataField label="Трофеи" value={nd(gameData.trophies)} mono />
                <DataField
                  label="Открытые карты"
                  value={formatCount(gameData.unlockedCards, gameData.totalCards, NO_DATA)}
                  mono
                />
                <DataField label="Всего карт в игре" value={nd(gameData.totalCards)} mono />
              </div>
              <div>
                <DataField label="Карты 16 уровня" value={nd(gameData.level16Cards)} mono />
                <DataField label="Карты 15 уровня" value={nd(gameData.level15Cards)} mono />
                <DataField label="Карты 14 уровня" value={nd(gameData.level14Cards)} mono />
                <DataField label="Эволюции" value={nd(gameData.evolutions)} mono />
                <DataField label="Герои" value={nd(gameData.heroes)} mono />
              </div>
            </FieldGroup>

            <FieldGroup title="Ресурсы">
              <div>
                <DataField label="Кристаллы" value={nd(gameData.gems)} mono />
              </div>
              <div>
                <DataField label="Золото" value={nd(gameData.gold)} mono />
              </div>
            </FieldGroup>

            <FieldGroup title="Коллекционные предметы">
              <div>
                <DataField
                  label="Возраст аккаунта"
                  value={
                    gameData.accountAgeYears === null
                      ? NO_DATA
                      : `${gameData.accountAgeYears} г.`
                  }
                  mono
                />
                <DataField label="Эмоции" value={nd(gameData.emotes)} mono />
              </div>
              <div>
                <DataField label="Редкие эмоции" value={nd(gameData.rareEmotes)} mono />
                <DataField label="Скины башен" value={nd(gameData.towerSkins)} mono />
                <DataField label="Баннеры" value={nd(gameData.banners)} mono />
              </div>
            </FieldGroup>

            <FieldGroup title="Соревновательные показатели">
              <div>
                <DataField label="Текущие трофеи" value={nd(gameData.trophies)} mono />
                <DataField label="Рекорд трофеев" value={nd(gameData.highestTrophies)} mono />
              </div>
              <div>
                <DataField label="Top Global" value={orNoData(gameData.achievements.topGlobal)} />
                <DataField
                  label="Гранд-турнир"
                  value={orNoData(gameData.achievements.grandTournament)}
                />
                <DataField
                  label="Испытание 20 побед"
                  value={orNoData(gameData.achievements.twentyWinChallenge)}
                />
              </div>
            </FieldGroup>
          </>
        ) : (
          <FieldGroup title="Характеристики объявления">
            {sourceAttributes.length ? (
              sourceAttributes.map(([key, value]) => (
                <DataField
                  key={key}
                  label={ATTRIBUTE_LABELS[key] ?? key}
                  value={typeof value === 'boolean' ? formatBool(value) : String(value)}
                  mono={typeof value === 'number'}
                />
              ))
            ) : (
              <p className="text-[12px] text-ink-4">Структурированные данные не найдены</p>
            )}
          </FieldGroup>
        )}

        <FieldGroup title="Передача аккаунта">
          <div>
            <DataField label="Полный доступ" value={formatBool(transfer.fullAccess)} />
            <DataField label="Доступ к почте" value={formatBool(transfer.emailAccess)} />
            <DataField label="Перепривязка" value={formatBool(transfer.rebindAvailable)} />
          </div>
          <div>
            <DataField label="Оригинальная почта" value={formatBool(transfer.originalEmail)} />
            <DataField label="Ограничения" value={orNoData(transfer.restrictions)} />
          </div>
        </FieldGroup>

        {analysis ? (
          <FieldGroup title="AI-анализ" columns={1}>
            <p className="max-w-[720px] text-[12.5px] leading-relaxed text-ink-2">
              {analysis.summary}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-3">
                  Сильные стороны
                </h4>
                {analysis.strengths.length === 0 ? (
                  <p className="text-[12px] text-ink-4">Не выделены</p>
                ) : (
                  <ul className="space-y-1">
                    {analysis.strengths.map((item) => (
                      <li key={item} className="flex gap-2 text-[12px] text-ink-2">
                        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-pos" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-3">
                  Риски
                </h4>
                {analysis.risks.length === 0 ? (
                  <p className="text-[12px] text-ink-4">Существенных рисков не выявлено</p>
                ) : (
                  <ul className="space-y-1">
                    {analysis.risks.map((item) => (
                      <li key={item} className="flex gap-2 text-[12px] text-ink-2">
                        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-warn" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <Panel className="mt-4 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-3">
                  Составляющие Quality Score
                </span>
                <span className="text-[11px] text-ink-4">
                  {analysis.modelVersion} · {formatDateTime(analysis.analyzedAt)}
                </span>
              </div>
              <div className="space-y-2">
                {analysis.qualityFactors.map((factor) => (
                  <div key={factor.key} className="flex items-center gap-3">
                    <span className="w-[190px] shrink-0 text-[12px] text-ink-2">
                      {factor.label}
                    </span>
                    <span className="num w-9 shrink-0 text-[11px] text-ink-4">
                      {Math.round(factor.weight * 100)}%
                    </span>
                    <ProgressBar value={factor.score} className="w-full flex-1" />
                    <span className="num w-7 shrink-0 text-right text-[12px] text-ink">
                      {factor.score}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <p className="mt-3 text-[11.5px] text-ink-4">
              Оценка построена на {analysis.comparableListings} сопоставимых объявлениях.
            </p>
          </FieldGroup>
        ) : null}
      </div>
    </Drawer>
  );
}

function SummaryTile({
  label,
  value,
  accent = false,
  positive = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2.5">
      <p className="text-[11px] text-ink-3">{label}</p>
      <p
        className={`num mt-1 text-[15px] font-semibold ${
          accent ? 'text-[#93a8ff]' : positive ? 'text-pos' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
