import {
  COMMON_ACCOUNT_RULES,
  translateWithRules,
  type TranslationRule,
} from './rule-based.js';
import { translateClashRoyaleTitle } from './clash-royale.js';

const PUBG_RULES: readonly TranslationRule[] = [
  [/пабг\s*(?:мобайл)?/giu, 'PUBG Mobile'],
  [/уровень\s+коллекц(?:ии|ия)/giu, 'Collection Level'],
  [/мифик(?:и|ов|а)|мифическ(?:ий|их|ие)\s+скин(?:ы|ов)?/giu, 'Mythic skins'],
  [/ас\s*мастер/giu, 'Ace Master'],
  [/(?<!\p{L})ас(?!\p{L})/giu, 'Ace'],
  [/прокач(?:иваем|уем)(?:ое|ые|ых)\s+(?:оружи(?:е|я)|м416)/giu, 'upgradable M416'],
  [/килл\s*чат(?:ы|ов)?/giu, 'kill-feed messages'],
  [/спорт\s*кар(?:ы|ов)?/giu, 'sports cars'],
  [/м416\s+ледник/giu, 'M416 Glacier'],
  [/авм\s+полевой\s+командир/giu, 'AWM Field Commander'],
  [/инферно/giu, 'Inferno'],
  [/ледник/giu, 'Glacier'],
  [/глобальн(?:ая|ой)\s+верси(?:я|и)/giu, 'Global version'],
  [/ранг/giu, 'Rank'],
  [/айди|ид/giu, 'ID'],
  [/метро/giu, 'Metro Royale'],
  [/классик(?:а|и)/giu, 'Classic mode'],
  [/тдм/giu, 'TDM'],
  [/скидк(?:а|и)/giu, 'discount'],
  [/редк(?:ие|их)/giu, 'rare'],
  [/предмет(?:ы|ов)/giu, 'items'],
  [/лет/giu, 'years'],
  [/бронз(?:а|ы)/giu, 'Bronze'],
  [/серебр(?:о|а)/giu, 'Silver'],
  [/золот(?:о|а)/giu, 'Gold'],
  [/корон(?:а|ы)/giu, 'Crown'],
  [/алмаз(?:а|ы)?/giu, 'Diamond'],
  [/оружи(?:е|я)/giu, 'weapons'],
  [/скин(?:ы|ов|а)/giu, 'skins'],
];

const CAR_PARKING_RULES: readonly TranslationRule[] = [
  [/кар\s+паркинг(?:\s+мультиплеер)?/giu, 'Car Parking Multiplayer'],
  [/винилл?(?:ы|ов|а)|наклейк(?:и|ок)/giu, 'Vinyls'],
  [/вирт(?:ы|ов)?|деньг(?:и|ами)/giu, 'cash'],
  [/монет(?:ы|а)?/giu, 'Coins'],
  [/шилдик(?:и|ов)|щитк(?:и|ов)/giu, 'Badges'],
  [/машин(?:ы|а)?|авто(?!\p{L})/giu, 'Cars'],
  [/весь\s+донат/giu, 'all premium content'],
  [/баланс/giu, 'balance'],
  [/аккаунт\s+ютубера/giu, 'content creator account'],
  [/блогер(?:ов|а)/giu, 'content creators'],
  [/айди|ид/giu, 'ID'],
  [/начальн(?:ый|ого)/giu, 'starter'],
  [/игров(?:ая|ой)\s+валют(?:а|ы)/giu, 'in-game currency'],
  [/чит\s+Cars/giu, 'modded Cars'],
  [/дон\s+мотор/giu, 'premium engine'],
  [/хром\s+суппорт(?:а|ы)/giu, 'chrome calipers'],
  [/значк(?:а|и|ов)|шильдик(?:и|ов)?/giu, 'Badges'],
  [/максимальн(?:ое|ого)\s+качеств(?:о|а)/giu, 'maximum quality'],
  [/обговорим\s+в\s+лс|писать\s+лс/giu, 'contact me to discuss'],
  [/мигалк(?:и|а)/giu, 'Police Lights'],
  [/дым/giu, 'Smoke'],
  [/фар(?:ы|а)/giu, 'Headlights'],
];

const ENDFIELD_RULES: readonly TranslationRule[] = [
  [/аркнайтс?\s*(?:эндфилд)?/giu, 'Arknights: Endfield'],
  [/крутк(?:и|ок)|призыв(?:ы|ов)/giu, 'Pulls'],
  [/орундум(?:а|ы)?|ороберил(?:а|ы)?/giu, 'Orundum'],
  [/оператор(?:ы|ов|а)?/giu, 'Operators'],
  [/персонаж(?:и|ей)|перс(?:ы|ами)/giu, 'Operators'],
  [/лимитированн(?:ый|ые|ых)/giu, 'Limited'],
  [/потенциал/giu, 'Potential'],
  [/сигн(?:а|ами|ы|ой)|сигнатурн(?:ое|ые|ого)\s+оружи(?:е|я)/giu, 'Signature Weapons'],
  [/оружи(?:е|я)/giu, 'Weapons'],
  [/исследовани(?:е|я)/giu, 'Research'],
  [/до\s+гарант(?:а|ии)/giu, 'until guarantee'],
  [/гаранти(?:я|и)/giu, 'guarantee'],
  [/полност(?:ью|ь)\s+прокач(?:ан|ана|анный|анная)/giu, 'fully upgraded'],
  [/с\s+релиза/giu, 'day-one'],
  [/основ(?:а|ы)/giu, 'main account'],
  [/легендар(?:ок|ки)|(?<!\p{L})лег(?!\p{L})/giu, '6-star Operators'],
  [/доп\s+инф(?:а|ормация)\s+в\s+описании/giu, 'more details in description'],
  [/полная\s+передач(?:а|ей)/giu, 'full transfer'],
  [/почти\s+все\s+Operators/giu, 'most Operators'],
  [/сочн(?:ый|ыми|ая)/giu, 'high-value'],
  [/ивонн(?:а|ы)/giu, 'Yvonne'],
  [/эмбер/giu, 'Ember'],
  [/панихид(?:а|ы)/giu, 'Panikhida'],
  [/лифэн/giu, 'Lifeng'],
  [/ардели(?:я|и)/giu, 'Ardelia'],
  [/тантан/giu, 'Tantan'],
  [/пограничник/giu, 'Pogranichnik'],
  [/л[эе]ватейн/giu, 'Laevatain'],
  [/росси/giu, 'Rossi'],
  [/чжуан(?:\s+фанъи)?/giu, 'Zhuang Fangyi'],
  [/гилберт(?:а|ы)/giu, 'Gilberta'],
  [/ми\s+фу/giu, 'Mi Fu'],
  [/дицзян/giu, 'Dijiang'],
];

const STANDOFF_RULES: readonly TranslationRule[] = [
  [/ст[еэ]ндов(?:ф)?\s*2?/giu, 'Standoff 2'],
  [/лег(?:а|и)|легендарк(?:а|и)|легенд(?:а|ы)/giu, 'Legendary'],
  [/трипл/giu, 'Triple'],
  [/сезон(?:а|ы)?|сез/giu, 'Season'],
  [/эпик(?:и|ов)|эпическ(?:ие|их)/giu, 'Epic'],
  [/нап(?:ы|ах)|напарник(?:и|ов)/giu, 'Partners'],
  [/матчмейкинг|(?<!\p{L})мм(?!\p{L})/giu, 'Matchmaking'],
  [/чемп(?:а|ы)?|чемпион(?:а|ы)?/giu, 'Champion'],
  [/голд(?:а|ы)|золот(?:о|а)/giu, 'Gold'],
  [/калибровк(?:а|и)/giu, 'Calibration'],
  [/без\s+Calibration/giu, 'Unranked'],
  [/нож(?:и|ом|а)?/giu, 'Knives'],
  [/перчатк(?:и|ами|ок)/giu, 'Gloves'],
  [/наклейк(?:и|ами|ок)/giu, 'Stickers'],
  [/скин(?:ы|ов|а)/giu, 'Skins'],
  [/медал(?:и|ей|ь)/giu, 'Medals'],
  [/рам(?:ки|ок)/giu, 'Frames'],
  [/донат(?:а|ов)?/giu, 'premium content'],
  [/нулев(?:ой|ого)|пуст(?:ой|ого)/giu, 'empty'],
  [/прикрепленн(?:ые|ых)/giu, 'attached'],
  [/час(?:ов|а)?/giu, 'hours'],
  [/ранг/giu, 'Rank'],
  [/айди|ид/giu, 'ID'],
  [/без\s+использования\s+по|без\s+по/giu, 'no cheats'],
];

const JJK_PHANTOM_PARADE_RULES: readonly TranslationRule[] = [
  [/тайвань|тайваня/giu, 'Taiwan'],
  [/япония|японии/giu, 'Japan'],
  [/европа|европы/giu, 'Europe'],
  [/глобал(?:ьный|ьная)?/giu, 'Global'],
  [/кубик(?:и|ов|а)?/giu, 'Cubes'],
  [/билет(?:ы|ов|а)?/giu, 'Tickets'],
  [/персонаж(?:и|ей|а)?/giu, 'characters'],
  [/любые\s+сочетания\s+персонажей/giu, 'any character combination'],
  [/аккаунт\s+на\s+выбор/giu, 'choose your account'],
  [/подробнее\s+внутри/giu, 'full details inside'],
  [/пробужденн(?:ый|ая)/giu, 'Awakened'],
  [/годжо/giu, 'Gojo'],
  [/сукуна/giu, 'Sukuna'],
  [/юта/giu, 'Yuta'],
  [/итадори/giu, 'Itadori'],
  [/махито/giu, 'Mahito'],
  [/домейн/giu, 'Domain'],
];

const ARKNIGHTS_RULES: readonly TranslationRule[] = [
  [/неролл/giu, 'non-reroll'],
  [/реролл/giu, 'reroll'],
  [/орундум(?:а|ы)?/giu, 'Orundum'],
  [/ориджиниум|оригиниум/giu, 'Originite Prime'],
  [/оператор(?:ы|ов|а)?/giu, 'Operators'],
  [/лимитированн(?:ые|ых|ый)/giu, 'Limited'],
  [/сюжет/giu, 'Story'],
  [/крутк(?:и|ок)/giu, 'Pulls'],
  [/потенциал/giu, 'Potential'],
];

const translate = (source: string, rules: readonly TranslationRule[], fallback: string): string =>
  translateWithRules(source, [...rules, ...COMMON_ACCOUNT_RULES], fallback);

export const translateGameTitle = (gameId: string, source: string): string => {
  switch (gameId) {
    case 'clash-royale':
      return translateClashRoyaleTitle(source);
    case 'pubg-mobile':
      return translate(source, PUBG_RULES, 'PUBG Mobile account');
    case 'car-parking-multiplayer':
      return translate(source, CAR_PARKING_RULES, 'Car Parking Multiplayer account');
    case 'arknights-endfield':
      return translate(source, ENDFIELD_RULES, 'Arknights: Endfield account');
    case 'standoff-2':
      return translate(source, STANDOFF_RULES, 'Standoff 2 account');
    case 'eldorado-179':
      return translate(source, JJK_PHANTOM_PARADE_RULES, 'JJK Phantom Parade account');
    case 'eldorado-166':
      return translate(source, ARKNIGHTS_RULES, 'Arknights account');
    default:
      return source;
  }
};
