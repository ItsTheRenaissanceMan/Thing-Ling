import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS, PHRASES, CHARACTERS, CONVERSATIONS, getConversation, awardConversation, getQuestState, getAvailableQuests, awardQuest } from '../src/story.js';

const firstQuest = QUESTS[0];
const learningRecords = (ids) => Object.fromEntries(ids.map((id) => [id, { level: 1, correct: 1, wrong: 0, dueAt: 1, discoveredAt: 1 }]));

test('the opening quest is available before learning and ready after all target words', () => {
  assert.equal(getQuestState(firstQuest, {}), 'available');
  assert.equal(getQuestState(firstQuest, { learned: learningRecords(['apple', 'book']) }), 'available');
  assert.equal(getQuestState(firstQuest, { learned: learningRecords(firstQuest.wordIds) }), 'ready');
});

test('claiming a ready quest awards once without mutating the original progress', () => {
  const progress = { quests: [], learned: learningRecords(firstQuest.wordIds), xp: 20, coins: 4, language: 'ja' };
  const updated = awardQuest(progress, firstQuest.id);
  assert.notEqual(updated, progress);
  assert.equal(updated.xp, 20 + firstQuest.reward.xp);
  assert.equal(updated.coins, 4 + firstQuest.reward.coins);
  assert.deepEqual(updated.quests, [firstQuest.id]);
  assert.deepEqual(progress.quests, []);
  assert.equal(progress.xp, 20);
  assert.equal(updated.learned, progress.learned);
  assert.equal(updated.language, 'ja');
  assert.equal(awardQuest(updated, firstQuest.id), updated);
  assert.equal(getQuestState(firstQuest, updated), 'completed');
});

test('learning all words cannot bypass quest dependencies', () => {
  const laterQuest = QUESTS.find((quest) => quest.id === 'kettle-on');
  const progress = { quests: [], learned: learningRecords(laterQuest.wordIds), xp: 0, coins: 0 };
  assert.equal(getQuestState(laterQuest, progress), 'locked');
  assert.equal(awardQuest(progress, laterQuest.id), progress);
  assert.equal(getQuestState(laterQuest, { ...progress, quests: [firstQuest.id] }), 'ready');
});

test('the last landmark needs all three restoration story lines', () => {
  const finale = QUESTS.find((quest) => quest.id === 'harbor-lanterns');
  const progress = { learned: learningRecords(finale.wordIds), quests: ['homecoming-parcel', 'lantern-cafe'] };
  assert.equal(getQuestState(finale, progress), 'locked');
  assert.equal(getQuestState(finale, { ...progress, quests: [...progress.quests, 'garden-in-bloom'] }), 'ready');
});

test('unknown and unfinished claims preserve progress and cannot create rewards', () => {
  const progress = { quests: [], learned: {}, xp: 2, coins: 3 };
  assert.equal(awardQuest(progress, 'does-not-exist'), progress);
  assert.equal(awardQuest(progress, firstQuest.id), progress);
});

test('the quest board shows actionable quests in the requested region', () => {
  const progress = { quests: [firstQuest.id], learned: {} };
  assert.deepEqual(getAvailableQuests(progress).map(({ id }) => id), ['kettle-on', 'first-seedlings', 'water-edge']);
  assert.deepEqual(getAvailableQuests(progress, 'garden').map(({ id }) => id), ['first-seedlings']);
});

test('story references are complete and have no forward dependency cycles', () => {
  const seen = new Set();
  const words = new Set();
  for (const quest of QUESTS) {
    assert.ok(!seen.has(quest.id), `Duplicate quest: ${quest.id}`);
    assert.ok(quest.requires.every((id) => seen.has(id)), `Missing or forward dependency for ${quest.id}`);
    seen.add(quest.id);
    quest.wordIds.forEach((id) => words.add(id));
  }
  assert.equal(words.size, 48);
  assert.equal(QUESTS.filter((quest) => quest.milestone).length, 3);
  assert.equal(PHRASES.length, 12);
  for (const phrase of PHRASES) {
    assert.deepEqual(Object.keys(phrase.translations).sort(), ['de', 'es', 'ja', 'zh']);
    for (const language of ['de', 'ja', 'es', 'zh']) assert.ok(phrase.translations[language].text);
    assert.ok(phrase.translations.zh.reading, `${phrase.id} needs Mandarin pronunciation`);
  }
});

test('conversation rewards are immutable and can only be awarded once', () => {
  const conversation = CONVERSATIONS[0];
  const progress = { xp: 9, coins: 2, learned: { coffee: { level: 2 } }, quests: ['little-hello'], conversations: [], language: 'ja' };
  const updated = awardConversation(progress, conversation.id);
  assert.notEqual(updated, progress);
  assert.equal(updated.xp, 9 + conversation.reward.xp);
  assert.equal(updated.coins, 2 + conversation.reward.coins);
  assert.deepEqual(updated.conversations, [conversation.id]);
  assert.deepEqual(progress.conversations, []);
  assert.equal(progress.xp, 9);
  assert.equal(updated.learned, progress.learned);
  assert.equal(updated.quests, progress.quests);
  assert.equal(updated.language, 'ja');
  assert.equal(awardConversation(updated, conversation.id), updated);
});

test('unknown conversations cannot award rewards', () => {
  const progress = { xp: 4, coins: 3, conversations: [] };
  assert.equal(getConversation('not-a-conversation'), undefined);
  assert.equal(awardConversation(progress, 'not-a-conversation'), progress);
});

test('each character has a complete scenario with valid and distinct phrase choices', () => {
  const phraseIds = new Set(PHRASES.map(({ id }) => id));
  const characterIds = new Set(CHARACTERS.map(({ id }) => id));
  const scenariosByCharacter = new Set();
  const practicedPhrases = new Set();
  assert.equal(CONVERSATIONS.length, 4);
  for (const conversation of CONVERSATIONS) {
    assert.equal(getConversation(conversation.id), conversation);
    assert.ok(characterIds.has(conversation.characterId));
    assert.ok(!scenariosByCharacter.has(conversation.characterId));
    scenariosByCharacter.add(conversation.characterId);
    assert.ok(conversation.steps.length >= 3);
    for (const step of conversation.steps) {
      assert.ok(step.prompt && step.reply);
      assert.ok(phraseIds.has(step.phraseId));
      practicedPhrases.add(step.phraseId);
      assert.equal(step.distractorIds.length, 2);
      assert.equal(new Set([step.phraseId, ...step.distractorIds]).size, 3);
      assert.ok(step.distractorIds.every((id) => phraseIds.has(id)));
    }
  }
  assert.equal(scenariosByCharacter.size, characterIds.size);
  assert.deepEqual(practicedPhrases, phraseIds);
});
