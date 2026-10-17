import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, LANGUAGES } from '../src/data.js';
import { createProgress, learnWord, gradeWord, getDueWords, getLevel, buildSession, normalizeAnswer, checkAnswer, validateProgress } from '../src/learning.js';

const NOW = Date.parse('2026-10-17T12:00:00.000Z');
const DAY = 86_400_000;
const find = (id) => WORDS.find((word) => word.id === id);

test('all vocabulary IDs and translations exist in each supported language', () => {
  assert.deepEqual(LANGUAGES.map((language) => language.id), ['de', 'ja', 'es', 'zh']);
  assert.equal(createProgress().language, 'de');
  assert.equal(createProgress('unavailable').language, 'de');
  assert.equal(WORDS.length, 48);
  assert.equal(new Set(WORDS.map((word) => word.id)).size, WORDS.length);
  for (const word of WORDS) {
    assert.deepEqual(Object.keys(word.translations), ['de', 'ja', 'es', 'zh']);
    for (const language of LANGUAGES) {
      assert.ok(word.translations[language.id].text.length);
      assert.ok(word.translations[language.id].reading.length);
    }
  }
});

test('discoveries are immutable and cannot award repeatedly', () => {
  const original = createProgress();
  const learned = learnWord(original, 'apple', NOW);
  assert.equal(original.xp, 0);
  assert.deepEqual(original.learned, {});
  assert.equal(learned.xp, 10);
  assert.equal(learned.coins, 2);
  assert.deepEqual(learned.learned.apple, { level: 0, correct: 0, wrong: 0, dueAt: NOW, discoveredAt: NOW });
  assert.deepEqual(learnWord(learned, 'apple', NOW + DAY), learned);
  assert.equal(learnWord(learned, '__proto__', NOW), learned);
});

test('successful review grows spacing and caps mastery', () => {
  let state = learnWord(createProgress(), 'book', NOW);
  const delays = [600_000, DAY, 3 * DAY, 7 * DAY, 14 * DAY, 14 * DAY];
  for (let index = 0; index < delays.length; index += 1) {
    const before = state;
    const reviewTime = before.learned.book.dueAt;
    state = gradeWord(state, 'book', true, reviewTime);
    assert.equal(state.learned.book.level, Math.min(index + 1, 5));
    assert.equal(state.learned.book.dueAt, reviewTime + delays[index]);
    assert.equal(before.learned.book.correct, index);
  }
  assert.equal(state.xp, 58);
  assert.equal(state.coins, 8);
  assert.equal(state.learned.book.correct, 6);
});

test('repeated early correct practice rewards effort without inflating spaced mastery', () => {
  let state = gradeWord(learnWord(createProgress(), 'apple', NOW), 'apple', true, NOW);
  const scheduled = state.learned.apple.dueAt;
  const initial = state;
  for (let index = 1; index <= 6; index += 1) state = gradeWord(state, 'apple', true, NOW + index * 1_000);
  assert.equal(state.learned.apple.level, 1);
  assert.equal(state.learned.apple.dueAt, scheduled);
  assert.equal(state.learned.apple.correct, 7);
  assert.equal(state.xp, initial.xp + 6 * 8);
  assert.equal(state.coins, initial.coins + 6);
  const dueSuccess = gradeWord(state, 'apple', true, scheduled);
  assert.equal(dueSuccess.learned.apple.level, 2);
  assert.equal(dueSuccess.learned.apple.dueAt, scheduled + DAY);
  const failed = gradeWord(dueSuccess, 'apple', false, scheduled + 1);
  assert.equal(failed.learned.apple.level, 1);
  assert.equal(failed.learned.apple.dueAt, scheduled + 60_001);
  const earlyRetry = gradeWord(failed, 'apple', true, scheduled + 2);
  assert.equal(earlyRetry.learned.apple.level, 1);
  assert.equal(earlyRetry.learned.apple.dueAt, failed.learned.apple.dueAt);
  const failedAgain = gradeWord(learnWord(createProgress(), 'book', NOW), 'book', false, NOW);
  const earlyAtZero = gradeWord(failedAgain, 'book', true, NOW + 1);
  assert.equal(earlyAtZero.learned.book.level, 0);
  assert.equal(earlyAtZero.learned.book.dueAt, NOW + 60_000);
});

test('incorrect reviews return in one minute, reduce mastery, and grant no review reward', () => {
  const discovered = learnWord(createProgress(), 'fish', NOW);
  const reviewed = gradeWord(discovered, 'fish', true, NOW);
  const incorrect = gradeWord(reviewed, 'fish', false, NOW + 1);
  assert.equal(incorrect.learned.fish.level, 0);
  assert.equal(incorrect.learned.fish.wrong, 1);
  assert.equal(incorrect.learned.fish.dueAt, NOW + 60_001);
  assert.equal(incorrect.xp, reviewed.xp);
  assert.equal(incorrect.coins, reviewed.coins);
  assert.equal(gradeWord(incorrect, 'fish', false, NOW + 2).learned.fish.level, 0);
});

test('daily streaks count study days once and reset after missing a day', () => {
  const dayOne = learnWord(createProgress(), 'apple', NOW);
  const sameDay = learnWord(dayOne, 'book', NOW + 1);
  const nextDay = gradeWord(sameDay, 'book', true, NOW + DAY);
  const skippedDay = gradeWord(nextDay, 'book', true, NOW + 3 * DAY);
  assert.equal(dayOne.streak, 1);
  assert.equal(sameDay.streak, 1);
  assert.equal(nextDay.streak, 2);
  assert.equal(skippedDay.streak, 1);
});

test('due queue is ordered, excludes future cards, and uses actual word objects', () => {
  let state = learnWord(createProgress(), 'apple', NOW);
  state = learnWord(state, 'book', NOW + 2);
  state = learnWord(state, 'fish', NOW + 1);
  state = gradeWord(state, 'book', true, NOW + 2);
  assert.deepEqual(getDueWords(state, NOW + 3).map((word) => word.id), ['apple', 'fish']);
  assert.equal(getDueWords(state, NOW)[0], find('apple'));
});

test('sessions prioritize due cards and provide four distinct answer options', () => {
  let state = learnWord(createProgress(), 'apple', NOW);
  state = learnWord(state, 'book', NOW + 1);
  state = gradeWord(state, 'apple', true, NOW + 2);
  const questions = buildSession(state, { now: NOW + 3, random: () => 0.4 });
  assert.equal(questions.length, 5);
  assert.equal(questions[0].wordId, 'book');
  assert.deepEqual(questions.slice(0, 3).map((question) => question.type), ['choice', 'listen', 'type']);
  for (const question of questions) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.options.includes(question.wordId));
  }
});

test('empty saves get region-specific starters and selected exercise modes', () => {
  for (const region of ['village', 'garden', 'harbor']) {
    const questions = buildSession(createProgress(), { region, mode: 'listen', random: () => 0.5 });
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => find(question.wordId).region === region && question.type === 'listen'));
  }
  assert.ok(buildSession(createProgress(), { mode: 'type' }).every((question) => question.type === 'type'));
  assert.deepEqual(buildSession(createProgress(), { region: 'unavailable' }), []);
});

test('typed answers accept accents, punctuation, native writing, or readings', () => {
  assert.equal(normalizeAnswer('  CAFÉ!  '), 'cafe');
  assert.equal(checkAnswer(find('coffee'), 'cafe', 'es'), true);
  assert.equal(checkAnswer(find('apple'), 'der Apfel', 'de'), true);
  assert.equal(checkAnswer(find('apple'), 'Apfel', 'de'), true);
  assert.equal(checkAnswer(find('key'), 'Schlussel', 'de'), true);
  assert.equal(checkAnswer(find('apple'), '苹果', 'zh'), true);
  assert.equal(checkAnswer(find('apple'), 'píngguǒ', 'zh'), true);
  assert.equal(checkAnswer(find('apple'), 'ping guo', 'zh'), true);
  assert.equal(checkAnswer(find('milk'), 'niu nai', 'zh'), true);
  assert.equal(checkAnswer(find('cat'), 'NEKO!', 'ja'), true);
  assert.equal(checkAnswer(find('cat'), '猫', 'ja'), true);
  assert.equal(checkAnswer(find('cat'), '', 'ja'), false);
  assert.equal(checkAnswer(find('cat'), '!!!', 'ja'), false);
  assert.equal(checkAnswer(find('key'), 'かき', 'ja'), false);
  assert.notEqual(normalizeAnswer('かぎ'), normalizeAnswer('かき'));
});

test('XP levels use consistent 100 XP boundaries', () => {
  assert.deepEqual(getLevel(0), { level: 1, xpInLevel: 0, xpForNext: 100, progress: 0 });
  assert.deepEqual(getLevel(250), { level: 3, xpInLevel: 50, xpForNext: 100, progress: 0.5 });
  assert.equal(getLevel(-1).level, 1);
});

test('save validation clones valid data and rejects corrupt or unsafe input', () => {
  const original = gradeWord(learnWord(createProgress('de'), 'apple', NOW), 'apple', true, NOW);
  const copy = validateProgress(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(copy, original);
  assert.notEqual(copy.learned, original.learned);
  assert.notEqual(copy.learned.apple, original.learned.apple);
  for (const invalid of [null, [], {}, { ...original, xp: NaN }, { ...original, xp: -1 },
    { ...original, language: 'xx' }, { ...original, version: 2 }, { ...original, lastStudy: '2026-02-31' },
    { ...original, learned: { injected: original.learned.apple } },
    { ...original, learned: { apple: { ...original.learned.apple, dueAt: 'tomorrow' } } },
    { ...original, learned: { apple: { ...original.learned.apple, level: 6 } } },
    { ...original, settings: { sound: 'true', motion: true } },
    { ...original, projects: ['injected'] },
    { ...original, quests: [{ id: 'quest' }] }]) assert.equal(validateProgress(invalid), null);
  const unsafe = JSON.parse(JSON.stringify(original));
  Object.defineProperty(unsafe.learned, '__proto__', { value: { polluted: true }, enumerable: true });
  assert.equal(validateProgress(unsafe), null);
  assert.equal({}.polluted, undefined);
});

test('empty saves validate and previous saves migrate the conversation list', () => {
  const empty = createProgress('es');
  assert.deepEqual(empty.conversations, []);
  assert.deepEqual(validateProgress(empty), empty);
  const legacy = JSON.parse(JSON.stringify(empty));
  delete legacy.conversations;
  assert.deepEqual(validateProgress(legacy), empty);
  assert.equal(Object.hasOwn(legacy, 'conversations'), false);
});

test('conversation saves allow only known IDs and sanitize duplicates', () => {
  const original = {
    ...createProgress(),
    conversations: ['cafe-conversation', 'cafe-conversation', 'garden-conversation', 'harbor-conversation'],
    projects: ['picnic', 'picnic'],
  };
  const copy = validateProgress(original);
  assert.deepEqual(copy.conversations, ['cafe-conversation', 'garden-conversation', 'harbor-conversation']);
  assert.deepEqual(copy.projects, ['picnic']);
  assert.notEqual(copy.conversations, original.conversations);
  const all = ['cafe-conversation', 'garden-conversation', 'harbor-conversation', 'village-conversation'];
  assert.deepEqual(validateProgress({ ...original, conversations: all }).conversations, all);
  for (const conversations of [null, undefined, 'cafe-conversation', {}, ['injected'], [null], [1], Array(1), [...all, 'cafe-conversation']]) {
    assert.equal(validateProgress({ ...original, conversations }), null);
  }
});

test('malformed imports never produce partial or unsafe progress', () => {
  const original = createProgress();
  for (const value of ['', 'null', '{}', 0, true, false, undefined, NaN, Infinity, () => {}, new Date(),
    { ...original, learned: null }, { ...original, learned: [] },
    { ...original, learned: { apple: null } },
    { ...original, learned: { apple: { level: 0, correct: 0, wrong: 0, dueAt: Infinity, discoveredAt: NOW } } },
    { ...original, quests: Array(1) }, { ...original, projects: Array(1) },
    { ...original, xp: Number.MAX_SAFE_INTEGER + 1 },
    { ...original, settings: null }, { ...original, streak: -1 }, { ...original, lastStudy: 'not-a-date' }]) {
    assert.equal(validateProgress(value), null);
  }
  const throwing = { ...original, get learned() { throw new Error('malicious getter'); } };
  assert.equal(validateProgress(throwing), null);
  const unrelated = { ...original, injected: { dangerous: true } };
  assert.equal(Object.hasOwn(validateProgress(unrelated), 'injected'), false);
});
