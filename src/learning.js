import { LANGUAGES, WORDS } from './data.js';
import { QUESTS } from './story.js';

const WORD_BY_ID = new Map(WORDS.map((word) => [word.id, word]));
const LANGUAGE_IDS = new Set(LANGUAGES.map((language) => language.id));
const DAY = 86_400_000;
const INTERVALS = [600_000, DAY, 3 * DAY, 7 * DAY, 14 * DAY];
const PROJECT_IDS = new Set(['lanterns', 'picnic', 'wildflowers']);
const CONVERSATION_IDS = new Set(['cafe-conversation', 'garden-conversation', 'harbor-conversation', 'village-conversation']);
const QUEST_BY_ID = new Map(QUESTS.map((quest) => [quest.id, quest]));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** Create a save for one target language. Each language uses a separate save. */
export function createProgress(language = 'de') {
  return {
    version: 1,
    language: LANGUAGE_IDS.has(language) ? language : 'de',
    xp: 0,
    coins: 0,
    learned: {},
    quests: [],
    projects: [],
    conversations: [],
    mapId: 'home',
    missions: {},
    streak: 0,
    lastStudy: null,
    settings: { sound: true, motion: true },
  };
}

function studyDay(progress, now) {
  const today = new Date(now).toISOString().slice(0, 10);
  if (progress.lastStudy === today) return { streak: progress.streak, lastStudy: today };
  const yesterday = new Date(now - DAY).toISOString().slice(0, 10);
  return { streak: progress.lastStudy === yesterday ? progress.streak + 1 : 1, lastStudy: today };
}

/** Discovering an object awards once; opening it again is safe and free. */
export function learnWord(progress, id, now = Date.now()) {
  if (!WORD_BY_ID.has(id) || own(progress.learned, id)) return progress;
  return {
    ...progress,
    ...studyDay(progress, now),
    xp: progress.xp + 10,
    coins: progress.coins + 2,
    learned: {
      ...progress.learned,
      [id]: { level: 0, correct: 0, wrong: 0, dueAt: now, discoveredAt: now },
    },
  };
}

/**
 * Only a due retrieval advances mastery. Extra early practice earns review
 * rewards without lengthening the schedule. Failures always return soon.
 */
export function gradeWord(progress, id, correct, now = Date.now()) {
  if (!WORD_BY_ID.has(id)) return progress;
  const base = own(progress.learned, id) ? progress : learnWord(progress, id, now);
  const previous = base.learned[id];
  const success = correct === true;
  const advances = success && previous.dueAt <= now;
  const level = success ? (advances ? Math.min(5, previous.level + 1) : previous.level) : Math.max(0, previous.level - 1);
  return {
    ...base,
    ...studyDay(base, now),
    xp: base.xp + (success ? 8 : 0),
    coins: base.coins + (success ? 1 : 0),
    learned: {
      ...base.learned,
      [id]: {
        ...previous,
        level,
        correct: previous.correct + (success ? 1 : 0),
        wrong: previous.wrong + (success ? 0 : 1),
        dueAt: success ? (advances ? now + INTERVALS[level - 1] : previous.dueAt) : now + 60_000,
      },
    },
  };
}

/** Return vocabulary records in due-date order, suitable for journal/review UI. */
export function getDueWords(progress, now = Date.now()) {
  return Object.keys(progress.learned)
    .filter((id) => WORD_BY_ID.has(id) && progress.learned[id].dueAt <= now)
    .sort((a, b) => progress.learned[a].dueAt - progress.learned[b].dueAt)
    .map((id) => WORD_BY_ID.get(id));
}

export function getLevel(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  return { level: Math.floor(value / 100) + 1, xpInLevel: value % 100, xpForNext: 100, progress: (value % 100) / 100 };
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = Number(random());
    const slot = Math.floor(Math.min(0.999999999, Math.max(0, Number.isFinite(sample) ? sample : 0)) * (index + 1));
    [result[index], result[slot]] = [result[slot], result[index]];
  }
  return result;
}

/**
 * Prioritize due words, then the learner's other discoveries. An empty journal
 * gets village starters, so practice never opens onto an empty screen.
 */
export function buildSession(progress, { mode = 'mixed', length = 5, region, now = Date.now(), random = Math.random } = {}) {
  const matchesRegion = (word) => !region || word.region === region;
  const due = getDueWords(progress, now).filter(matchesRegion);
  const dueIds = new Set(due.map((word) => word.id));
  const known = WORDS.filter((word) => matchesRegion(word) && own(progress.learned, word.id) && !dueIds.has(word.id));
  let pool = [...due, ...shuffle(known, random)];
  if (pool.length === 0) pool = shuffle(WORDS.filter((word) => word.region === (region || 'village')), random);
  const count = Number.isFinite(length) ? Math.min(50, Math.max(1, Math.floor(length))) : 5;
  if (pool.length === 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const word = pool[index % pool.length];
    const alternatives = shuffle(WORDS.filter((candidate) => candidate.id !== word.id), random).slice(0, 3);
    const type = mode === 'listen' ? 'listen' : mode === 'type' ? 'type' : ['choice', 'listen', 'type'][index % 3];
    return { wordId: word.id, type, options: shuffle([word.id, ...alternatives.map((candidate) => candidate.id)], random) };
  });
}

/** Ignore Latin accents, spacing, and punctuation without removing Japanese dakuten. */
export function normalizeAnswer(answer) {
  if (typeof answer !== 'string') return '';
  return answer.normalize('NFKD').toLowerCase()
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .normalize('NFKC').replace(/[\p{P}\p{S}\s]+/gu, '');
}

export function checkAnswer(word, answer, language) {
  const translation = word?.translations?.[language];
  const normalized = normalizeAnswer(answer);
  if (!translation || !normalized) return false;
  return [translation.text, translation.reading].some((accepted) => normalizeAnswer(accepted) === normalized);
}

const plainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const nonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const validTime = (value) => Number.isFinite(value) && value >= 0 && value <= 8_640_000_000_000_000;
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

/** Validate an untrusted JSON save and copy only recognized fields. */
export function validateProgress(value) {
  try {
    // Conversations were added after the initial save format. Absence upgrades
    // cleanly; an explicitly supplied malformed field is still rejected.
    const conversations = plainObject(value) && own(value, 'conversations') ? value.conversations : [];
    const sourceMissions = plainObject(value) && own(value, 'missions') ? value.missions : {};
    const sourceMapId = plainObject(value) && own(value, 'mapId') ? value.mapId : 'home';
    if (!plainObject(value) || value.version !== 1 || !LANGUAGE_IDS.has(value.language)
      || !nonnegativeInteger(value.xp) || !nonnegativeInteger(value.coins)
      || !nonnegativeInteger(value.streak) || !(value.lastStudy === null || validDate(value.lastStudy))
      || !plainObject(value.learned) || Object.keys(value.learned).length > WORDS.length
      || !Array.isArray(value.quests) || value.quests.length > 100
      || ![...value.quests].every((quest) => typeof quest === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(quest))
      || !Array.isArray(value.projects) || value.projects.length > 3
      || ![...value.projects].every((project) => PROJECT_IDS.has(project))
      || !Array.isArray(conversations) || conversations.length > 4
      || ![...conversations].every((conversation) => CONVERSATION_IDS.has(conversation))
      || !plainObject(sourceMissions) || Object.keys(sourceMissions).length > QUESTS.length
      || !(sourceMapId === 'home' || QUEST_BY_ID.has(sourceMapId))
      || !plainObject(value.settings) || typeof value.settings.sound !== 'boolean' || typeof value.settings.motion !== 'boolean') return null;
    const learned = {};
    for (const [id, entry] of Object.entries(value.learned)) {
      if (!WORD_BY_ID.has(id) || !plainObject(entry) || !nonnegativeInteger(entry.level) || entry.level > 5
        || !nonnegativeInteger(entry.correct) || !nonnegativeInteger(entry.wrong)
        || !validTime(entry.dueAt) || !validTime(entry.discoveredAt)) return null;
      learned[id] = { level: entry.level, correct: entry.correct, wrong: entry.wrong, dueAt: entry.dueAt, discoveredAt: entry.discoveredAt };
    }
    const missions = {};
    for (const [id, entry] of Object.entries(sourceMissions)) {
      const quest = QUEST_BY_ID.get(id);
      if (!quest || !plainObject(entry) || !Array.isArray(entry.collected)
        || entry.collected.length > quest.wordIds.length
        || ![...entry.collected].every((wordId) => quest.wordIds.includes(wordId) && own(learned, wordId))
        || new Set(entry.collected).size !== entry.collected.length
        || typeof entry.assessmentPassed !== 'boolean'
        || (entry.assessmentPassed && entry.collected.length !== quest.wordIds.length)
        || (own(entry, 'submitted') && typeof entry.submitted !== 'boolean')
        || (entry.submitted === true && (!entry.assessmentPassed || !value.quests.includes(id)))) return null;
      missions[id] = { collected: [...entry.collected], assessmentPassed: entry.assessmentPassed };
      if (own(entry, 'submitted')) missions[id].submitted = entry.submitted;
    }
    // Existing version-one saves keep every completed quest and discovery.
    // A formerly visited map whose prerequisites are absent returns to the hub.
    const mapId = sourceMapId === 'home' || QUEST_BY_ID.get(sourceMapId).requires.every((id) => value.quests.includes(id))
      || value.quests.includes(sourceMapId) ? sourceMapId : 'home';
    return {
      version: 1, language: value.language, xp: value.xp, coins: value.coins, learned,
      quests: [...new Set(value.quests)], projects: [...new Set(value.projects)],
      conversations: [...new Set(conversations)], streak: value.streak, lastStudy: value.lastStudy,
      mapId, missions,
      settings: { sound: value.settings.sound, motion: value.settings.motion },
    };
  } catch {
    return null;
  }
}
