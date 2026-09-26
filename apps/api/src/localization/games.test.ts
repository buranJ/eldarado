import assert from 'node:assert/strict';
import test from 'node:test';
import { translateGameTitle } from './games.js';

test('translates real JJK marketplace terminology without Cyrillic leftovers', () => {
  const translated = translateGameTitle(
    'eldorado-179',
    'Глобал 42 000 кубов, Молодой Нанами и Тодзи, любые сочетания персонажей',
  );

  assert.match(translated, /Global/i);
  assert.match(translated, /Cubes/i);
  assert.match(translated, /Young Nanami/i);
  assert.match(translated, /Toji/i);
  assert.match(translated, /any character combination/i);
  assert.doesNotMatch(translated, /\p{Script=Cyrillic}/u);
});

test('translates real Arknights marketplace terminology without Cyrillic leftovers', () => {
  const translated = translateGameTitle(
    'eldorado-166',
    'Глобал, все лимитки, коллабы, 3 года игры, 120 ориджинита, ваучер на выбор',
  );

  assert.match(translated, /Global/i);
  assert.match(translated, /all Limited Operators/i);
  assert.match(translated, /collaborations/i);
  assert.match(translated, /years played/i);
  assert.match(translated, /Originite Prime/i);
  assert.match(translated, /Selector/i);
  assert.doesNotMatch(translated, /\p{Script=Cyrillic}/u);
});
