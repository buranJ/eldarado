/**
 * FunPay sellers mostly write compact, keyword-heavy titles. This dictionary
 * translates those titles into the terms Clash Royale players actually use;
 * it intentionally does not call a general-purpose translator or send source
 * text to a third party.
 */
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/clash\s+royal(?:e)?/giu, 'Clash Royale'],
  [/кл[еэё]ш(?:\s+роял[ье])?|кл[еэё]шк(?:а|е|у|ой)/giu, 'Clash Royale'],
  [/королевск(?:ая|ой)\s+башн(?:я|и)/giu, 'King Tower'],
  [/башн(?:я|и|ю|ей)\s+корол(?:я|евская)/giu, 'King Tower'],
  [/уров(?:ень|ня)\s+корол(?:я|евской\s+башни)/giu, 'King Tower level'],
  [/полност(?:ью|ь)\s+прокач(?:ан|ана|анный|анная)/giu, 'fully upgraded'],
  [/макс(?:имальн(?:ый|ая|ого))?\s+уров(?:ень|ня)/giu, 'max level'],
  [/полный\s+доступ/giu, 'full access'],
  [/чист(?:ая|ой)\s+почт(?:а|ой)/giu, 'clean email'],
  [/(?:оригинальн(?:ая|ой)|перв(?:ая|ой))\s+почт(?:а|ой)/giu, 'original email'],
  [/вместе\s+с\s+почт(?:ой|а)/giu, 'email included'],
  [/без\s+привязки\s+телефон(?:а|у)/giu, 'no phone linked'],
  [/без\s+блокиров(?:ок|ки)/giu, 'no bans'],
  [/без\s+перепривязки/giu, 'no rebind'],
  [/смен(?:а|ить)\s+(?:ника|имени)/giu, 'name change'],
  [/перепривя(?:зка|зки|зать|зывается|зкой)/giu, 'rebind available'],
  [/авто\s*выдач(?:а|ей|у)/giu, 'instant delivery'],
  [/мгновенн(?:ая|ой)\s+выдач(?:а|ей)/giu, 'instant delivery'],
  [/аккаунт\s+для\s+новичк(?:а|ов)|акк\s+для\s+новичк(?:а|ов)/giu, 'starter account'],
  [/аккаунт\s+под\s+основ(?:у|ы)|акк\s+под\s+основ(?:у|ы)/giu, 'main account'],
  [/(\d+)\s+(?:лет|год(?:а|ов)?)\s+аккаунту/giu, '$1-year-old account'],
  [/личн(?:ый|ого)\s+(?:аккаунт|акк)/giu, 'personal account'],
  [/основн(?:ой|ого)\s+(?:аккаунт|акк)/giu, 'main account'],
  [/прода(?:ю|м|ется|жа)\s+(?:аккаунт|акк)?/giu, 'account for sale'],
  [/отдаю\s+(?:аккаунт|акк)?/giu, 'account for sale'],
  [/топ(?:овый|-аккаунт)?\s+(?:аккаунт|акк)?/giu, 'top account'],
  [/жирн(?:ый|ого)\s+(?:аккаунт|акк)?/giu, 'high-value account'],
  [/сочн(?:ый|ого)\s+(?:аккаунт|акк)?/giu, 'strong account'],
  [/хорош(?:ий|его|ая)\s+(?:аккаунт|акк|прокачка)/giu, 'well-upgraded account'],
  [/отличн(?:ый|ого|ая)\s+(?:аккаунт|акк|прокачка)/giu, 'well-upgraded account'],
  [/годн(?:ый|ого)\s+(?:аккаунт|акк)/giu, 'good account'],
  [/крут(?:ой|ого)\s+(?:аккаунт|акк)/giu, 'strong account'],
  [/олд\s+(?:аккаунт|акк)/giu, 'veteran account'],
  [/донатн?(?:ый|ого)?\s+(?:аккаунт|акк)/giu, 'premium account'],
  [/фулл/giu, 'maxed'],
  [/акк(?:аунт|анут|аунт)?/giu, 'account'],
  [/прокачк(?:а|ой|у)|прокач(?:ан|анный|енная|ен)/giu, 'progression'],
  [/все\s+карт(?:ы|а)\s+кроме/giu, 'all cards except'],
  [/все\s+карт(?:ы|а)\s+есть/giu, 'all cards unlocked'],
  [/все\s+легендарн(?:ые|ки)|все\s+леги/giu, 'all Legendary cards'],
  [/легендарн(?:ые|ых|ая|ой)\s+карт(?:ы|а)|легендар(?:ок|ки)|леги/giu, 'Legendary cards'],
  [/карт(?:ы|а|у|ами)/giu, 'cards'],
  [/кубк(?:ов|и|а)|трофе(?:ев|и|я)/giu, 'trophies'],
  [/эволюц(?:ия|ии|ий|иями)|\bэво\b/giu, 'Evolutions'],
  [/геро(?:й|я|ев|и|измов)/giu, 'Champions'],
  [/эмодз(?:и|ей)|эмоц(?:ия|ии|ий)|пин(?:ы|ов|а)/giu, 'Emotes'],
  [/редк(?:ие|их)\s+Emotes/giu, 'rare Emotes'],
  [/(?:донатн?(?:ые|ых)?|донат)\s+Emotes/giu, 'premium Emotes'],
  [/скин(?:ы|ов|а)\s+на\s+башн(?:ю|и)/giu, 'Tower Skins'],
  [/башенн?(?:ые|ых)?\s+скин(?:ы|ов)/giu, 'Tower Skins'],
  [/скин(?:ы|ов|а)/giu, 'skins'],
  [/украшен(?:ия|ий)\s+для\s+знамен(?:и|а)/giu, 'Banner Decorations'],
  [/рам(?:ки|ок)\s+(?:для\s+)?знамен(?:и|а)?/giu, 'Banner Frames'],
  [/знамен(?:а|и)|баннер(?:ы|ов)?/giu, 'Banners'],
  [/осколк(?:ов|и|а)\s+(?:для\s+)?Evolutions/giu, 'Evolution Shards'],
  [/осколк(?:ов|и|а)\s+эволюции/giu, 'Evolution Shards'],
  [/кристалл(?:ов|ы|а)|гем(?:ов|ы|а)|алмаз(?:ов|ы|а)/giu, 'Gems'],
  [/золот(?:о|а)|монет(?:ы|а)?/giu, 'Gold'],
  [/арен(?:а|ы|е)/giu, 'Arena'],
  [/колод(?:а|ы|ой)/giu, 'deck'],
  [/дровосек(?:ом|а)?/giu, 'Lumberjack'],
  [/шарик(?:ом|а)?|\bшар\b/giu, 'Balloon'],
  [/спелл?бейт/giu, 'Spell Bait'],
  [/арбалет(?:ом|а)?/giu, 'X-Bow'],
  [/хог(?:ом|а)?/giu, 'Hog Rider'],
  [/мега\s*рыцар(?:ем|я)?|меганайт(?:ом|а)?/giu, 'Mega Knight'],
  [/пекк(?:а|ой|у)|пеккой/giu, 'P.E.K.K.A'],
  [/шахт[её]р(?:ом|а)?/giu, 'Miner'],
  [/принцесс(?:а|ой|ы)/giu, 'Princess'],
  [/принц(?:ем|а)?/giu, 'Prince'],
  [/лучниц(?:ы|ами|а)/giu, 'Archers'],
  [/э-?дракон(?:ом|а)?/giu, 'Electro Dragon'],
  [/дракон(?:ом|а)?/giu, 'Dragon'],
  [/печк(?:а|ой|и)/giu, 'Furnace'],
  [/свинк(?:и|ами)|королевск(?:ие|их)\s+кабан(?:ы|ов)/giu, 'Royal Hogs'],
  [/рекрут(?:ы|ами|ов)/giu, 'Royal Recruits'],
  [/ведьм(?:а|ой|ы)/giu, 'Witch'],
  [/бочк(?:а|ой|и)/giu, 'Goblin Barrel'],
  [/мими(?:ми)?/giu, 'Mimimimimi'],
  [/мастер/giu, 'Master'],
  [/чемпион/giu, 'Champion'],
  [/гл(?:ава|авой)\s+клан(?:а|е)/giu, 'Clan Leader'],
  [/клан(?:а|е|ом)?/giu, 'Clan'],
  [/пас(?:с|са|сы)|боев(?:ой|ого)\s+пропуск/giu, 'Pass'],
  [/смен(?:а|ы)\s+данных/giu, 'credentials change'],
  [/\b(?:уровень|уровня|ур|лвл)\b/giu, 'LVL'],
  [/лет\s+игры|год(?:а|ов)?\s+игры/giu, 'years played'],
  [/чек(?:ай)?\s+(?:опис|описание)/giu, 'see description'],
  [/смотр(?:еть|ите)\s+(?:скрины|фото)/giu, 'see screenshots'],
  [/подробн(?:о|ее)\s+на\s+фото/giu, 'details in screenshots'],
  [/видео\s*обзор/giu, 'video overview'],
  [/скрин(?:ы|шоты|ах)|фото(?:графии)?/giu, 'screenshots'],
  [/без\s+донат(?:а|ов)/giu, 'free-to-play'],
  [/с\s+донат(?:ом|ами)/giu, 'with purchases'],
  [/торг\s+есть/giu, 'negotiable'],
  [/в\s+подарок/giu, 'included as a bonus'],
];

const hasUsefulContent = (value: string): boolean => /[a-z\d]/iu.test(value);

/**
 * Produces a Latin, buyer-facing summary while preserving numbers, player
 * tags, emojis and already-English fragments. Unknown Cyrillic fragments are
 * omitted rather than shown to an English-only buyer as misleading gibberish.
 */
export const translateClashRoyaleTitle = (source: string): string => {
  let translated = source.normalize('NFKC');
  for (const [pattern, replacement] of RULES) {
    translated = translated.replace(pattern, replacement);
  }

  translated = translated
    .replace(/(\d+(?:[.,]\d+)?)\s*[кk]\s+(?=(?:trophies|Gems|Gold)\b)/giu, '$1K ')
    .replace(/(\d+)\s*(?:LVL|lvl)\b/giu, '$1 LVL')
    .replace(/\p{Script=Cyrillic}+/gu, ' ')
    .replace(/\s*([|•,+])\s*/g, ' $1 ')
    .replace(/([|•,+])(?:\s*\1)+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s|•,+:;—-]+|[\s|•,+:;—-]+$/g, '')
    .trim();

  return hasUsefulContent(translated) ? translated : 'Clash Royale account';
};
