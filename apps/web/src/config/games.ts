import type { Game, GameId } from '@gamestock/domain';

/**
 * Game registry. The second title is intentionally unnamed — it exists to keep
 * every game-scoped screen honest about being multi-game from day one.
 */
export const GAMES: Game[] = [
  {
    id: 'clash-royale',
    name: 'Clash Royale',
    shortName: 'CR',
    status: 'active',
    monogram: 'CR',
    accent: '#6e8bff',
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
    id: 'game-2',
    name: 'Вторая игра',
    shortName: '—',
    status: 'coming_soon',
    monogram: '?',
    accent: '#6a6a77',
    scoringModel: null,
  },
];

export const DEFAULT_GAME_ID: GameId = 'clash-royale';

export const getGame = (id: GameId): Game =>
  GAMES.find((game) => game.id === id) ?? GAMES[0];
