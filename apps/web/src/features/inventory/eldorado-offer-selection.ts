import type { EldoradoPublishPreview } from '@/api/client';

export interface EldoradoOfferSelection {
  tradeEnvironmentId: string;
  offerAttributes: Record<string, string>;
  numericAttributes: Record<string, number>;
}

export const initialOfferSelection = (
  preview: EldoradoPublishPreview,
): EldoradoOfferSelection => ({
  tradeEnvironmentId: preview.defaultTradeEnvironmentId ?? '',
  offerAttributes: {},
  numericAttributes: {},
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
  ...preview.requiredNumericAttributes
    .filter((attribute) => {
      const value = selection.numericAttributes[attribute.id];
      return !Number.isFinite(value) || value < attribute.minValue || value > attribute.maxValue ||
        Number(value.toFixed(attribute.precision)) !== value;
    })
    .map((attribute) => attribute.name),
];
