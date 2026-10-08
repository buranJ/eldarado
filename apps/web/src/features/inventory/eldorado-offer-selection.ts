import type { EldoradoPublishPreview } from '@/api/client';

export interface EldoradoOfferSelection {
  tradeEnvironmentId: string;
  offerAttributes: Record<string, string>;
}

export const initialOfferSelection = (
  preview: EldoradoPublishPreview,
): EldoradoOfferSelection => ({
  tradeEnvironmentId: preview.defaultTradeEnvironmentId ?? '',
  offerAttributes: {},
});

export const missingOfferOptions = (
  preview: EldoradoPublishPreview,
  selection: EldoradoOfferSelection,
): string[] => [
  ...(preview.tradeEnvironments.length > 0 && !selection.tradeEnvironmentId
    ? [preview.tradeEnvironments[0]?.name ?? 'Параметр игры']
    : []),
  ...preview.requiredAttributes
    .filter((attribute) => !selection.offerAttributes[attribute.id])
    .map((attribute) => attribute.name),
];
