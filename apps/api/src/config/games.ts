import type { GameScoringModel } from '@gamestock/domain';

/**
 * Server-side mirror of the scoring weights the UI displays. Kept here so the
 * API does not depend on the web app's config module.
 */
const CLASH_ROYALE: GameScoringModel = {
  version: 'cr-quality-v1',
  factors: [
    { key: 'progression', label: 'Прокачка', weight: 0.45, score: 0, inputs: [] },
    { key: 'competitive', label: 'Соревновательная ценность', weight: 0.2, score: 0, inputs: [] },
    { key: 'collectibles', label: 'Коллекционные предметы', weight: 0.15, score: 0, inputs: [] },
    { key: 'resources', label: 'Ресурсы', weight: 0.1, score: 0, inputs: [] },
    { key: 'transfer', label: 'Качество передачи', weight: 0.1, score: 0, inputs: [] },
  ],
};

const MODELS: Record<string, GameScoringModel> = {
  'clash-royale': CLASH_ROYALE,
};

export const getGameScoringModel = (gameId: string): GameScoringModel => {
  const model = MODELS[gameId];
  if (!model) throw new Error(`Для игры ${gameId} не настроена модель оценки`);
  return model;
};
