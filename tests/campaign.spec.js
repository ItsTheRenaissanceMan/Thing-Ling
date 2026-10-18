import { test, expect } from '@playwright/test';
import { WORDS, LANGUAGES } from '../src/data.js';
import { QUESTS } from '../src/story.js';
import { createProgress, learnWord } from '../src/learning.js';
import { MAPS } from '../src/maps.js';

const STORAGE = 'thing-ling.saves.v1';
const wordById = new Map(WORDS.map(word => [word.id, word]));
const mapById = new Map(MAPS.map(map => [map.id, map]));

async function readSave(page, language = 'ja') {
  return page.evaluate(({ key, language }) => JSON.parse(localStorage.getItem(key) || '{}')[language], { key: STORAGE, language });
}

async function closeDialog(page) {
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function travel(page, id) {
  await page.locator('#open-atlas').click();
  const destination = page.getByRole('dialog').locator(`[data-travel="${id}"]`);
  await expect(destination).toBeEnabled();
  await destination.click();
  await expect(page.locator('#world')).toHaveAttribute('data-map-id', id);
  await expect(page.locator('#world canvas')).toBeVisible();
}

// Solve the questions from their visible prompts. This exercises randomized
// distractors and the listening fallback, without a browser-side testing API.
async function answerQuestion(page, language) {
  let word;
  const input = page.getByRole('textbox', { name: 'Your answer' });
  if (await input.count()) {
    const prompt = await page.locator('.quiz-prompt').innerText();
    word = WORDS.find(candidate => prompt === `How do you say “${candidate.english}”?`);
    expect(word, `Recognized question: ${prompt}`).toBeTruthy();
    const translation = word.translations[language];
    await input.fill(translation.reading || translation.text);
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
}

async function performMissionActions(page, quest, language) {
  for (const id of quest.wordIds) {
    await page.locator('#open-map-objects').click();
    await page.getByRole('dialog').locator(`[data-map-word="${id}"]`).first().click();
    const word = wordById.get(id);
    await expect(page.getByRole('dialog')).toContainText(word.translations[language].text);
    await expect(page.locator('#mission-word-action')).toBeEnabled();
    await page.locator('#mission-word-action').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
}

async function finishMission(page, quest, language) {
  await expect(page.locator('#mission-challenge')).toBeEnabled();
  await page.locator('#mission-challenge').click();
  for (let index = 0; index < quest.wordIds.length; index += 1) await answerQuestion(page, language);
  // A successful retrieval round must still return to the actual mission giver.
  expect((await readSave(page, language)).quests).not.toContain(quest.id);
  await page.locator('#finish-practice').click();
  await expect(page.locator('#mission-return')).toBeEnabled();
  await page.locator('#mission-return').click();
  await expect(page.locator('#mission-turn-in')).toBeEnabled();
  await page.locator('#mission-turn-in').click();
  await expect.poll(async () => (await readSave(page, language)).quests).toContain(quest.id);
  await page.locator('#mission-complete-done').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function assertMapLabels(page, id, testInfo) {
  const world = page.locator('#world');
  await expect(world).toHaveAttribute('data-map-id', id);
  await expect(world).toHaveAttribute('data-unlabelled-count', '0');
  const count = Number(await world.getAttribute('data-object-count'));
  expect(count, `${id} has a populated scene`).toBeGreaterThanOrEqual(20);
  const labels = page.locator('.world-object-label');
  await expect(labels).toHaveCount(count);
  const identities = await labels.evaluateAll(buttons => buttons.map(button => ({ id: button.dataset.objectId, word: button.dataset.wordId, text: button.textContent.trim() })));
  expect(new Set(identities.map(item => item.id)).size, `${id} labels every physical instance separately`).toBe(count);
  expect(identities.every(item => item.id && item.word && item.text), `${id} has no empty labels`).toBe(true);
  expect(identities.every(item => wordById.has(item.word)), `${id} uses real vocabulary for every label`).toBe(true);
  const instanceIds = new Set(identities.map(item => item.id));
  expect(mapById.get(id).objects.filter(object => !instanceIds.has(object.id)), `${id} labels every authored object as well as its parts`).toEqual([]);
  const quest = QUESTS.find(candidate => candidate.id === id);
  if (quest) expect(quest.wordIds.filter(wordId => !identities.some(item => item.word === wordId)), `${id} has a physical label for every mission target`).toEqual([]);
  if (await page.locator('#toggle-labels').getAttribute('aria-pressed') !== 'true') await page.locator('#toggle-labels').click();
  await expect(page.locator('#toggle-labels')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#open-map-objects').click();
  await expect(page.getByRole('dialog').locator('[data-map-word]')).toHaveCount(count);
  await closeDialog(page);
  await page.screenshot({ path: testInfo.outputPath(`${id}-labels.png`) });
  await page.locator('#toggle-labels').click();
  await page.screenshot({ path: testInfo.outputPath(`${id}-scene.png`) });
  await page.locator('#toggle-labels').click();
}

async function clickVisibleSceneLabel(page) {
  const reachableLabel = async () => page.locator('.world-object-label').evaluateAll(buttons => {
    const button = buttons.find(candidate => {
      const rect = candidate.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) return false;
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.world-object-label') === candidate;
    });
    return button?.dataset.objectId || '';
  });
  await expect.poll(reachableLabel).not.toBe('');
  const id = await reachableLabel();
  await page.locator(`.world-object-label[data-object-id="${id}"]`).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await closeDialog(page);
}

test('all twelve missions have populated maps and play from discovery through final turn-in', async ({ page }, testInfo) => {
  // Thirteen screenshot pairs and the entire campaign share one software-WebGL browser.
  test.setTimeout(900_000);
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.getByLabel('Learning language').selectOption('ja');
  const welcome = page.getByRole('button', { name: 'Dismiss welcome', exact: true });
  if (await welcome.isVisible()) await welcome.click();
  await assertMapLabels(page, 'home', testInfo);
  await clickVisibleSceneLabel(page);

  for (const quest of QUESTS) {
    await test.step(`${quest.title}: travel, interact, retrieve, return`, async () => {
      await travel(page, quest.id);
      await assertMapLabels(page, quest.id, testInfo);
      await expect(page.locator('#mission-challenge')).toHaveCount(0);
      await performMissionActions(page, quest, 'ja');
      await finishMission(page, quest, 'ja');
      expect((await readSave(page)).quests).toContain(quest.id);
    });
  }
  const completed = await readSave(page);
  expect(completed.quests).toHaveLength(QUESTS.length);
  expect(new Set(completed.quests)).toEqual(new Set(QUESTS.map(quest => quest.id)));
  await expect(page.locator('#world')).toHaveAttribute('data-restorations', 'cafe,garden,harbor');
  await page.reload();
  expect(await readSave(page)).toEqual(completed);
  await expect(page.locator('#world')).toHaveAttribute('data-map-id', QUESTS.at(-1).id);
  await expect(page.locator('#world')).toHaveAttribute('data-unlabelled-count', '0');
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('all four languages can complete a physical mission and keep separate maps and saves', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  const quest = QUESTS[0];
  const completed = {};
  for (const language of LANGUAGES) {
    await page.getByLabel('Learning language').selectOption(language.id);
    await travel(page, quest.id);
    await performMissionActions(page, quest, language.id);
    await finishMission(page, quest, language.id);
    completed[language.id] = await readSave(page, language.id);
    expect(completed[language.id].language).toBe(language.id);
    expect(completed[language.id].quests).toEqual([quest.id]);
    await travel(page, 'home');
  }
  await page.reload();
  for (const language of LANGUAGES) {
    await page.getByLabel('Learning language').selectOption(language.id);
    const save = await readSave(page, language.id);
    expect(save.quests).toEqual(completed[language.id].quests);
    expect(save.learned).toEqual(completed[language.id].learned);
    await expect(page.locator('#world')).toHaveAttribute('data-map-id', 'home');
    await travel(page, quest.id);
    await expect(page.locator('#mission-challenge')).toHaveCount(0);
  }
});

test('legacy saves retain earned quests while an unearned wordbook cannot bypass world objectives', async ({ page }) => {
  const quest = QUESTS[0];
  let earned = quest.wordIds.reduce((save, id) => learnWord(save, id), createProgress('de'));
  earned = { ...earned, quests: [quest.id], xp: earned.xp + quest.reward.xp, coins: earned.coins + quest.reward.coins };
  // Version one saves predate mission state and persistent map destinations.
  delete earned.missions;
  delete earned.mapId;
  const discovered = quest.wordIds.reduce((save, id) => learnWord(save, id), createProgress('ja'));
  await page.goto('/');
  await page.evaluate(({ key, earned, discovered }) => {
    localStorage.setItem(key, JSON.stringify({ de: earned, ja: discovered }));
    localStorage.setItem('thing-ling.language', 'de');
  }, { key: STORAGE, earned, discovered });
  await page.reload();
  expect((await readSave(page, 'de')).quests).toEqual([quest.id]);
  await travel(page, QUESTS[1].id);
  await page.getByLabel('Learning language').selectOption('ja');
  await travel(page, quest.id);
  await expect(page.locator('#mission-challenge')).toHaveCount(0);
  expect((await readSave(page)).quests).toEqual([]);
  await page.locator('.sidebar').getByRole('button', { name: 'Wordbook', exact: true }).click();
  await page.locator(`#word-grid [data-word="${quest.wordIds[0]}"]`).click();
  await expect(page.locator('#mission-word-action')).toHaveCount(0);
  await closeDialog(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Explore', exact: true }).click();
  await performMissionActions(page, quest, 'ja');
  await expect(page.locator('#mission-challenge')).toBeEnabled();
});

test('partial mission actions survive reload and a failed check cannot complete the mission', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByLabel('Learning language').selectOption('ja');
  const quest = QUESTS[0];
  await travel(page, quest.id);
  await performMissionActions(page, { ...quest, wordIds: quest.wordIds.slice(0, 1) }, 'ja');
  const partial = await readSave(page);
  expect(partial.missions[quest.id].collected).toEqual(quest.wordIds.slice(0, 1));
  await page.reload();
  await expect(page.locator('#world')).toHaveAttribute('data-map-id', quest.id);
  expect(await readSave(page)).toEqual(partial);
  await expect(page.locator('#mission-challenge')).toHaveCount(0);
  await performMissionActions(page, { ...quest, wordIds: quest.wordIds.slice(1) }, 'ja');
  await page.locator('#mission-challenge').click();
  const native = await page.locator('.quiz-word strong').innerText();
  const correct = WORDS.find(word => word.translations.ja.text === native);
  const wrong = page.locator(`[data-answer]:not([data-answer="${correct.id}"])`).first();
  await wrong.click();
  await expect(page.locator('#quiz-feedback')).toContainText('A little learning moment.');
  await page.locator('#next-question').click();
  for (let index = 1; index < quest.wordIds.length; index += 1) await answerQuestion(page, 'ja');
  expect((await readSave(page)).quests).toEqual([]);
  expect((await readSave(page)).missions[quest.id].assessmentPassed).toBe(false);
  await page.locator('#finish-practice').click();
  await expect(page.locator('#mission-return')).toHaveCount(0);
  await finishMission(page, quest, 'ja');
  expect((await readSave(page)).quests).toEqual([quest.id]);
});

test('atlas, object inventory, and scene controls fit a phone viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#open-atlas').click();
  await expect(page.getByRole('dialog').locator('[data-travel]')).toHaveCount(QUESTS.length + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-atlas.png') });
  await page.getByRole('dialog').locator(`[data-travel="${QUESTS[0].id}"]`).click();
  await page.locator('#open-map-objects').click();
  await expect(page.getByRole('dialog').locator('[data-map-word]')).not.toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-objects.png') });
  await closeDialog(page);
  await expect(page.locator('#mission-progress')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-mission.png') });
});

test('rendered geometry on every map stays inside its footprints without unintended overlaps', async ({ page }, testInfo) => {
  await page.goto('/');
  const diagnostics = await page.evaluate(async () => {
    const [{ createWorld }, { MAPS }] = await Promise.all([import('/src/world.js'), import('/src/maps.js')]);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:750px';
    document.body.append(host);
    const world = createWorld(host, { motion: false });
    try {
      return MAPS.map(map => {
        world.loadMap(map.id);
        const result = world.getDiagnostics();
        return { mapId: result.mapId, webgl: result.webgl, count: result.mapObjectCount, unlabelled: result.unlabelledMeshes, oversize: result.oversize, overlaps: result.overlaps };
      });
    } finally {
      world.dispose();
      host.remove();
    }
  });
  await testInfo.attach('map-geometry-audit', { body: JSON.stringify(diagnostics, null, 2), contentType: 'application/json' });
  expect(diagnostics).toHaveLength(QUESTS.length + 1);
  for (const map of diagnostics) {
    expect(map.webgl, `${map.mapId} uses the actual WebGL renderer`).toBe(true);
    expect(map.count, `${map.mapId} has a populated scene`).toBeGreaterThanOrEqual(20);
    expect(map.unlabelled, `${map.mapId} labels every rendered mesh`).toBe(0);
    expect(map.oversize, `${map.mapId} respects its authored bounds`).toEqual([]);
    expect(map.overlaps, `${map.mapId} has no unintended mesh intersections`).toEqual([]);
  }
});

test('importing a different current map refreshes physical task cards before they can be used', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-map-id', 'home');
  const quest = QUESTS[0];
  const imported = { ...createProgress('de'), mapId: quest.id };
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#import-file').setInputFiles({
    name: 'mission-backup.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'thing-ling', version: 1, saves: { de: imported } })),
  });
  await page.locator('#confirm-import').click();
  await expect(page.locator('#world')).toHaveAttribute('data-map-id', quest.id);
  const target = mapById.get(quest.id).objects.find(object => object.wordId === 'apple');
  const card = page.locator('#active-quest [data-map-word="apple"]');
  await expect(card).toHaveAttribute('data-instance', target.id);
  await card.click();
  await expect(page.locator('#mission-word-action')).toBeEnabled();
  await page.locator('#mission-word-action').click();
  expect((await readSave(page, 'de')).missions[quest.id].collected).toEqual(['apple']);
  await page.reload();
  await expect(page.locator('#world')).toHaveAttribute('data-map-id', quest.id);
  expect((await readSave(page, 'de')).missions[quest.id].collected).toEqual(['apple']);
});
