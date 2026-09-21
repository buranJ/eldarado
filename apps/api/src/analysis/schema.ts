import { z } from 'zod';

/** Numeric attributes the model may report, by name. */
export const NUMERIC_FIELDS = [
  'kingTowerLevel',
  'collectionLevel',
  'accountLevel',
  'trophies',
  'highestTrophies',
  'unlockedCards',
  'level16Cards',
  'level15Cards',
  'level14Cards',
  'legendaryCards',
  'evolutions',
  'heroes',
  'gems',
  'gold',
  'accountAgeYears',
  'emotes',
  'rareEmotes',
  'towerSkins',
  'banners',
] as const;

/** Boolean attributes describing how the account can change hands. */
export const FLAG_FIELDS = [
  'fullAccess',
  'emailAccess',
  'rebindAvailable',
  'originalEmail',
  'mentionsScreenshots',
] as const;

/**
 * Attributes are returned as lists of found values rather than as one nullable
 * field per attribute. Structured outputs cap the number of union-typed
 * parameters, and this shape sidesteps that entirely while expressing the
 * distinction the pipeline depends on: an attribute the seller did not mention
 * is simply absent, while one they stated as zero is present with value 0.
 * It also keeps output short, since only what was found is written out.
 */
export const ExtractionSchema = z.object({
  numbers: z
    .array(
      z.object({
        field: z.enum(NUMERIC_FIELDS).describe('Какая характеристика'),
        value: z.number().describe('Значение, развёрнутое из сокращений'),
      }),
    )
    .describe('Только те числовые характеристики, которые прямо указаны в заголовке'),

  flags: z
    .array(
      z.object({
        field: z.enum(FLAG_FIELDS).describe('Какое условие'),
        value: z.boolean().describe('true — есть/да, false — прямо указано, что нет'),
      }),
    )
    .describe('Только те условия, о которых продавец прямо написал'),

  restrictions: z
    .string()
    .describe('Заявленные ограничения аккаунта дословно. Пустая строка, если не упомянуты'),

  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('Насколько уверенно характеристики читаются из текста, 0–100'),

  notes: z
    .string()
    .describe('Одно короткое предложение по-русски о том, что заявляет продавец'),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

/** Flattens the list form into a plain attribute map for scoring. */
export const toAttributeMap = (
  extraction: Extraction,
): Record<string, number | boolean | string> => {
  const out: Record<string, number | boolean | string> = {};
  for (const entry of extraction.numbers) out[entry.field] = entry.value;
  for (const entry of extraction.flags) out[entry.field] = entry.value;
  if (extraction.restrictions.trim() !== '') out.restrictions = extraction.restrictions.trim();
  return out;
};
