export type TranslationRule = readonly [RegExp, string];

export const COMMON_ACCOUNT_RULES: readonly TranslationRule[] = [
  [/без\s+блокиров(?:ок|ки)|без\s+бан(?:ов|а)/giu, 'no bans'],
  [/полный\s+доступ/giu, 'full access'],
  [/родн(?:ая|ой)\s+почт(?:а|ой)/giu, 'original email'],
  [/перв(?:ая|ой)\s+почт(?:а|ой)/giu, 'original email'],
  [/почт(?:а|ой)/giu, 'email'],
  [/перепривя(?:зка|зки|зать|зывается|зкой)/giu, 'rebind available'],
  [/а?авто[\s-]*выдач(?:а|ей|у)/giu, 'instant delivery'],
  [/аккаунт\s+для\s+новичк(?:а|ов)|акк\s+для\s+новичк(?:а|ов)/giu, 'starter account'],
  [/аккаунт\s+под\s+основ(?:у|ы)|акк\s+под\s+основ(?:у|ы)/giu, 'main account'],
  [/личн(?:ый|ого)\s+(?:аккаунт|акк)/giu, 'personal account'],
  [/олд\s+(?:аккаунт|акк)/giu, 'veteran account'],
  [/топ(?:овый|-аккаунт)?\s+(?:аккаунт|акк)?/giu, 'top account'],
  [/хорош(?:ий|его|ая)\s+(?:аккаунт|акк)/giu, 'good account'],
  [/жирн(?:ый|ого)\s+(?:аккаунт|акк)?/giu, 'high-value account'],
  [/прода(?:ю|м|ется|жа)\s+(?:аккаунт|акк)?/giu, 'account for sale'],
  [/отдаю\s+(?:аккаунт|акк)?/giu, 'account for sale'],
  [/акк(?:аунт|анут|аунт)?/giu, 'account'],
  [/акаунт/giu, 'account'],
  [/инвентар(?:ь|я)/giu, 'inventory'],
  [/редк(?:ие|их)\s+предмет(?:ы|ов)/giu, 'rare items'],
  [/срочн(?:ая|о)\s+продаж(?:а|и)/giu, 'urgent sale'],
  [/стар(?:ый|ого)\s+account/giu, 'veteran account'],
  [/коллекц(?:ия|ии)/giu, 'collection'],
  [/премиальн(?:ые|ых)/giu, 'premium'],
  [/скрин(?:ы|шоты|ах)|фото(?:графии)?/giu, 'screenshots'],
  [/смотр(?:еть|ите)\s+screenshots|screenshots\s+прилагаются/giu, 'see screenshots'],
  [/чек(?:ай)?\s+(?:опис|описание)|чит(?:ай|айте)\s+описание/giu, 'see description'],
  [/(?:уровень|уровня|ур|лвл)(?!\p{L})/giu, 'LVL'],
  [/торг\s+есть/giu, 'negotiable'],
];

const hasUsefulContent = (value: string): boolean => /[a-z\d]/iu.test(value);

/** Keeps numbers, IDs, emoji and English fragments; untranslated Cyrillic is not published. */
export const translateWithRules = (
  source: string,
  rules: readonly TranslationRule[],
  fallback: string,
): string => {
  let translated = source.normalize('NFKC');
  for (const [pattern, replacement] of rules) {
    translated = translated.replace(pattern, ` ${replacement} `);
  }

  translated = translated
    .replace(/(\d+)\s*(?:LVL|lvl)\b/giu, '$1 LVL')
    .replace(/\p{Script=Cyrillic}+/gu, ' ')
    .replace(/\s*([|•,+])\s*/g, ' $1 ')
    .replace(/([|•,+])(?:\s*\1)+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s|•,+:;—-]+|[\s|•,+:;—-]+$/g, '')
    .trim();

  return hasUsefulContent(translated) ? translated : fallback;
};
