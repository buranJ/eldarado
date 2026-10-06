import {
  COMMON_ACCOUNT_RULES,
  translateWithRules,
  untranslatedCyrillicTerms,
  type TranslationRule,
} from './rule-based.js';
import { CLASH_ROYALE_RULES, translateClashRoyaleTitle } from './clash-royale.js';

const PUBG_RULES: readonly TranslationRule[] = [
  [/пабг\s*(?:мобайл)?/giu, 'PUBG Mobile'],
  [/уровень\s+коллекц(?:ии|ия)/giu, 'Collection Level'],
  [
    /мифик(?:и|ов|а)?(?:\s+скин(?:ы|ов|а)?)?|мифическ(?:ий|их|ие)\s+скин(?:ы|ов)?/giu,
    'Mythic skins',
  ],
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
  [/аренд(?:а|ы|у)/giu, 'rental'],
  [/легендар(?:ок|ки|ный|ных)/giu, 'Legendary items'],
  [/платин(?:а|ы)/giu, 'Platinum'],
  [/рюкзак/giu, 'Backpack'],
  [/маск(?:а|и)/giu, 'Mask'],
  [/[xх]-?костюм/giu, 'X-Suit'],
  [/стар(?:ых|ые)\s+и\s+редк(?:их|ие)/giu, 'veteran rare'],
  [/недорог(?:о|ой)/giu, 'low price'],
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
  [/эксклюзив(?:ный|а)?/giu, 'Exclusive'],
  [/все\s+дом(?:а|ы)/giu, 'all houses'],
  [/фул\s+магазин\s+куплен/giu, 'full shop unlocked'],
  [/одежд(?:а|ы)/giu, 'clothes'],
  [/гонщик/giu, 'Rider'],
  [/призрачн(?:ый|ого)/giu, 'Ghost'],
  [/триколор/giu, 'Tricolor'],
  [/федераци(?:я|и)/giu, 'Federation'],
];

const ENDFIELD_RULES: readonly TranslationRule[] = [
  [/аркнайтс?\s*(?:эндфилд)?/giu, 'Arknights: Endfield'],
  [
    /(\d+)\s+стандартн(?:ых|ые)\s+и\s+(\d+)\s+ивентов(?:ых|ые)\s+крут(?:ки|ок)/giu,
    '$1 standard Pulls and $2 event Pulls',
  ],
  [/стандартн(?:ых|ые)\s+крут(?:ки|ок)/giu, 'standard Pulls'],
  [/ивентов(?:ых|ые)\s+крут(?:ки|ок)/giu, 'event Pulls'],
  [/крут(?:ки|ок)|призыв(?:ы|ов)/giu, 'Pulls'],
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
  [/европ(?:а|ы)/giu, 'Europe'],
  [/америк(?:а|и)/giu, 'Americas'],
  [/саппорт(?:а|ы|ов)?/giu, 'supports'],
  [/зв[её]здочн(?:ого|ый)\s+Operators?/giu, '6-star Operator'],
  [/разрешени(?:е|я)\s+на\s+на[её]м/giu, 'recruitment permit'],
  [/селектор/giu, 'Selector'],
  [/билет/giu, 'Ticket'],
  [/нович(?:ок|ка)/giu, 'Beginner'],
  [/лиино/giu, 'Liino'],
  [/дальновидност(?:ь|и)/giu, 'Foresight'],
  [/премудрост(?:ь|и)/giu, 'Wisdom'],
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
  [/элит(?:а|ы)/giu, 'Elite'],
  [/куч(?:а|и)\s+Medals/giu, 'many Medals'],
  [/сочн(?:ый|ого)/giu, 'high-value'],
  [/прикрепленн(?:ые|ых)\s+screenshots/giu, 'attached screenshots'],
];

const JJK_PHANTOM_PARADE_RULES: readonly TranslationRule[] = [
  [/тайвань|тайваня/giu, 'Taiwan'],
  [/япония|японии/giu, 'Japan'],
  [/европа|европы/giu, 'Europe'],
  [/глобал(?:ьный|ьная)?/giu, 'Global'],
  [/куб(?:ик)?(?:и|ов|а)?/giu, 'Cubes'],
  [/билет(?:ы|ов|а)?/giu, 'Tickets'],
  [/любые\s+сочетания\s+персонажей/giu, 'any character combination'],
  [/персонаж(?:и|ей|а)?/giu, 'characters'],
  [/аккаунт\s+на\s+выбор/giu, 'choose your account'],
  [/подробнее\s+внутри/giu, 'full details inside'],
  [/пробужденн(?:ый|ая)/giu, 'Awakened'],
  [/годжо/giu, 'Gojo'],
  [/сукуна/giu, 'Sukuna'],
  [/юта/giu, 'Yuta'],
  [/итадори/giu, 'Itadori'],
  [/махито/giu, 'Mahito'],
  [/сугуру\s+гето|гето/giu, 'Suguru Geto'],
  [/чосо/giu, 'Choso'],
  [/тодзи/giu, 'Toji'],
  [/нобара/giu, 'Nobara'],
  [/с[ёе]ко\s+и[эе]йри/giu, 'Shoko Ieiri'],
  [/аой\s+тодо/giu, 'Aoi Todo'],
  [/молодой\s+нанами/giu, 'Young Nanami'],
  [/зел[ёе]н(?:ый|ого)/giu, 'Green'],
  [/получен(?:ный|о|а)?/giu, 'obtained'],
  [/необязательн(?:ый|о)/giu, 'optional'],
  [/стартов(?:ый|ого)/giu, 'starter'],
  [/домейн/giu, 'Domain'],
];

const ARKNIGHTS_RULES: readonly TranslationRule[] = [
  [/глобал(?:ьный|ьная)?|(?<!\p{L})глобал(?!\p{L})/giu, 'Global'],
  [/европа|европы/giu, 'Europe'],
  [/неролл/giu, 'non-reroll'],
  [/реролл/giu, 'reroll'],
  [/орундум(?:а|ы)?/giu, 'Orundum'],
  [/ориджиниум|оригиниум/giu, 'Originite Prime'],
  [/оператор(?:ы|ов|а)?/giu, 'Operators'],
  [/лимитированн(?:ые|ых|ый)/giu, 'Limited'],
  [/сюжет/giu, 'Story'],
  [/крутк(?:и|ок)/giu, 'Pulls'],
  [/потенциал/giu, 'Potential'],
  [/выбор/giu, 'Choice'],
  [/баннер\s+новичка/giu, 'Beginner Banner'],
  [/все\s+лимитки/giu, 'all Limited Operators'],
  [/лимитк(?:и|а|ок)/giu, 'Limited Operators'],
  [/коллаб(?:ы|ов)?/giu, 'collaborations'],
  [/год(?:а|ов)?\s+игры/giu, 'years played'],
  [/ориджинит(?:а|ы)?/giu, 'Originite Prime'],
  [/ваучер/giu, 'Selector'],
  [/рандом/giu, 'Random'],
  [/персонаж(?:и|ей|а)?/giu, 'Operators'],
];

const HONKAI_IMPACT_RULES: readonly TranslationRule[] = [
  [/хонкай\s*(?:импакт)?\s*3(?:рд)?/giu, 'Honkai Impact 3rd'],
  [/валькир(?:ии|ий|ия)/giu, 'Valkyries'],
  [/тикет(?:ы|ов|а)?|билет(?:ы|ов|а)?|купон(?:ы|ов|а)?/giu, 'Tickets'],
  [/кристалл(?:ы|ов|а)?/giu, 'Crystals'],
  [/неролл/giu, 'non-reroll'],
  [/ивент(?:ы|ов|а)?/giu, 'events'],
  [/метов(?:ые|ый|ая)/giu, 'meta'],
  [/оружи(?:е|я|й)/giu, 'Weapons'],
  [/фулл?\s+перс(?:ы|ов|а)?/giu, 'fully geared characters'],
  [/персонаж(?:и|ей)|перс(?:ы|ов|а)?/giu, 'characters'],
  [/мейн\s+(?:аккаунт|акк)/giu, 'main account'],
  [/броня/giu, 'Bronya'],
  [/м[эе]й/giu, 'Mei'],
  [/терез(?:а|ы)/giu, 'Theresa'],
  [/сильвервинг/giu, 'Silverwing'],
  [/геншин/giu, 'Genshin Impact'],
  [/хср/giu, 'Honkai: Star Rail'],
  [/закрыт(?:ый|ого)\s+контент/giu, 'completed content'],
  [/ретурн/giu, 'returning account'],
  [/(?<!\p{L})жир(?!\p{L})/giu, 'high-value'],
  [/год(?:а|ов)?/giu, 'year'],
];

const RUST_RULES: readonly TranslationRule[] = [
  [/раст/giu, 'Rust'],
  [/длс|длц/giu, 'DLC'],
  [/скин(?:ы|ов|а)?/giu, 'skins'],
  [/час(?:ов|а)?/giu, 'hours'],
  [/без\s+VAC\s+бан(?:ов|а)?/giu, 'no VAC bans'],
  [/бан(?:ов|а)?/giu, 'bans'],
  [/пол(?:ь|ьш)ша|польш(?:а|е|и)/giu, 'Poland'],
  [/стран(?:а|ы)/giu, 'country'],
  [/игр(?:ы|а)?/giu, 'games'],
  [/платн(?:ых|ые)/giu, 'paid'],
  [/много/giu, 'many'],
  [/друг(?:их|ие)/giu, 'other'],
  [/полная\s+смена\s+данных/giu, 'full credential change'],
  [/пере\s*привязк(?:а|ой|и)/giu, 'rebind available'],
  [/навсегда/giu, 'permanent'],
  [/нов(?:ый|ого|ая)/giu, 'new'],
  [/только\s+ваш/giu, 'exclusive access'],
  [/прайм/giu, 'Prime'],
  [/в\s+кс/giu, 'in CS2'],
  [/продам/giu, 'for sale'],
];

const LEAGUE_OF_LEGENDS_RULES: readonly TranslationRule[] = [
  [/прокачан\s+вручную/giu, 'hand-leveled'],
  [/нет\s+ранга/giu, 'unranked'],
  [/чемпионат\s+мира/giu, 'World Championship'],
  [/чемпион(?:ов|ы|а)?/giu, 'champions'],
  [/скин(?:ов|ы|а)?/giu, 'skins'],
  [/ранг(?:а|и)?/giu, 'rank'],
  [/победоносн(?:ые|ый|ая)/giu, 'Victorious'],
  [/хекстек/giu, 'Hextech'],
  [/аркейн/giu, 'Arcane'],
  [/(?<!\p{L})с[эе](?!\p{L})/giu, 'Blue Essence'],
  [/шако/giu, 'Shaco'],
  [/фиор(?:а|ы)/giu, 'Fiora'],
  [/эзреал(?:ь|я)/giu, 'Ezreal'],
  [/поппи/giu, 'Poppy'],
  [/леон(?:а|ы)/giu, 'Leona'],
  [/акшан/giu, 'Akshan'],
  [/твистед/giu, 'Twisted Fate'],
  [/кеннен/giu, 'Kennen'],
  [/рамбл/giu, 'Rumble'],
  [/ари/giu, 'Ahri'],
  [/виего/giu, 'Viego'],
  [/шен/giu, 'Shen'],
  [/треш/giu, 'Thresh'],
  [/велик(?:ая|ий)\s+легенд(?:а|ы)/giu, 'Legendary'],
  [/призрак/giu, 'Wraith'],
  [/аккич/giu, 'account'],
];

const MOBILE_LEGENDS_RULES: readonly TranslationRule[] = [
  [/миф(?:ический)?\s+бессмертн(?:ый|ого)/giu, 'Mythical Immortal'],
  [/миф(?:ическая)?\s+слав(?:а|ы)/giu, 'Mythical Glory'],
  [/грандмастер/giu, 'Grandmaster'],
  [/мастер/giu, 'Master'],
  [/мега/giu, 'Mega'],
  [/лег(?:а|и|ендарн(?:ый|ые))?/giu, 'Legend'],
  [/эпик/giu, 'Epic'],
  [/коллектор|(?<!\p{L})кол(?!\p{L})/giu, 'Collector'],
  [/стар\s+варс/giu, 'Star Wars'],
  [/стар(?!\p{L})/giu, 'Starlight'],
  [/лаки\s*бокс|лакибокс/giu, 'Lucky Box'],
  [/лаки/giu, 'Lucky'],
  [/аспи(?:рант)?/giu, 'Aspirants'],
  [/зенит/giu, 'Zenith'],
  [/коф/giu, 'KOF'],
  [/скин(?:ов|ы|а)?/giu, 'skins'],
  [/геро(?:и|ев|й)/giu, 'heroes'],
  [/зв[её]зд/giu, 'stars'],
  [/миров(?:ая|ой)/giu, 'world-ranked'],
  [/скриншот(?:ы|ов)?/giu, 'screenshots'],
  [/джулиан/giu, 'Julian'],
  [/итачи/giu, 'Itachi'],
  [/лесл(?:и|ей)/giu, 'Lesley'],
  [/алукард/giu, 'Alucard'],
  [/карин(?:а|ы)/giu, 'Karina'],
  [/фре(?:й|и)я/giu, 'Freya'],
  [/беатрис/giu, 'Beatrix'],
  [/циклоп/giu, 'Cyclops'],
  [/селен(?:а|ы)/giu, 'Selena'],
  [/фанни/giu, 'Fanny'],
  [/госсен/giu, 'Gusion'],
  [/гус(?:ь|я)/giu, 'Gusion'],
  [/ак(?:а|ай)/giu, 'Akai'],
  [/инь/giu, 'Yin'],
  [/алис(?:а|ы)/giu, 'Alice'],
  [/ха[яй]/giu, 'Hayabusa'],
  [/наташ(?:а|и)/giu, 'Natalia'],
  [/в[эе]йл/giu, 'Vale'],
  [/к[эе]рри/giu, 'Karrie'],
  [/харли/giu, 'Harley'],
  [/в[эе]ксен(?:а|ы)/giu, 'Vexana'],
  [/клод/giu, 'Claude'],
  [/чонг/giu, 'Yu Zhong'],
  [/ангел(?:а|ы)/giu, 'Angela'],
  [/бада(?:н|нг)/giu, 'Badang'],
  [/неймар/giu, 'Neymar'],
  [/кагур(?:а|ы)/giu, 'Kagura'],
  [/алдос/giu, 'Aldous'],
  [/кимми/giu, 'Kimmy'],
  [/бруно/giu, 'Bruno'],
  [/наруто/giu, 'Naruto'],
  [/год(?:а|ов)?|лет/giu, 'years'],
];

const CLASH_OF_CLANS_RULES: readonly TranslationRule[] = [
  [/тх|ратуш(?:а|и)/giu, 'TH'],
  [/раш(?:еный|енный)?/giu, 'rushed'],
  [/супер\s+макс/giu, 'fully maxed'],
  [/почти\s+фулл?|практически\s+фулл?/giu, 'nearly maxed'],
  [/фулл?|макс/giu, 'maxed'],
  [/геро(?:и|ев|й)/giu, 'heroes'],
  [/дс\s+строител(?:ь|я|ей|и)/giu, 'Builder Base'],
  [/строител(?:ь|я|ей|и)/giu, 'builders'],
  [/гем(?:ы|ов|а)?/giu, 'Gems'],
  [/медал(?:и|ей|ь)/giu, 'medals'],
  [/лвк/giu, 'CWL'],
  [/эпическ(?:их|ие|ий)/giu, 'Epic'],
  [/сноряг|снаряжени(?:й|я|е)|снаряг(?:а|и)?/giu, 'equipment'],
  [/оформ(?:ы|а|ление)/giu, 'scenery'],
  [/скин(?:ы|ов|а)?/giu, 'skins'],
  [/волшебн(?:ые|ых)\s+предмет(?:ы|ов)/giu, 'Magic Items'],
  [/предмет(?:ы|ов)/giu, 'items'],
  [/пропуск(?:и|ов)?/giu, 'passes'],
  [/повозк(?:а|и)/giu, 'Loot Cart'],
  [/смена\s+(?:имени|ник(?:а|а))/giu, 'name change'],
  [/бесплатн(?:ая|ый)/giu, 'free'],
  [/выгодн(?:ое|о)/giu, 'good value'],
  [/предложени(?:е|я)/giu, 'offer'],
  [/немного/giu, 'slightly'],
  [/мног(?:о|ие)/giu, 'many'],
  [/аниме\s*ярость/giu, 'Anime Rage'],
  [/дешево/giu, 'low price'],
  [/раб(?:а|ы)/giu, 'builders'],
];

const translate = (source: string, rules: readonly TranslationRule[], fallback: string): string =>
  translateWithRules(source, [...rules, ...COMMON_ACCOUNT_RULES], fallback);

const rulesForGame = (gameId: string): readonly TranslationRule[] | null => {
  switch (gameId) {
    case 'clash-royale': return CLASH_ROYALE_RULES;
    case 'pubg-mobile': return PUBG_RULES;
    case 'car-parking-multiplayer': return CAR_PARKING_RULES;
    case 'arknights-endfield': return ENDFIELD_RULES;
    case 'standoff-2': return STANDOFF_RULES;
    case 'eldorado-179': return JJK_PHANTOM_PARADE_RULES;
    case 'eldorado-166': return ARKNIGHTS_RULES;
    case 'honkai-impact-3rd': return HONKAI_IMPACT_RULES;
    case 'rust': return RUST_RULES;
    case 'league-of-legends': return LEAGUE_OF_LEGENDS_RULES;
    case 'mobile-legends': return MOBILE_LEGENDS_RULES;
    case 'clash-of-clans': return CLASH_OF_CLANS_RULES;
    default: return null;
  }
};

export const findUntranslatedGameTerms = (gameId: string, source: string): string[] => {
  const rules = rulesForGame(gameId);
  return rules ? untranslatedCyrillicTerms(source, [...rules, ...COMMON_ACCOUNT_RULES]) : [];
};

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
    case 'honkai-impact-3rd':
      return translate(source, HONKAI_IMPACT_RULES, 'Honkai Impact 3rd account');
    case 'rust':
      return translate(source, RUST_RULES, 'Rust account');
    case 'league-of-legends':
      return translate(source, LEAGUE_OF_LEGENDS_RULES, 'League of Legends account');
    case 'mobile-legends':
      return translate(source, MOBILE_LEGENDS_RULES, 'Mobile Legends account');
    case 'clash-of-clans':
      return translate(source, CLASH_OF_CLANS_RULES, 'Clash of Clans account');
    default:
      return source;
  }
};
