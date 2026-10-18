import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, LANGUAGES } from '../src/data.js';
import { QUESTS, CHARACTERS } from '../src/story.js';
import { MAPS, PROP_SIZES, getMap, getMapForQuest, getObjectBounds, validateMap, assertAllMapsValid } from '../src/maps.js';

test('every mission has its own fully populated place in addition to the village hub', () => {
  assert.equal(MAPS.length, QUESTS.length + 1);
  assert.equal(new Set(MAPS.map(({ id }) => id)).size, MAPS.length);
  assert.equal(getMap('home').questId, null);
  for (const quest of QUESTS) {
    const map = getMapForQuest(quest.id);
    assert.ok(map, `Missing map for ${quest.id}`);
    assert.equal(map.id, quest.id);
    assert.equal(map.region, quest.region);
    assert.ok(map.objects.length >= 30, `${map.name} should be worth exploring`);
    assert.ok(map.npcs.some(({ id }) => id === quest.characterId), `${map.name} needs its mission guide`);
    assert.ok(map.name && map.subtitle && map.description);
    for (const id of quest.wordIds) assert.ok(map.objects.some(({ wordId }) => wordId === id), `${quest.id} is missing ${id}`);
  }
  assert.equal(getMap('unknown'), undefined);
  assert.equal(getMapForQuest('unknown'), undefined);
});

test('the maps have distinct authored compositions and several kinds of terrain', () => {
  const compositions = MAPS.map((map) => JSON.stringify(map.objects.map(({ wordId, x, z }) => [wordId, x, z])));
  assert.equal(new Set(compositions).size, MAPS.length);
  assert.ok(new Set(MAPS.map(({ theme }) => theme)).size >= 11);
  assert.deepEqual(new Set(MAPS.map(({ terrain }) => terrain.shape)), new Set(['island', 'room', 'terraces']));
  assert.equal(getMap('harbor-lanterns').night, true);
  assert.ok(getMap('water-edge').objects.some(({ wordId }) => wordId === 'dock'));
  assert.ok(getMap('breakfast-club').objects.some(({ wordId }) => wordId === 'oven'));
  assert.ok(getMap('first-seedlings').objects.some(({ wordId }) => wordId === 'rake'));
});

test('every visible prop instance has a word, four translations, and a model footprint', () => {
  const words = new Map(WORDS.map((word) => [word.id, word]));
  const characters = new Set(CHARACTERS.map(({ id }) => id));
  let count = 0;
  for (const map of MAPS) {
    for (const object of map.objects) {
      count++;
      const word = words.get(object.wordId);
      assert.ok(word, `${object.id} must have a vocabulary label`);
      for (const language of LANGUAGES) assert.ok(word.translations[language.id]?.text, `${object.id} needs ${language.name}`);
      const size = PROP_SIZES[object.wordId];
      assert.ok(size && size.width > 0 && size.depth > 0 && size.height > 0, `${object.id} needs physical bounds`);
    }
    for (const npc of map.npcs) assert.ok(characters.has(npc.id));
  }
  assert.ok(count >= 450, 'The campaign should have hundreds of labelled object instances');
});

test('all thirteen places pass the complete geometry and target audit', () => {
  for (const map of MAPS) {
    const report = validateMap(map);
    assert.deepEqual(report.errors, [], `${map.name}: ${report.errors.join('; ')}`);
    assert.equal(report.valid, true);
    assert.deepEqual(report.overlaps, []);
    assert.deepEqual(report.unlabelled, []);
  }
  assert.equal(assertAllMapsValid(), true);
});

test('the audit rejects a new ground object occupying another object’s space', () => {
  const map = structuredClone(getMap('home'));
  const house = map.objects.find(({ wordId }) => wordId === 'house');
  map.objects.push({ id: 'regression-tree-in-house', wordId: 'tree', x: house.x, z: house.z });
  const report = validateMap(map);
  assert.equal(report.valid, false);
  assert.ok(report.overlaps.some((pair) => pair.includes('regression-tree-in-house') && pair.includes(house.id)));
});

test('tabletop support never exempts two dishes from colliding with each other', () => {
  const map = structuredClone(getMap('kettle-on'));
  const cup = map.objects.find(({ wordId }) => wordId === 'cup');
  map.objects.push({ ...cup, id: 'regression-second-cup' });
  const report = validateMap(map);
  assert.equal(report.valid, false);
  assert.ok(report.overlaps.some((pair) => pair.includes(cup.id) && pair.includes('regression-second-cup')));
  assert.ok(!report.overlaps.some((pair) => pair.includes(cup.parentId) && pair.includes(cup.id)));
});

test('tabletop props must actually rest within the table at its real height', () => {
  const map = structuredClone(getMap('kettle-on'));
  const cup = map.objects.find(({ wordId }) => wordId === 'cup');
  cup.x += 3;
  cup.y += .5;
  const report = validateMap(map);
  assert.ok(report.errors.some((message) => message.includes(`${cup.id} is outside its tabletop`)));
  assert.ok(report.errors.some((message) => message.includes(`${cup.id} is not resting on its tabletop`)));
});

test('rotated and scaled furniture uses its complete physical footprint', () => {
  const normal = getObjectBounds({ wordId: 'table', x: 2, z: 3, y: .45 });
  const rotated = getObjectBounds({ wordId: 'table', x: 2, z: 3, y: .45, rotation: Math.PI / 2, scale: 1.5 });
  assert.ok(Math.abs(rotated.width - normal.depth * 1.5) < .00001);
  assert.ok(Math.abs(rotated.depth - normal.width * 1.5) < .00001);
  assert.ok(Math.abs(rotated.maxY - (.45 + PROP_SIZES.table.height * 1.5)) < .00001);
});

test('missing labels, supports, quest targets, and map bounds cannot silently pass', () => {
  const map = structuredClone(getMap('little-hello'));
  map.objects = map.objects.filter(({ wordId }) => wordId !== 'apple');
  map.objects.push({ id: 'unknown-decoration', wordId: 'not-a-real-word', x: 0, z: 0 });
  map.objects.push({ id: 'floating-cup', wordId: 'cup', x: 30, z: 0, parentId: 'missing-table', surface: 'table', y: 5 });
  const report = validateMap(map);
  assert.equal(report.valid, false);
  assert.ok(report.unlabelled.includes('unknown-decoration'));
  assert.ok(report.errors.includes('Quest target apple is absent'));
  assert.ok(report.errors.includes('floating-cup has a missing support'));
  assert.ok(report.errors.includes('floating-cup extends outside the map'));
});

test('mission guides have physical space and cannot be placed inside furniture', () => {
  const map = structuredClone(getMap('lantern-cafe'));
  const table = map.objects.find(({ wordId }) => wordId === 'table');
  map.npcs[0].x = table.x;
  map.npcs[0].z = table.z;
  assert.ok(validateMap(map).overlaps.some((pair) => pair.includes(`character:${map.npcs[0].id}`) && pair.includes(table.id)));
});
