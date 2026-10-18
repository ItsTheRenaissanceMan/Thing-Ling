import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES } from '../src/data.js';
import { createProgress, learnWord, validateProgress } from '../src/learning.js';
import { QUESTS } from '../src/story.js';
import {
  MISSION_DEFINITIONS, getMissionDefinition, getMissionSummary, startMission, goHome,
  collectMissionWord, markMissionAssessment, submitMission,
} from '../src/missions.js';

const NOW = Date.parse('2026-10-18T12:00:00.000Z');
const firstQuest = QUESTS[0];

function collectAll(progress, quest) {
  return quest.wordIds.reduce((state, id) => collectMissionWord(state, quest.id, id, NOW), progress);
}

function finishMission(progress, quest) {
  const visited = startMission(progress, quest.id);
  const collected = collectAll(visited, quest);
  const assessed = markMissionAssessment(collected, quest.id, quest.wordIds.length, quest.wordIds.length);
  return submitMission(assessed, quest.id);
}

test('all twelve story chapters have distinct authored mission actions and complete target steps', () => {
  assert.equal(MISSION_DEFINITIONS.length, 12);
  assert.equal(new Set(MISSION_DEFINITIONS.map((mission) => mission.mapId)).size, 12);
  assert.equal(new Set(MISSION_DEFINITIONS.map((mission) => mission.action)).size, 12);
  for (const quest of QUESTS) {
    const mission = getMissionDefinition(quest.id);
    assert.equal(mission.questId, quest.id);
    assert.equal(mission.mapId, quest.id);
    assert.deepEqual(mission.steps.map((step) => step.wordId), quest.wordIds);
    for (const field of ['actionLabel', 'objectiveTitle', 'instruction', 'turnInText']) assert.ok(mission[field].length > 10);
    for (const step of mission.steps) {
      for (const field of ['instruction', 'actionLabel', 'completionText']) assert.ok(step[field].length > 10);
    }
  }
  assert.equal(getMissionDefinition('unknown'), undefined);
});

test('each supported language can finish the full physical twelve-map campaign and retain all rewards', () => {
  for (const { id: language } of LANGUAGES) {
    let progress = createProgress(language);
    let expectedXp = 0;
    let expectedCoins = 0;
    for (const quest of QUESTS) {
      const before = progress;
      assert.equal(getMissionSummary(before, quest.id).phase, 'discover');
      progress = startMission(progress, quest.id);
      assert.equal(progress.mapId, quest.id);
      assert.equal(before.mapId, 'home');
      const entered = progress;
      progress = collectAll(progress, quest);
      expectedXp += quest.wordIds.length * 10;
      expectedCoins += quest.wordIds.length * 2;
      assert.deepEqual(entered.missions[quest.id], undefined);
      assert.equal(getMissionSummary(progress, quest.id).phase, 'challenge');
      assert.deepEqual(getMissionSummary(progress, quest.id).doneWordIds, quest.wordIds);
      assert.deepEqual(getMissionSummary(progress, quest.id).pendingWordIds, []);
      assert.equal(progress.xp, expectedXp);
      assert.equal(progress.coins, expectedCoins);
      const discovered = progress;
      progress = markMissionAssessment(progress, quest.id, quest.wordIds.length, quest.wordIds.length);
      assert.equal(getMissionSummary(progress, quest.id).phase, 'return');
      assert.equal(progress.xp, discovered.xp);
      assert.equal(progress.coins, discovered.coins);
      assert.equal(progress.quests.includes(quest.id), false);
      assert.equal(discovered.missions[quest.id].assessmentPassed, false);
      assert.equal(markMissionAssessment(progress, quest.id, quest.wordIds.length, quest.wordIds.length), progress);
      const assessed = progress;
      progress = submitMission(progress, quest.id);
      expectedXp += quest.reward.xp;
      expectedCoins += quest.reward.coins;
      assert.equal(getMissionSummary(progress, quest.id).phase, 'complete');
      assert.equal(progress.missions[quest.id].submitted, true);
      assert.equal(assessed.missions[quest.id].submitted, undefined);
      assert.equal(progress.xp, expectedXp);
      assert.equal(progress.coins, expectedCoins);
      assert.equal(submitMission(progress, quest.id), progress);
      assert.equal(collectMissionWord(progress, quest.id, quest.wordIds[0], NOW), progress);
      assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(progress))), progress);
      progress = goHome(progress);
    }
    assert.equal(progress.language, language);
    assert.deepEqual(progress.quests, QUESTS.map((quest) => quest.id));
    assert.equal(Object.keys(progress.learned).length, 48);
    assert.equal(Object.keys(progress.missions).length, 12);
    assert.equal(progress.mapId, 'home');
  }
});

test('locked, unknown, wrong-map, and non-target actions cannot advance a mission', () => {
  const empty = createProgress();
  const locked = QUESTS[1];
  for (const id of [locked.id, 'harbor-lanterns', 'unknown', '__proto__']) {
    assert.equal(getMissionSummary(empty, id).phase, 'locked');
    assert.equal(startMission(empty, id), empty);
    assert.equal(collectMissionWord(empty, id, 'apple', NOW), empty);
    assert.equal(markMissionAssessment(empty, id, 3, 3), empty);
    assert.equal(submitMission(empty, id), empty);
  }
  assert.equal(collectMissionWord(empty, firstQuest.id, 'apple', NOW), empty);
  const inMap = startMission(empty, firstQuest.id);
  assert.equal(startMission(inMap, firstQuest.id), inMap);
  for (const id of ['coffee', 'unknown', '__proto__', null, undefined]) {
    assert.equal(collectMissionWord(inMap, firstQuest.id, id, NOW), inMap);
  }
  const collected = collectMissionWord(inMap, firstQuest.id, 'apple', NOW);
  assert.equal(collected.missions['little-hello'].collected.length, 1);
  assert.equal(collectMissionWord(collected, firstQuest.id, 'apple', NOW + 1), collected);
  assert.deepEqual(getMissionSummary(collected, firstQuest.id).pendingWordIds, ['book', 'flower']);
  const home = goHome(collected);
  assert.equal(goHome(home), home);
  assert.equal(collectMissionWord(home, firstQuest.id, 'book', NOW), home);
});

test('journal discoveries never replace physical mission interactions or pay discovery rewards twice', () => {
  const journalOnly = firstQuest.wordIds.reduce((state, id) => learnWord(state, id, NOW), createProgress());
  assert.equal(getMissionSummary(journalOnly, firstQuest.id).phase, 'discover');
  assert.equal(getMissionSummary(journalOnly, firstQuest.id).completed, 0);
  assert.equal(markMissionAssessment(journalOnly, firstQuest.id, 3, 3), journalOnly);
  assert.equal(submitMission(journalOnly, firstQuest.id), journalOnly);
  const visited = startMission(journalOnly, firstQuest.id);
  const physical = collectAll(visited, firstQuest);
  assert.equal(physical.xp, journalOnly.xp);
  assert.equal(physical.coins, journalOnly.coins);
  assert.equal(getMissionSummary(physical, firstQuest.id).phase, 'challenge');
});

test('all objects, a perfect sized assessment, and an on-map return are required before payment', () => {
  const entered = startMission(createProgress(), firstQuest.id);
  const oneObject = collectMissionWord(entered, firstQuest.id, 'apple', NOW);
  assert.equal(markMissionAssessment(oneObject, firstQuest.id, 3, 3), oneObject);
  assert.equal(submitMission(oneObject, firstQuest.id), oneObject);
  const allObjects = collectAll(oneObject, firstQuest);
  for (const [correct, total] of [[2, 3], [3, 4], [4, 4], [0, 0], [-1, 3], [NaN, 3], [3, Infinity], ['3', 3], [3, '3'], [3.5, 3.5]]) {
    assert.equal(markMissionAssessment(allObjects, firstQuest.id, correct, total), allObjects);
  }
  assert.equal(submitMission(allObjects, firstQuest.id), allObjects);
  const homeBeforeAssessment = goHome(allObjects);
  assert.equal(markMissionAssessment(homeBeforeAssessment, firstQuest.id, 3, 3), homeBeforeAssessment);
  const passed = markMissionAssessment(allObjects, firstQuest.id, 3, 3);
  const homeAfterAssessment = goHome(passed);
  assert.equal(submitMission(homeAfterAssessment, firstQuest.id), homeAfterAssessment);
  const returned = startMission(homeAfterAssessment, firstQuest.id);
  assert.equal(getMissionSummary(returned, firstQuest.id).phase, 'return');
  const completed = submitMission(returned, firstQuest.id);
  assert.equal(completed.xp, returned.xp + firstQuest.reward.xp);
  assert.equal(completed.coins, returned.coins + firstQuest.reward.coins);
});

test('branch dependencies gate map access and the final lighthouse requires all three story branches', () => {
  let progress = finishMission(createProgress(), firstQuest);
  for (const id of ['kettle-on', 'first-seedlings', 'water-edge']) assert.equal(getMissionSummary(progress, id).phase, 'discover');
  for (const quest of QUESTS.filter((entry) => ['water-edge', 'lost-and-found', 'homecoming-parcel'].includes(entry.id))) progress = finishMission(progress, quest);
  assert.equal(getMissionSummary(progress, 'harbor-lanterns').phase, 'locked');
  for (const quest of QUESTS.filter((entry) => ['kettle-on', 'breakfast-club', 'lantern-cafe'].includes(entry.id))) progress = finishMission(progress, quest);
  assert.equal(getMissionSummary(progress, 'harbor-lanterns').phase, 'locked');
  for (const quest of QUESTS.filter((entry) => ['first-seedlings', 'orchard-colors', 'small-neighbors', 'garden-in-bloom'].includes(entry.id))) progress = finishMission(progress, quest);
  assert.equal(getMissionSummary(progress, 'harbor-lanterns').phase, 'discover');
});

test('completed legacy chapters stay completed without mission records and permit return visits', () => {
  const oldSave = {
    ...firstQuest.wordIds.reduce((state, id) => learnWord(state, id, NOW), createProgress()),
    quests: [firstQuest.id], xp: 74, coins: 31, projects: ['picnic'], conversations: ['village-conversation'],
  };
  delete oldSave.mapId;
  delete oldSave.missions;
  const upgraded = validateProgress(oldSave);
  assert.equal(upgraded.mapId, 'home');
  assert.deepEqual(upgraded.missions, {});
  assert.equal(upgraded.xp, 74);
  assert.equal(upgraded.coins, 31);
  assert.deepEqual(upgraded.learned, oldSave.learned);
  assert.deepEqual(upgraded.quests, oldSave.quests);
  assert.deepEqual(upgraded.projects, oldSave.projects);
  assert.deepEqual(upgraded.conversations, oldSave.conversations);
  const summary = getMissionSummary(upgraded, firstQuest.id);
  assert.equal(summary.phase, 'complete');
  assert.equal(summary.completed, summary.total);
  assert.deepEqual(summary.pendingWordIds, []);
  const revisited = startMission(upgraded, firstQuest.id);
  assert.equal(revisited.mapId, firstQuest.id);
  assert.equal(collectMissionWord(revisited, firstQuest.id, 'apple', NOW), revisited);
  assert.equal(submitMission(revisited, firstQuest.id), revisited);
  assert.equal(getMissionSummary(revisited, 'kettle-on').phase, 'discover');
});
