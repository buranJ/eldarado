import type { Game, GameId } from '@gamestock/domain';

export type AppGame = Game & {
  /** Eldorado's stable catalogue identifier for account offers. */
  eldoradoGameId: string | null;
  /** Whether a source parser is currently configured for this game. */
  collectionEnabled: boolean;
};

/** Games available in the workspace selector. */
export const GAMES: AppGame[] = [
  {
    id: 'clash-royale',
    name: 'Clash Royale',
    shortName: 'CR',
    status: 'active',
    monogram: 'CR',
    accent: '#6e8bff',
    eldoradoGameId: '52',
    collectionEnabled: true,
    scoringModel: {
      version: 'cr-quality-v1',
      factors: [
        {
          key: 'progression',
          label: 'Прокачка',
          weight: 0.45,
          score: 0,
          inputs: [
            'Уровень коллекции',
            'Уровень Королевской башни',
            'Карты 16 уровня',
            'Карты 15 уровня',
            'Карты 14 уровня',
            'Открытые карты',
            'Эволюции',
            'Герои',
          ],
        },
        {
          key: 'competitive',
          label: 'Соревновательная ценность',
          weight: 0.2,
          score: 0,
          inputs: ['Текущие трофеи', 'Рекорд трофеев', 'Соревновательные достижения'],
        },
        {
          key: 'collectibles',
          label: 'Коллекционные предметы',
          weight: 0.15,
          score: 0,
          inputs: ['Возраст аккаунта', 'Редкие эмоции', 'Скины башен', 'Баннеры'],
        },
        {
          key: 'resources',
          label: 'Ресурсы',
          weight: 0.1,
          score: 0,
          inputs: ['Кристаллы', 'Золото'],
        },
        {
          key: 'transfer',
          label: 'Качество передачи',
          weight: 0.1,
          score: 0,
          inputs: [
            'Полный доступ',
            'Доступ к почте',
            'Возможность перепривязки',
            'Оригинальная почта',
            'Ограничения аккаунта',
          ],
        },
      ],
    },
  },
  {
    id: 'pubg-mobile',
    name: 'PUBG Mobile',
    shortName: 'PUBG Mobile',
    status: 'active',
    monogram: 'PM',
    accent: '#d9a64f',
    eldoradoGameId: '21',
    collectionEnabled: true,
    scoringModel: null,
  },
  {
    id: 'car-parking-multiplayer',
    name: 'Car Parking Multiplayer',
    shortName: 'Car Parking',
    status: 'active',
    monogram: 'CP',
    accent: '#dd9459',
    eldoradoGameId: '339',
    collectionEnabled: true,
    scoringModel: null,
  },
  {
    id: 'arknights-endfield',
    name: 'Arknights: Endfield',
    shortName: 'Endfield',
    status: 'active',
    monogram: 'AE',
    accent: '#70a7bd',
    eldoradoGameId: '358',
    collectionEnabled: true,
    scoringModel: null,
  },
  {
    id: 'standoff-2',
    name: 'Standoff 2',
    shortName: 'Standoff 2',
    status: 'active',
    monogram: 'S2',
    accent: '#c97a62',
    eldoradoGameId: '340',
    collectionEnabled: true,
    scoringModel: null,
  },
  {
    id: 'eldorado-179',
    name: 'Jujutsu Kaisen Phantom Parade',
    shortName: 'JJK Phantom Parade',
    status: 'active',
    monogram: 'JK',
    accent: '#d96c75',
    eldoradoGameId: '179',
    collectionEnabled: true,
    scoringModel: null,
  },
  {
    id: 'eldorado-166',
    name: 'Arknights',
    shortName: 'Arknights',
    status: 'active',
    monogram: 'AK',
    accent: '#70a7bd',
    eldoradoGameId: '166',
    collectionEnabled: true,
    scoringModel: null,
  },
];

export const DEFAULT_GAME_ID: GameId = 'clash-royale';

export const getGame = (id: GameId): AppGame =>
  GAMES.find((game) => game.id === id) ?? GAMES[0];
