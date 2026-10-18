import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { WORDS } from '../src/data.js';
import { QUESTS, PHRASES, CONVERSATIONS } from '../src/story.js';
import { createProgress, learnWord, validateProgress } from '../src/learning.js';
import { startMission, collectMissionWord, markMissionAssessment, submitMission } from '../src/missions.js';

const STORAGE = 'thing-ling.saves.v1';

async function readSave(page, language = 'ja') {
  return page.evaluate(({ key, language }) => JSON.parse(localStorage.getItem(key) || '{}')[language], { key: STORAGE, language });
}

async function navigate(page, name) {
  await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
}

async function learn(page, id) {
  await navigate(page, 'Wordbook');
  await page.locator(`#word-grid [data-word="${id}"]`).click();
  await page.getByRole('button', { name: /Add to my wordbook/ }).click();
  await expect(page.getByRole('button', { name: 'Practice this word' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
}

// Identify the question from its visible prompt, so random question order and
// distractors are exercised without relying on an internal quiz test API.
async function answerCurrent(page, language = 'ja') {
  const input = page.getByRole('textbox', { name: 'Your answer' });
  let word;
  if (await input.count()) {
    const prompt = await page.locator('.quiz-prompt').innerText();
    word = WORDS.find(candidate => prompt === `How do you say “${candidate.english}”?`);
    expect(word, `Recognized question: ${prompt}`).toBeTruthy();
    await input.fill(word.translations[language].reading);
    await page.getByRole('button', { name: /Check my answer/ }).click();
  } else {
    const reveal = page.locator('#reveal-reading');
    if (await reveal.count()) await reveal.click();
    const native = await page.locator('.quiz-word strong').innerText();
    word = WORDS.find(candidate => candidate.translations[language].text === native);
    expect(word, `Recognized written word: ${native}`).toBeTruthy();
    await page.locator(`[data-answer="${word.id}"]`).click();
  }
  await expect(page.locator('#quiz-feedback .correct')).toBeVisible();
  await expect(page.locator('#quiz-feedback')).toContainText(word.english);
  await page.locator('#next-question').click();
  return word;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A little world. A lot to discover.' })).toBeVisible();
  await expect(page.getByLabel('Learning language')).toHaveValue('de');
  expect(await page.getByLabel('Learning language').locator('option').evaluateAll(options => options.map(option => option.value).sort())).toEqual(['de', 'es', 'ja', 'zh']);
  await page.getByLabel('Learning language').selectOption('ja');
});

test('3D village starts, map travel and all sections work on a narrow screen', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.reload();
  await expect(page.locator('#world canvas')).toBeVisible();
  await expect(page.locator('.world-fallback')).toHaveCount(0);
  expect(await page.locator('#world canvas').evaluate(canvas => Boolean(canvas.getContext('webgl2')))).toBe(true);
  await page.locator('#open-atlas').click();
  await page.locator(`[data-travel="${QUESTS[0].id}"]`).click();
  await expect(page.locator('#world')).toHaveAttribute('data-map-id', QUESTS[0].id);
  await expect(page.locator('#location-name')).not.toHaveText('The Village');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, title] of [
    ['Wordbook', 'Your wordbook.'],
    ['Practice', 'Make it second nature.'],
    ['Quests', 'A few little favors.'],
    ['Phrasebook', 'Something worth saying.'],
  ]) {
    await navigate(page, name);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} fits a phone viewport`).toBe(true);
    expect(await page.locator('#section-page').evaluate(section => section.scrollWidth <= section.clientWidth + 1), `${name} content has no horizontal overflow`).toBe(true);
  }
  await navigate(page, 'Explore');
  await expect(page.locator('#world canvas')).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('discovery rewards once and language wordbooks persist independently', async ({ page }) => {
  await learn(page, 'apple');
  const initial = await readSave(page);
  expect(initial.xp).toBe(10);
  expect(initial.coins).toBe(2);
  await page.locator('#word-grid [data-word="apple"]').click();
  await expect(page.getByRole('button', { name: /Add to my wordbook/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Keep exploring' }).click();
  expect(await readSave(page)).toEqual(initial);

  await page.getByLabel('Learning language').selectOption('es');
  await expect(page.locator('#words-count')).toHaveText('0');
  await learn(page, 'book');
  expect(Object.keys((await readSave(page, 'es')).learned)).toEqual(['book']);
  await page.reload();
  await expect(page.getByLabel('Learning language')).toHaveValue('es');
  await expect(page.locator('#words-count')).toHaveText('1');
  await page.getByLabel('Learning language').selectOption('ja');
  expect(await readSave(page)).toEqual(initial);
  await navigate(page, 'Wordbook');
  await expect(page.locator('#word-grid [data-word="apple"]')).toHaveClass(/is-discovered/);
  await expect(page.locator('#word-grid [data-word="book"]')).not.toHaveClass(/is-discovered/);
});

test('mixed practice accepts matching, listening fallback, and Japanese romanization', async ({ page }) => {
  await learn(page, 'apple');
  await navigate(page, 'Practice');
  await page.getByRole('button', { name: /Start a little practice/ }).click();
  await expect(page.locator('[data-answer="apple"]')).toBeVisible();
  for (let index = 0; index < 5; index += 1) {
    const word = await answerCurrent(page);
    expect(word.id).toBe('apple');
  }
  await expect(page.getByRole('heading', { name: 'A lovely little success.' })).toBeVisible();
  await expect(page.locator('.result-stats')).toContainText('5/5');
  const save = await readSave(page);
  expect(save.learned.apple.correct).toBe(5);
  expect(save.learned.apple.wrong).toBe(0);
  expect(save.xp).toBe(50);
  expect(save.learned.apple.level).toBe(1);
  expect(save.learned.apple.dueAt).toBeGreaterThan(Date.now() + 9 * 60_000);
  expect(save.learned.apple.dueAt).toBeLessThan(Date.now() + 11 * 60_000);
  await page.getByRole('button', { name: /Back to my little world/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a mistake shows the correct answer and waits before advancing', async ({ page }) => {
  await learn(page, 'apple');
  await navigate(page, 'Practice');
  await page.locator('[data-practice="type"]').click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('this is not an apple');
  await page.getByRole('button', { name: /Check my answer/ }).click();
  await expect(page.locator('#quiz-feedback')).toContainText('A little learning moment.');
  await expect(page.locator('#quiz-feedback')).toContainText('りんご · ringo — apple');
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeDisabled();
  await expect(page.locator('.modal-eyebrow')).toContainText('1 / 5');
  const wrong = await readSave(page);
  expect(wrong.learned.apple.wrong).toBe(1);
  expect(wrong.learned.apple.correct).toBe(0);
  expect(wrong.xp).toBe(10);
  await page.locator('#next-question').click();
  await expect(page.locator('.modal-eyebrow')).toContainText('2 / 5');
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('opening quest requires physical discovery and explicit turn-in, awards once, and persists', async ({ page }) => {
  const quest = QUESTS[0];
  for (const id of quest.wordIds) await learn(page, id);
  await navigate(page, 'Explore');
  await page.locator('#open-atlas').click();
  await page.locator(`[data-travel="${quest.id}"]`).click();
  // Learning the words in a menu must not replace doing the actual mission.
  await expect(page.locator('#mission-challenge')).toHaveCount(0);
  for (const id of quest.wordIds) {
    await page.locator('#open-map-objects').click();
    await page.getByRole('dialog').locator(`[data-map-word="${id}"]`).first().click();
    await page.locator('#mission-word-action').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.locator('#mission-challenge').click();
  for (let index = 0; index < quest.wordIds.length; index += 1) await answerCurrent(page);
  expect((await readSave(page)).quests).toEqual([]);
  await page.locator('#finish-practice').click();
  await page.locator('#mission-return').click();
  await page.locator('#mission-turn-in').click();
  const completed = await readSave(page);
  expect(completed.quests).toEqual([quest.id]);
  expect(completed.xp).toBe(3 * 10 + 3 * 8 + quest.reward.xp);
  expect(completed.coins).toBe(3 * 2 + 3 + quest.reward.coins);
  await page.locator('#mission-complete-done').click();
  await expect(page.locator('#mission-challenge')).toHaveCount(0);
  expect(await readSave(page)).toEqual(completed);
  await page.reload();
  expect(await readSave(page)).toEqual(completed);
});

test('preferences survive reload, export saves, and malformed import preserves progress', async ({ page }) => {
  await learn(page, 'apple');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#setting-sound').uncheck();
  await page.locator('#setting-motion').uncheck();
  await page.getByRole('button', { name: /All comfy/ }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('#setting-sound')).not.toBeChecked();
  await expect(page.locator('#setting-motion')).not.toBeChecked();
  const before = await readSave(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export progress' }).click();
  const download = await downloadEvent;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.app).toBe('thing-ling');
  expect(exported.saves.ja).toEqual(before);
  await page.locator('#import-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'thing-ling', version: 1, saves: { ja: { ...before, xp: -100 } } })) });
  await expect(page.getByRole('status').filter({ hasText: 'Your progress is safe.' })).toBeVisible();
  expect(await readSave(page)).toEqual(before);
  await expect(page.getByRole('dialog')).toContainText('Your little preferences.');
});

test('contextual conversation teaches a mistaken phrase and awards completion once', async ({ page }) => {
  const conversation = CONVERSATIONS[0];
  await page.getByLabel('Learning language').selectOption('de');
  await navigate(page, 'Phrasebook');
  await page.locator(`.conversation-card[data-conversation="${conversation.id}"]`).click();
  await expect(page.locator('.conversation-prompt')).toHaveText(conversation.steps[0].prompt);
  const wrongId = conversation.steps[0].distractorIds[0];
  const wrongPhrase = PHRASES.find(phrase => phrase.id === wrongId);
  await page.locator(`[data-phrase-answer="${wrongId}"]`).click();
  await expect(page.locator('#conversation-feedback')).toContainText(`That means “${wrongPhrase.english}”`);
  await expect(page.locator('#conversation-next')).toBeHidden();
  await expect(page.locator(`[data-phrase-answer="${conversation.steps[0].phraseId}"]`)).toBeEnabled();
  for (const step of conversation.steps) {
    await expect(page.locator('.conversation-prompt')).toHaveText(step.prompt);
    await page.locator(`[data-phrase-answer="${step.phraseId}"]`).click();
    await expect(page.locator('#conversation-feedback')).toContainText(step.reply);
    await page.locator('#conversation-next').click();
  }
  await expect(page.getByRole('heading', { name: 'That felt like a conversation.' })).toBeVisible();
  const completed = await readSave(page, 'de');
  expect(completed.conversations).toEqual([conversation.id]);
  expect(completed.xp).toBe(conversation.reward.xp);
  expect(completed.coins).toBe(conversation.reward.coins);
  await page.locator('#conversation-done').click();
  await page.locator(`.conversation-card[data-conversation="${conversation.id}"]`).click();
  for (const step of conversation.steps) {
    await page.locator(`[data-phrase-answer="${step.phraseId}"]`).click();
    await page.locator('#conversation-next').click();
  }
  await expect(page.getByRole('heading', { name: 'That felt like a conversation.' })).toBeVisible();
  expect(await readSave(page, 'de')).toEqual(completed);
  await page.reload();
  expect(await readSave(page, 'de')).toEqual(completed);
});

test('independent restoration branches and a single project purchase persist per language', async ({ page }) => {
  // Generate earned saves through the real progression functions. The two
  // languages deliberately have equal milestone counts but different rewards.
  const earnedBranch = (language, target) => {
    let progress = WORDS.reduce((save, word) => learnWord(save, word.id), createProgress(language));
    const complete = id => {
      const quest = QUESTS.find(item => item.id === id);
      for (const requirement of quest.requires) if (!progress.quests.includes(requirement)) complete(requirement);
      progress = startMission(progress, id);
      for (const wordId of quest.wordIds) progress = collectMissionWord(progress, id, wordId);
      progress = markMissionAssessment(progress, id, quest.wordIds.length, quest.wordIds.length);
      progress = submitMission(progress, id);
    };
    complete(target);
    expect(validateProgress(progress)).toEqual(progress);
    return progress;
  };
  const garden = earnedBranch('de', 'garden-in-bloom');
  const cafe = earnedBranch('ja', 'lantern-cafe');
  expect(QUESTS.filter(quest => quest.milestone && garden.quests.includes(quest.id))).toHaveLength(1);
  expect(QUESTS.filter(quest => quest.milestone && cafe.quests.includes(quest.id))).toHaveLength(1);
  await page.evaluate(({ key, saves }) => {
    localStorage.setItem(key, JSON.stringify(saves));
    localStorage.setItem('thing-ling.language', 'de');
  }, { key: STORAGE, saves: { de: garden, ja: cafe } });
  await page.reload();
  await expect(page.locator('#world')).toHaveAttribute('data-restorations', 'garden');
  await page.getByLabel('Learning language').selectOption('ja');
  await expect(page.locator('#world')).toHaveAttribute('data-restorations', 'cafe');
  await page.getByLabel('Learning language').selectOption('de');
  await expect(page.locator('#world')).toHaveAttribute('data-restorations', 'garden');
  await navigate(page, 'Quests');
  const lanterns = page.locator('[data-project="lanterns"]');
  await expect(lanterns).toBeEnabled();
  await lanterns.click();
  await expect(lanterns).toBeDisabled();
  const purchased = await readSave(page, 'de');
  expect(purchased.projects).toEqual(['lanterns']);
  expect(purchased.coins).toBe(garden.coins - 25);
  expect((await readSave(page)).coins).toBe(cafe.coins);
  await page.reload();
  await expect(page.locator('#world')).toHaveAttribute('data-restorations', 'garden');
  await navigate(page, 'Quests');
  await expect(page.locator('[data-project="lanterns"]')).toBeDisabled();
  expect(await readSave(page, 'de')).toEqual(purchased);
});
