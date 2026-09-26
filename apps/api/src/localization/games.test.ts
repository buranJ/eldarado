import assert from 'node:assert/strict';
import test from 'node:test';
import { findUntranslatedGameTerms, translateGameTitle } from './games.js';

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

test('translates real PUBG Mobile terminology without losing important attributes', () => {
  const translated = translateGameTitle(
    'pubg-mobile',
    'Аренда, 56 уровень коллекции, X-костюм, ранг Платина, 30 мифик скинов, гарантия',
  );
  assert.match(translated, /rental/i);
  assert.match(translated, /Collection Level/i);
  assert.match(translated, /X-Suit/i);
  assert.match(translated, /Platinum/i);
  assert.match(translated, /Mythic skins/i);
  assert.match(translated, /guarantee/i);
  assert.doesNotMatch(translated, /\p{Script=Cyrillic}/u);
});

test('translates real Car Parking Marketplace terminology', () => {
  const translated = translateGameTitle(
    'car-parking-multiplayer',
    'Эксклюзив, 195 машин, 190 винилов, весь донат, все дома, фул магазин куплен',
  );
  assert.match(translated, /Exclusive/i);
  assert.match(translated, /Cars/i);
  assert.match(translated, /Vinyls/i);
  assert.match(translated, /all premium content/i);
  assert.match(translated, /all houses/i);
  assert.match(translated, /full shop unlocked/i);
  assert.doesNotMatch(translated, /\p{Script=Cyrillic}/u);
});

test('translates real Endfield terminology', () => {
  const translated = translateGameTitle(
    'arknights-endfield',
    'Европа, 108000 Ороберила, 105 стандартных и 18 ивентовых круток, Лиино, селектор',
  );
  assert.match(translated, /Europe/i);
  assert.match(translated, /Orundum/i);
  assert.match(translated, /standard Pulls/i);
  assert.match(translated, /event Pulls/i);
  assert.match(translated, /Liino/i);
  assert.match(translated, /Selector/i);
  assert.doesNotMatch(translated, /\p{Script=Cyrillic}/u);
});

test('translates real Standoff 2 terminology', () => {
  const translated = translateGameTitle(
    'standoff-2',
    'Олд акк, 450 часов, трипл элита, нож, куча медалей, прикрепленные фото',
  );
  assert.match(translated, /veteran account/i);
  assert.match(translated, /hours/i);
  assert.match(translated, /Triple Elite/i);
  assert.match(translated, /Knives/i);
  assert.match(translated, /many Medals/i);
  assert.match(translated, /attached screenshots/i);
  assert.doesNotMatch(translated, /\p{Script=Cyrillic}/u);
});

test('collects only still-unknown Cyrillic terms for dictionary maintenance', () => {
  const terms = findUntranslatedGameTerms(
    'pubg-mobile',
    'Аренда, X-костюм, новый термин Бронемобиль',
  );
  assert.deepEqual(terms.sort(), ['бронемобиль', 'новый', 'термин']);
  assert.doesNotMatch(terms.join(' '), /аренда|костюм/u);
});
