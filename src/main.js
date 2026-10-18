import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/fraunces/500.css';
import './style.css';
import { icon } from './icons.js';
import { WORDS, LANGUAGES, CATEGORIES } from './data.js';
import { createProgress, learnWord, gradeWord, getDueWords, getLevel, buildSession, checkAnswer, validateProgress } from './learning.js';
import { REGIONS, CHARACTERS, QUESTS, PHRASES, CONVERSATIONS, getQuestState, awardConversation } from './story.js';
import { createWorld } from './world.js';
import { MAPS, getMap } from './maps.js';
import { getMissionDefinition, getMissionSummary, startMission, goHome, collectMissionWord, markMissionAssessment, submitMission } from './missions.js';

const STORAGE = 'thing-ling.saves.v1';
const WORD_BY_ID = new Map(WORDS.map(word => [word.id, word]));
const root = document.querySelector('#app');
let saves = {};
let activeLanguage = 'de';
let storageAvailable = true;
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE) || '{}');
  for (const language of LANGUAGES) {
    const save = validateProgress(raw[language.id]);
    if (save) saves[language.id] = save;
  }
  activeLanguage = localStorage.getItem('thing-ling.language') || 'de';
} catch { storageAvailable = false; }
if (!LANGUAGES.some(language => language.id === activeLanguage)) activeLanguage = 'de';
let progress = saves[activeLanguage] || createProgress(activeLanguage);
let region = 'village';
let page = 'explore';
let journalFilter = 'all';
let journalQuery = '';
let modalClose = null;
let session = null;
let world;
let audioContext;
let labelsVisible = false;
try { labelsVisible = localStorage.getItem('thing-ling.labels') === 'true'; } catch { /* Optional preference. */ }
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const lang = () => LANGUAGES.find(language => language.id === activeLanguage);
const translation = word => word.translations[activeLanguage];
const learnedIds = () => Object.keys(progress.learned);
const restoredMilestones = () => QUESTS.filter(quest => quest.milestone && progress.quests.includes(quest.id)).map(quest=>quest.milestone);
const currentMap = () => getMap(progress.mapId || 'home') || getMap('home');
const currentMission = () => QUESTS.find(quest=>quest.id === progress.mapId);

function syncWorldProgress() {
  world?.setLearned(learnedIds());
  world?.setRestored(restoredMilestones());
  world?.setProjects?.(progress.projects);
  world?.setLanguage?.(activeLanguage);
  world?.setLabels?.(labelsVisible);
  const quest = currentMission();
  const summary = quest ? getMissionSummary(progress, quest.id) : null;
  world?.setMissionState?.(quest ? {questId:quest.id,completedWordIds:summary.doneWordIds,phase:summary.phase} : null);
}

function save() {
  saves[activeLanguage] = progress;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(saves));
    localStorage.setItem('thing-ling.language', activeLanguage);
    storageAvailable = true;
  } catch {
    if (storageAvailable) toast('Your browser could not save. Export a backup in Settings.', 'help');
    storageAvailable = false;
  }
  updateHUD();
  syncWorldProgress();
}

function sound(type = 'success') {
  if (!progress.settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const notes = type === 'success' ? [523.25, 659.25, 783.99] : type === 'learn' ? [440, 554.37] : [261.63];
    notes.forEach((note, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = note;
      oscillator.connect(gain); gain.connect(audioContext.destination);
      const start = audioContext.currentTime + index * 0.075;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      oscillator.start(start); oscillator.stop(start + 0.31);
    });
  } catch { /* Sound is an optional enhancement. */ }
}

function speak(text, { slow = false } = {}) {
  if (!('speechSynthesis' in window)) {
    toast('Speech playback is unavailable in this browser. The written reading is always available.', 'book');
    return false;
  }
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(voice => voice.lang.toLowerCase().startsWith(activeLanguage));
  if (!voice) {
    toast(`No ${lang().name} voice is installed. Readings are shown below; add a voice in your device settings.`, 'speaker');
    return false;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang().locale; utterance.voice = voice; utterance.rate = slow ? 0.6 : 0.85;
  utterance.onerror = event => {
    if (!['interrupted', 'canceled'].includes(event.error)) toast('Audio could not play. You can use the written reading.', 'book');
  };
  speechSynthesis.speak(utterance);
  return true;
}

function toast(message, symbol = 'check') {
  const tray = document.querySelector('.toast-container');
  if (!tray) return;
  const item = document.createElement('div');
  item.className = 'toast'; item.setAttribute('role', 'status');
  item.innerHTML = `${icon(symbol, 18)}<span>${esc(message)}</span>`;
  tray.append(item); setTimeout(() => item.remove(), 5200);
}

function renderShell() {
  root.innerHTML = `<div class="app-shell">
    <aside class="sidebar" aria-label="Main navigation">
      <a class="brand-mark" href="#explore" aria-label="Thing Ling home">${icon('leaf', 27)}</a>
      <div class="nav-group">
        ${[['explore','compass','Explore'],['wordbook','book','Wordbook'],['practice','sparkles','Practice'],['quests','flag','Quests'],['phrases','chat','Phrasebook']].map(([id,symbol,label]) => `<button class="nav-item ${id === page ? 'active' : ''}" data-page="${id}" aria-label="${label}" ${id === page ? 'aria-current="page"' : ''}>${icon(symbol,22)}<span>${label}</span></button>`).join('')}
      </div>
      <div class="sidebar-bottom"><button class="nav-item" data-action="help" aria-label="How to play">${icon('help',22)}<span>How to play</span></button><button class="nav-item" data-action="settings" aria-label="Settings">${icon('settings',22)}<span>Settings</span></button><span class="version">v1.1 · made for you</span></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><a class="wordmark" href="#explore">thing<span>ling</span><i class="wordmark-dot"></i></a><span class="breadcrumb">A little world of words</span>
        <div class="topbar-actions"><label class="language-picker">${icon('globe',17)}<select class="language-select" id="language-select" aria-label="Learning language">${LANGUAGES.map(language => `<option value="${language.id}" ${language.id === activeLanguage ? 'selected' : ''}>${language.native} · ${language.name}</option>`).join('')}</select>${icon('down',13)}</label><span class="streak-pill" id="streak">${icon('flame',18)}<strong>${progress.streak}</strong> <span>day streak</span></span><button class="profile-avatar" data-action="settings" aria-label="Your profile">Y<span></span></button></div>
      </header>
      <main class="game-layout" id="main-content">
        <div id="world" class="world-container" aria-label="Interactive 3D island. Drag to orbit, scroll to zoom, and click objects to discover words."></div>
        <div class="explore-ui">
          <div class="explore-top"><div class="eyebrow"><span class="live-dot"></span> YOUR ISLAND, YOUR PACE</div><h1>A little world.<br>A lot to discover<span>.</span></h1><p class="world-subtitle">Make yourself at home in a new language.</p></div>
          <div class="region-switch" role="group" aria-label="Explore a neighborhood">${[['village','home','The Village'],['garden','flower','The Garden'],['harbor','anchor','The Harbor']].map(([id,symbol,title])=>`<button class="region-tab ${id===region?'active':''}" data-region="${id}">${icon(symbol,16)}<span>${title}</span></button>`).join('')}</div>
          <div class="map-tools"><button class="button secondary" id="open-atlas" data-action="atlas">${icon('compass',17)} Island atlas</button><button class="button secondary" id="open-map-objects" data-action="objects">${icon('search',17)} Objects here</button><button class="button secondary icon-button" id="toggle-labels" data-action="labels" aria-label="Show all object labels" aria-pressed="false" title="Show all object labels">${icon('book',17)}</button></div>
          <aside class="right-rail"><div class="daily-card" id="daily-card"></div><div class="quest-card" id="active-quest"></div><div class="tip-card">${icon('leaf',20)}<p>No rush. No wrong turns.<br><strong>Every little word is progress.</strong></p></div></aside>
          <div class="onboarding-banner" id="welcome-banner"><button class="banner-close" data-action="dismiss-welcome" aria-label="Dismiss welcome">${icon('close',16)}</button><div class="eyebrow">A NEW ADVENTURE</div><h3>Oh, hello there. ${icon('leaf',20)}</h3><p>This island has a story to tell. Click something that catches your eye, or say hello to Theo.</p><button class="button primary" data-character="theo">Meet your first neighbor ${icon('arrow',16)}</button></div>
          <div class="world-hud"><div class="location-card"><span class="location-icon">${icon('pin',20)}</span><div><strong id="location-name">The Village</strong><span id="location-subtitle">The beginning of something good</span></div><span class="location-weather">${icon('sun',20)} 24°</span></div><div class="world-controls"><button data-action="sound" title="Toggle game sounds" aria-label="Toggle game sounds">${icon(progress.settings.sound?'speaker':'mute',18)}</button><button data-action="reset-camera" title="Reset camera" aria-label="Reset camera">${icon('reset',18)}</button><button data-action="help" title="Controls" aria-label="Show controls">${icon('help',18)}</button></div></div>
          <div class="map-caption">${icon('compass',13)} Drag to look around · Scroll to get closer · Click to discover</div>
        </div>
        <section class="section-page" id="section-page" hidden></section>
      </main>
      <footer class="bottom-bar"><div class="level-block"><span class="level-icon">${icon('leaf',21)}</span><div><strong id="level-label">Level 1 <span>Curious newcomer</span></strong><div class="xp-track"><div class="xp-fill" id="xp-fill"></div></div></div><span id="xp-label" class="muted">0 / 100 XP</span></div><div class="stat-divider"></div><div class="bottom-stat">${icon('book',19)}<strong id="words-count">0</strong><span>words discovered</span></div><div class="bottom-stat coins-stat">${icon('coin',20)}<strong id="coin-count">0</strong><span>island coins</span></div><div class="weather">${icon('sun',17)} A good day to learn</div><button class="journal-button" data-page="wordbook">Open wordbook ${icon('arrow',16)}</button></footer>
    </div><div class="toast-container" aria-live="polite"></div><div id="modal-root"></div>
  </div>`;
  document.querySelector('#language-select').addEventListener('change', event => changeLanguage(event.target.value));
  root.addEventListener('click', onRootClick);
  updateHUD();
  try {
    if (localStorage.getItem('thing-ling.welcomed')) document.querySelector('#welcome-banner').hidden = true;
  } catch { /* A browser with blocked storage remains playable. */ }
}

function onRootClick(event) {
  const button = event.target.closest('button,a[data-page]');
  if (!button || button.disabled) return;
  if (button.dataset.page) return navigate(button.dataset.page);
  if (button.dataset.region) return setRegion(button.dataset.region);
  if (button.dataset.travel) return travelTo(button.dataset.travel);
  if (button.dataset.mapWord) return openWord(button.dataset.mapWord,{fromMap:true,instanceId:button.dataset.instance});
  if (button.dataset.word) return openWord(button.dataset.word);
  if (button.dataset.character) return openCharacter(button.dataset.character);
  if (button.dataset.quest) return openQuest(button.dataset.quest);
  if (button.dataset.action === 'settings') return openSettings();
  if (button.dataset.action === 'help') return openHelp();
  if (button.dataset.action === 'dismiss-welcome') return dismissWelcome();
  if (button.dataset.action === 'atlas') return openAtlas();
  if (button.dataset.action === 'objects') return openMapObjects();
  if (button.dataset.action === 'labels') {
    labelsVisible = !labelsVisible;
    world?.setLabels?.(labelsVisible);
    button.setAttribute('aria-pressed',String(labelsVisible));
    button.setAttribute('aria-label',labelsVisible?'Hide all object labels':'Show all object labels');
    try { localStorage.setItem('thing-ling.labels',String(labelsVisible)); } catch { /* Optional preference. */ }
    return;
  }
  if (button.dataset.action === 'mission-challenge') return startMissionChallenge();
  if (button.dataset.action === 'mission-return') return openCharacter(currentMission()?.characterId);
  if (button.dataset.action === 'reset-camera') { if(currentMission())world?.loadMap?.(progress.mapId);else world?.setRegion(region);syncWorldProgress();toast('Back to your favorite view.', 'compass'); }
  if (button.dataset.action === 'sound') { progress.settings.sound = !progress.settings.sound; save(); button.innerHTML = icon(progress.settings.sound?'speaker':'mute',18); }
}

function dismissWelcome() {
  document.querySelector('#welcome-banner').hidden = true;
  try { localStorage.setItem('thing-ling.welcomed', '1'); } catch { /* optional */ }
}

function updateHUD() {
  if (!document.querySelector('#daily-card')) return;
  const count = learnedIds().length;
  const due = getDueWords(progress).length;
  const level = getLevel(progress.xp);
  document.querySelector('#streak').innerHTML = `${icon('flame',18)}<strong>${progress.streak}</strong><span>day streak</span>`;
  document.querySelector('#level-label').innerHTML = `Level ${level.level} <span>${level.level < 3 ? 'Curious newcomer' : level.level < 6 ? 'Island explorer' : 'Word wanderer'}</span>`;
  document.querySelector('#xp-label').textContent = `${level.xpInLevel} / ${level.xpForNext} XP`;
  document.querySelector('#xp-fill').style.width = `${level.progress * 100}%`;
  document.querySelector('#words-count').textContent = count;
  document.querySelector('#coin-count').textContent = progress.coins;
  const today = new Date().toISOString().slice(0,10);
  const todayLearned = Object.values(progress.learned).filter(entry => new Date(entry.discoveredAt).toISOString().slice(0,10) === today).length;
  const goal = Math.min(todayLearned,5);
  document.querySelector('#daily-card').innerHTML = `<div class="card-eyebrow">A LITTLE EVERY DAY ${icon('sun',16)}</div><div class="daily-heading"><div><h2>${goal >= 5 ? 'Look at you grow.' : 'Five words. Fresh possibilities.'}</h2><p class="muted">${goal >=5 ? 'Your daily discovery goal is complete.' : 'Your small step for today.'}</p></div><div class="progress-ring" style="--progress:${goal*20}%"><span>${goal}<small>/5</small></span></div></div><div class="progress-line"><span style="width:${goal*20}%"></span></div><button class="daily-review" data-page="practice">${icon('clock',14)} ${due ? `${due} ${due===1?'word is':'words are'} ready to revisit` : 'A little practice makes it stick'} ${icon('chevron',14)}</button>`;
  updateMapChrome();
  if(currentMission()){ renderMissionCard(); return; }
  const current = QUESTS.find(quest => ['available','ready'].includes(getQuestState(quest, progress)) && quest.region === region) || QUESTS.find(quest => ['available','ready'].includes(getQuestState(quest, progress)));
  const card = document.querySelector('#active-quest');
  if (!current) {
    card.innerHTML = `<div class="card-eyebrow">YOUR NEXT CHAPTER ${icon('flag',16)}</div><h3>The island feels like home.</h3><p class="quest-description">You helped every neighbor. Keep your words growing with a little daily practice.</p><button class="button primary" data-page="practice">Keep growing ${icon('arrow',16)}</button>`;
    return;
  }
  const character = CHARACTERS.find(character => character.id === current.characterId);
  const known = current.wordIds.filter(id => progress.learned[id]).length;
  card.innerHTML = `<div class="card-eyebrow">YOUR NEXT CHAPTER <span>${String(Math.min(progress.quests.length+1,QUESTS.length)).padStart(2,'0')}</span></div><div class="quest-person"><span class="tiny-avatar" style="--avatar-color:${character?.color||'#e8d8b6'}">${character?.emoji||'🌿'}</span><span>${esc(character?.name||'Mika')} has a little favor</span></div><h3 class="quest-title">${esc(current.title)}</h3><p class="quest-description">${esc(current.description)}</p><div class="quest-checklist">${current.wordIds.slice(0,3).map(id=>`<div class="quest-step ${progress.learned[id]?'done':''}"><span>${progress.learned[id]?icon('check',10):''}</span>${esc(WORD_BY_ID.get(id)?.english||id)}</div>`).join('')}${current.wordIds.length>3?`<small>+ ${current.wordIds.length-3} more discoveries</small>`:''}</div><div class="quest-meta"><span>${icon('book',14)} ${known}/${current.wordIds.length} discovered</span><span>${icon('coin',14)} ${current.reward.coins}</span></div><button class="button primary quest-action" data-quest="${current.id}">Visit ${esc(getMap(current.id).name)} ${icon('arrow',16)}</button>`;
}

function setRegion(id) {
  if (!REGIONS.some(item=>item.id===id)) return;
  if(currentMission()) travelTo('home');
  region = id;
  navigate('explore');
  const info = REGIONS.find(item=>item.id===id);
  document.querySelectorAll('.region-tab').forEach(button=>button.classList.toggle('active',button.dataset.region===id));
  document.querySelector('#location-name').textContent = info.name;
  document.querySelector('#location-subtitle').textContent = info.subtitle;
  world?.setRegion(id); updateHUD();
}

function navigate(id) {
  if (!['explore','wordbook','practice','quests','phrases'].includes(id)) return;
  page = id;
  world?.setActive?.(id === 'explore' && !modalClose);
  document.querySelectorAll('.nav-item[data-page]').forEach(button => {
    button.classList.toggle('active',button.dataset.page===id);
    if (button.dataset.page===id) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  const section = document.querySelector('#section-page');
  section.hidden = id === 'explore';
  document.querySelector('#world').inert = id !== 'explore';
  document.querySelector('.explore-ui').hidden = id !== 'explore';
  if (id === 'wordbook') renderWordbook();
  if (id === 'practice') renderPractice();
  if (id === 'quests') renderQuests();
  if (id === 'phrases') renderPhrases();
  if (id === 'explore') requestAnimationFrame(()=>world?.resize());
}

function changeLanguage(id) {
  saves[activeLanguage] = progress;
  activeLanguage = id;
  progress = saves[id] || createProgress(id);
  world?.loadMap?.(progress.mapId || 'home');
  save(); closeModal();
  world?.setMotion(progress.settings.motion && !prefersReducedMotion);
  navigate(page);
  toast(`A fresh perspective. You’re learning ${lang().name}.`, 'globe');
}

function openModal(contents, className = '', onClose) {
  closeModal();
  world?.setActive?.(false);
  const focusedBefore = document.activeElement;
  const mount = document.querySelector('#modal-root');
  mount.innerHTML = `<div class="modal-backdrop"><section class="modal ${className}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><button class="close-button" aria-label="Close dialog">${icon('close',20)}</button>${contents}</section></div>`;
  const panel = mount.querySelector('.modal');
  const dismiss = () => {
    mount.innerHTML = ''; onClose?.(); session = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    document.removeEventListener('keydown', trap);
    focusedBefore?.isConnected && focusedBefore.focus();
    modalClose = null;
    world?.setActive?.(page === 'explore');
  };
  const trap = event => {
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
    if (event.key === 'Tab') {
      const items = [...panel.querySelectorAll('button:not(:disabled),input,select,a[href],[tabindex="0"]')].filter(item=>!item.hidden);
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement===items[0]||document.activeElement===panel)) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement===items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
  };
  mount.querySelector('.close-button').onclick = dismiss;
  mount.querySelector('.modal-backdrop').onclick = event => { if (event.target.classList.contains('modal-backdrop')) dismiss(); };
  document.addEventListener('keydown',trap); modalClose = dismiss;
  panel.focus();
  return panel;
}

function closeModal() { modalClose?.(); }

function updateMapChrome() {
  const map=currentMap();
  if(!map)return;
  const quest=currentMission();
  const hero=document.querySelector('.explore-top');
  hero.classList.toggle('mission-hero',Boolean(quest));
  hero.querySelector('.eyebrow').textContent=quest?`CHAPTER ${String(QUESTS.indexOf(quest)+1).padStart(2,'0')} · ${REGIONS.find(item=>item.id===quest.region).name.toUpperCase()}`:'YOUR ISLAND, YOUR PACE';
  hero.querySelector('h1').innerHTML=quest?esc(map.name):'A little world.<br>A lot to discover<span>.</span>';
  hero.querySelector('.world-subtitle').textContent=quest?map.subtitle:'Make yourself at home in a new language.';
  document.querySelector('.region-switch').hidden=Boolean(quest);
  const location=quest?map:REGIONS.find(item=>item.id===region);
  document.querySelector('#location-name').textContent=location.name;
  document.querySelector('#location-subtitle').textContent=quest?`${map.objects.length} things to discover · ${map.subtitle}`:location.subtitle;
  const toggle=document.querySelector('#toggle-labels');
  toggle.setAttribute('aria-pressed',String(labelsVisible));
  toggle.setAttribute('aria-label',labelsVisible?'Hide all object labels':'Show all object labels');
  if(quest)document.querySelector('#welcome-banner').hidden=true;
}

function mapWordObjects() {
  const rendered=world?.getObjects?.()||[];
  const objects=rendered.length?rendered:currentMap().objects.map(object=>({...object,instanceId:object.id,name:WORD_BY_ID.get(object.wordId)?.english}));
  return objects.filter(object=>WORD_BY_ID.has(object.wordId));
}

function renderMissionCard() {
  const quest=currentMission();
  if(!quest)return;
  const summary=getMissionSummary(progress,quest.id);
  const definition=summary.definition||getMissionDefinition(quest.id);
  const person=CHARACTERS.find(character=>character.id===quest.characterId);
  const phaseLabel={locked:'A little later',discover:'Explore & help',challenge:'Word check',return:'Bring it back',complete:'Chapter complete'}[summary.phase];
  const stage=summary.phase==='discover'?0:summary.phase==='challenge'?1:2;
  const objects=mapWordObjects();
  document.querySelector('#active-quest').innerHTML=`<div class="mission-card"><div class="card-eyebrow">YOUR LITTLE MISSION <span class="mission-stage-pill">${phaseLabel}</span></div><h3 class="quest-title">${esc(quest.title)}</h3><p class="mission-context">${esc(definition.instruction)}</p><div class="mission-path">${['Explore','Remember','Return'].map((label,index)=>`<span class="${index<stage||summary.phase==='complete'?'done':index===stage?'active':''}"><i>${index<stage||summary.phase==='complete'?icon('check',11):index+1}</i>${label}</span>`).join('')}</div><p id="mission-progress" class="mission-progress">${summary.completed} / ${summary.total} ${summary.phase==='complete'?'little tasks complete':'little tasks helped with'}</p><div class="mission-progress-track"><span style="width:${summary.completed/summary.total*100}%"></span></div><div class="mission-objectives">${definition.steps.map(step=>{
    const word=WORD_BY_ID.get(step.wordId);const done=summary.doneWordIds.includes(step.wordId);const object=objects.find(object=>object.wordId===step.wordId);
    return `<button class="mission-objective ${done?'checked':'active'}" data-map-word="${step.wordId}" data-instance="${esc(object?.instanceId||'')}"><span>${done?icon('check',16):word.emoji}</span><div><strong>${esc(word.english)}</strong><small class="mission-item-instruction">${esc(done?step.completionText:step.actionLabel)}</small></div></button>`;
  }).join('')}</div><div class="mission-actions">${summary.phase==='challenge'?`<button class="button primary" id="mission-challenge" data-action="mission-challenge">Check my new words ${icon('sparkles',16)}</button><p class="muted">Your tasks are done. Remember the words before visiting ${person.name}.</p>`:summary.phase==='return'?`<button class="button primary" id="mission-return" data-action="mission-return">Bring it back to ${person.name} ${icon('arrow',16)}</button><p class="muted">${esc(definition.turnInText)}</p>`:summary.phase==='complete'?`<p class="learned-badge">${icon('check',17)} A favor finished. A place renewed.</p><button class="button secondary" data-action="atlas">Choose another chapter ${icon('compass',16)}</button>`:`<p class="muted">Click the real objects, or use a task card to find them. Each has its own little action.</p>`}<button class="text-button" data-travel="home">${icon('arrowleft',14)} Back to Lantern Village</button></div></div>`;
}

function travelTo(id) {
  const map=getMap(id);
  if(!map){toast('That little place is not on the atlas.','compass');return;}
  const previous=progress;
  const next=id==='home'?goHome(progress):startMission(progress,id);
  if(id!=='home'&&next.mapId!==id){toast('Finish the earlier favor before visiting this chapter.','lock');return;}
  closeModal();
  progress=next;
  if(id!=='home')region=map.region;
  world?.loadMap?.(id);
  navigate('explore');
  save();
  if(previous.mapId!==id)sound('learn');
}

function openAtlas() {
  const symbols={home:'🏡','little-hello':'📖','kettle-on':'🫖','breakfast-club':'🥐','lantern-cafe':'🏮','first-seedlings':'🌱','orchard-colors':'🍊','small-neighbors':'🐑','garden-in-bloom':'🌦️','water-edge':'🐚','lost-and-found':'📦','homecoming-parcel':'🛋️','harbor-lanterns':'🗼'};
  openModal(`<div class="modal-header atlas-intro"><div class="modal-eyebrow">A LITTLE WORLD, TWELVE NEW CHAPTERS</div><h2 id="modal-title">Where shall we wander?</h2><p class="modal-subtitle">Every favor has a place of its own. Explore, help with the real objects, remember their words, and bring your work back to your neighbor.</p></div><div class="modal-body"><div class="atlas-grid">${MAPS.map(map=>{
    const quest=QUESTS.find(quest=>quest.id===map.id);const summary=quest?getMissionSummary(progress,quest.id):null;
    const locked=summary?.phase==='locked';const complete=summary?.phase==='complete';const current=map.id===(progress.mapId||'home');
    return `<button class="atlas-card ${locked?'locked':''} ${complete?'completed':''} ${current?'current':''}" data-travel="${map.id}" ${locked?'disabled':''}><div class="atlas-art" style="--map-color:${map.groundColor||'#b8c99b'}"><span>${symbols[map.id]||'🌿'}</span><i>${locked?icon('lock',18):complete?icon('check',18):icon('compass',18)}</i></div><span class="atlas-card-region">${map.id==='home'?'YOUR HOME':REGIONS.find(item=>item.id===map.region)?.name||'Island chapter'}</span><h3 class="atlas-card-title">${esc(map.name)}</h3><p class="atlas-card-description">${esc(map.description)}</p><div class="atlas-card-stats"><span>${icon('book',13)} ${map.objects.length} objects</span>${summary?`<span>${summary.completed}/${summary.total} tasks</span>`:''}</div><span class="atlas-card-status">${current?'You are here':locked?'Complete the earlier favors':complete?'Revisit this chapter':'Let’s take a little trip'} ${icon(locked?'lock':'arrow',14)}</span></button>`;
  }).join('')}</div></div>`,'atlas-modal');
}

function openMapObjects() {
  const map=currentMap();
  const objects=mapWordObjects();
  const quest=currentMission();
  const targets=new Set(quest?.wordIds||[]);
  const panel=openModal(`<div class="modal-header"><div class="modal-eyebrow">LOOK A LITTLE CLOSER · ${esc(map.name)}</div><h2 id="modal-title">Every little thing has a word.</h2><p class="modal-subtitle map-object-summary">${objects.length} labelled objects here. Choose one to find it, hear its name, and help with a task.</p></div><div class="modal-body"><div class="object-list-toolbar"><label class="search-box">${icon('search',18)}<input id="map-object-search" class="search-input" type="search" placeholder="Find something here…" aria-label="Search map objects"></label></div><div class="object-list-grid" id="map-object-grid"></div></div>`,'map-objects-modal');
  const sorted=[...objects].sort((a,b)=>Number(targets.has(b.wordId))-Number(targets.has(a.wordId))||WORD_BY_ID.get(a.wordId).english.localeCompare(WORD_BY_ID.get(b.wordId).english));
  const render=query=>{
    const needle=query.trim().toLocaleLowerCase();
    const visible=sorted.filter(object=>{const word=WORD_BY_ID.get(object.wordId);const text=translation(word);return `${word.english} ${text.text} ${text.reading}`.toLocaleLowerCase().includes(needle);});
    panel.querySelector('#map-object-grid').innerHTML=visible.length?visible.map(object=>{
      const word=WORD_BY_ID.get(object.wordId);const text=translation(word);
      return `<button class="map-object-row" data-map-word="${word.id}" data-instance="${esc(object.instanceId)}"><span>${word.emoji}</span><div><strong>${esc(word.english)}</strong><small lang="${activeLanguage}">${esc(text.text)}</small></div>${targets.has(word.id)?'<i class="target-badge">Task</i>':icon(progress.learned[word.id]?'check':'plus',13)}</button>`;
    }).join(''):'<p class="muted">Try another little word.</p>';
  };
  panel.querySelector('#map-object-search').oninput=event=>render(event.target.value);
  render('');
}

function startMissionChallenge() {
  const quest=currentMission();
  if(!quest||getMissionSummary(progress,quest.id).phase!=='challenge')return;
  startSession('mixed',{wordIds:quest.wordIds,questId:quest.id,title:quest.title,length:quest.wordIds.length});
}

function turnInMission() {
  const quest=currentMission();
  if(!quest)return;
  const next=submitMission(progress,quest.id);
  if(next===progress){toast('Finish the little tasks and word check first.','flag');return;}
  progress=next;save();sound();
  const person=CHARACTERS.find(item=>item.id===quest.characterId);
  const nextQuest=QUESTS.find(item=>getMissionSummary(progress,item.id).phase==='discover'&&item.region===quest.region)||QUESTS.find(item=>getMissionSummary(progress,item.id).phase==='discover');
  const panel=openModal(`<div class="modal-header session-result mission-completion-modal"><div class="result-icon">${icon(quest.milestone?'flower':'trophy',50)}</div><div class="modal-eyebrow">${esc(person.name)}’S LITTLE FAVOR · COMPLETE</div><h2 id="modal-title">A favor finished. A place renewed.</h2><p class="modal-subtitle">“${esc(quest.completionLine)}”</p><div class="result-stats"><div><strong>+${quest.reward.xp}</strong><span>XP earned</span></div><div><strong>+${quest.reward.coins}</strong><span>island coins</span></div><div><strong>${progress.quests.length}/${QUESTS.length}</strong><span>chapters complete</span></div></div>${quest.milestone?'<p class="learned-badge">'+icon('sparkles',18)+' Your work has brought this place back to life.</p>':''}</div><div class="modal-footer result-actions"><button class="button primary" id="mission-complete-done">Stay a little longer ${icon('check',16)}</button>${nextQuest?`<button class="button secondary" data-travel="${nextQuest.id}">Next chapter ${icon('arrow',16)}</button>`:'<button class="button secondary" data-travel="home">Home to the village</button>'}</div>`);
  panel.querySelector('#mission-complete-done').onclick=closeModal;
}

function openWord(id, context = {}) {
  const word = WORD_BY_ID.get(id);
  if (!word) return;
  if(context.fromMap)world?.focusObject?.(context.instanceId||id);
  dismissWelcome();
  const text = translation(word);
  const entry = progress.learned[id];
  const panel = openModal(`<div class="modal-header"><div class="modal-eyebrow">${entry?'A FAMILIAR LITTLE WORD':'LOOK WHAT YOU FOUND'}</div><h2 id="modal-title" class="sr-only">${esc(word.english)} in ${lang().name}</h2></div><div class="modal-body word-content"><div class="word-art" data-category="${word.category}"><span>${word.emoji}</span><i>${icon('sparkles',22)}</i></div><div class="word-tags"><span class="chip">${esc(CATEGORIES.find(category=>category.id===word.category)?.name||'Discovery')}</span><span class="chip">${esc(lang().native)}</span></div><h2 class="word-native" lang="${activeLanguage}">${esc(text.text)}</h2>${text.reading!==text.text?`<p class="word-reading">${esc(text.reading)}</p>`:''}<p class="word-english">${esc(word.english)}</p><div class="word-audio"><button class="speech-button" id="listen-word" aria-label="Listen to pronunciation">${icon('speaker',22)}</button><button class="text-button" id="listen-slow">Listen slowly</button></div>${entry?`<div class="mastery-row"><span>Getting familiar</span><div class="mastery-dots">${Array.from({length:5},(_,index)=>`<i class="${index<entry.level?'filled':''}"></i>`).join('')}</div><small>${entry.correct} successful ${entry.correct===1?'review':'reviews'}</small></div>`:'<p class="word-note">A new word is a little door to a bigger world.</p>'}</div><div class="modal-footer word-actions"><button class="button primary" id="learn-word">${icon(entry?'check':'plus',18)} ${entry?'Practice this word':'Add to my wordbook'} <span>${entry?'':' +10 XP'}</span></button>${entry?'<button class="button secondary" id="back-island">Keep exploring</button>':''}</div>`, 'word-modal');
  panel.querySelector('#listen-word').onclick = () => speak(text.text);
  panel.querySelector('#listen-slow').onclick = () => speak(text.text,{slow:true});
  panel.querySelector('#back-island')?.addEventListener('click',closeModal);
  panel.querySelector('#learn-word').onclick = () => {
    if (entry) { startSession('mixed',{wordIds:[id],title:'One little word',length:3}); return; }
    progress = learnWord(progress,id); save(); sound('learn');
    toast(`${text.text} — a little word, a lovely start. +10 XP`, 'book');
    openWord(id,context);
    if(page==='wordbook') renderWordbook();
  };
  const quest=currentMission();
  const summary=quest?getMissionSummary(progress,quest.id):null;
  const step=quest?getMissionDefinition(quest.id)?.steps.find(step=>step.wordId===id):null;
  const physicallyHere=context.fromMap&&mapWordObjects().some(object=>object.wordId===id&&(!context.instanceId||object.instanceId===context.instanceId));
  if(physicallyHere&&step&&summary.phase!=='locked'&&summary.phase!=='complete'){
    const done=summary.doneWordIds.includes(id);
    const action=document.createElement('div');
    action.className='mission-action-box';
    action.innerHTML=`<div class="eyebrow">A LITTLE HELP · ${esc(quest.title)}</div><p>${esc(done?step.completionText:step.instruction)}</p><button class="button primary" id="mission-word-action" ${done?'disabled':''}>${icon(done?'check':'leaf',17)} ${esc(done?'Little task complete':step.actionLabel)}</button>`;
    panel.querySelector('.modal-body').append(action);
    action.querySelector('#mission-word-action').onclick=()=>{
      const next=collectMissionWord(progress,quest.id,id);
      if(next===progress)return;
      progress=next;save();sound('learn');closeModal();
      toast(step.completionText,'check');
    };
  }
}

function openCharacter(id) {
  const character = CHARACTERS.find(item=>item.id===id);
  if (!character) return;
  dismissWelcome();
  const quests = QUESTS.filter(quest=>quest.characterId===id && getQuestState(quest,progress)!=='locked');
  const current = quests.find(quest=>getQuestState(quest,progress)!=='completed');
  const panel = openModal(`<div class="modal-header character-header"><span class="character-avatar" style="background:${character.color}">${character.emoji}</span><div class="modal-eyebrow">${esc(character.role)} · ${esc(REGIONS.find(r=>r.id===character.region).name)}</div><h2 id="modal-title">${esc(character.name)}</h2></div><div class="modal-body"><p class="dialogue-text">“${esc(character.greeting)}”</p><p class="muted">${esc(character.dialogue[progress.quests.length % character.dialogue.length])}</p>${current?`<div class="character-quest"><span class="eyebrow">A LITTLE FAVOR</span><h3>${esc(current.title)}</h3><p>${esc(current.description)}</p><div class="quest-objectives">${current.wordIds.map(id=>`<button class="chip ${progress.learned[id]?'discovered':''}" data-word="${id}">${WORD_BY_ID.get(id).emoji} ${esc(WORD_BY_ID.get(id).english)} ${progress.learned[id]?icon('check',12):icon('plus',12)}</button>`).join('')}</div></div>`:'<p class="learned-badge">'+icon('heart',18)+' You’ve helped with every little favor here.</p>'}</div><div class="modal-footer">${current?`<button class="button primary" id="character-quest">${getQuestState(current,progress)==='ready'?'Take the challenge':'See the favor'} ${icon('arrow',16)}</button>`:''}<button class="button secondary" id="character-close">Back to the island</button></div>`, 'character-modal');
  panel.querySelector('#character-close').onclick=closeModal;
  const activeQuest=currentMission();
  if(activeQuest?.characterId===id&&getMissionSummary(progress,activeQuest.id).phase==='return'){
    const handover=document.createElement('button');
    handover.className='button primary';handover.id='mission-turn-in';
    handover.innerHTML=`${icon('flag',17)} Finish the little favor`;
    handover.onclick=turnInMission;
    panel.querySelector('.modal-footer').prepend(handover);
  }
  if(!current && QUESTS.some(quest=>quest.characterId===id && getQuestState(quest,progress)!=='completed')){
    const badge=panel.querySelector('.learned-badge');
    if(badge) badge.innerHTML=`${icon('book',18)} Say hello to Theo and open the Almanac’s first page. There will be more little favors soon.`;
  }
  panel.querySelector('#character-quest')?.addEventListener('click',()=>openQuest(current.id));
  const conversation=CONVERSATIONS.find(item=>item.characterId===id);
  if(conversation){
    const chatButton=document.createElement('button');
    chatButton.className='button secondary';
    chatButton.innerHTML=`${icon('chat',17)} Have a little chat`;
    chatButton.onclick=()=>startConversation(conversation.id);
    panel.querySelector('.modal-footer').prepend(chatButton);
  }
}

function openQuest(id) {
  const quest=QUESTS.find(item=>item.id===id);
  if(!quest)return;
  const summary=getMissionSummary(progress,id);
  const definition=getMissionDefinition(id);
  const map=getMap(id);
  const character=CHARACTERS.find(item=>item.id===quest.characterId);
  const here=progress.mapId===id;
  const ready=here&&summary.phase==='challenge';
  const panel=openModal(`<div class="modal-header"><span class="character-avatar" style="background:${character.color}">${character.emoji}</span><div class="modal-eyebrow">${esc(character.name)}’S LITTLE FAVOR · ${esc(map.name)}</div><h2 id="modal-title">${esc(quest.title)}</h2><p class="modal-subtitle">${esc(definition.instruction)}</p></div><div class="modal-body"><p class="map-object-summary">${icon('compass',17)} A place of its own: <strong>${esc(map.name)}</strong> · ${map.objects.length} objects to discover</p><div class="quest-objectives">${quest.wordIds.map(wordId=>{
    const word=WORD_BY_ID.get(wordId);const done=summary.doneWordIds.includes(wordId);
    const object=here?mapWordObjects().find(object=>object.wordId===wordId):null;
    return `<button class="objective-word ${done?'discovered':''}" ${here?`data-map-word="${wordId}" data-instance="${esc(object?.instanceId||'')}"`:`data-word="${wordId}"`}><span>${word.emoji}</span><div><strong>${esc(word.english)}</strong><small>${done?'Little task complete':progress.learned[wordId]?'Word learned · task still to do':'Waiting to be discovered'}</small></div>${icon(done?'check':'compass',17)}</button>`;
  }).join('')}</div><div class="quest-reward">${icon('sparkles',18)} A little thank-you <strong>+${quest.reward.xp} XP</strong><span>${icon('coin',16)} ${quest.reward.coins}</span></div>${summary.phase==='locked'?'<p class="muted">Finish the earlier favors to visit this chapter.</p>':summary.phase==='complete'?`<p class="dialogue-text">“${esc(quest.completionLine)}”</p>`:summary.phase==='return'?`<p class="muted">${esc(definition.turnInText)}</p>`:'<p class="muted">Travel to the mission, help with its real objects, then check the words and return to your neighbor. Learning a word in the wordbook gives you a head start; the hands-on tasks happen in the map.</p>'}</div><div class="modal-footer"><button class="button primary" id="quest-travel" data-travel="${id}" ${summary.phase==='locked'?'disabled':''}>${icon('compass',17)} ${here?'Back to':summary.phase==='complete'?'Revisit':'Travel to'} ${esc(map.name)}</button><button class="button secondary" id="quest-start" ${ready?'':'disabled'}>${summary.phase==='complete'?'Favor complete':ready?'Check my new words':'Help with the map tasks first'} ${icon(summary.phase==='complete'?'check':'sparkles',17)}</button></div>`,'quest-modal');
  panel.querySelector('#quest-start').onclick=startMissionChallenge;
}

function pageHeader(eyebrow,title,subtitle,extra='') {
  return `<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div>${extra}</div>`;
}

function renderWordbook() {
  const section = document.querySelector('#section-page');
  section.innerHTML = `${pageHeader('LITTLE WORDS, BIG POSSIBILITIES','Your wordbook<span>.</span>',`${learnedIds().length} of ${WORDS.length} words discovered in ${lang().name}. Every one is a little piece of your world.`,`<button class="button primary" id="wordbook-review">${icon('sparkles',17)} Revisit my words</button>`)}<div class="toolbar"><label class="search-box">${icon('search',19)}<input class="search-input" id="word-search" type="search" placeholder="Find a little word…" value="${esc(journalQuery)}" aria-label="Search words"></label><div class="filter-tabs">${[['all','All words'],['discovered','Discovered'],['due','Ready to review']].map(([id,title])=>`<button class="filter-tab ${journalFilter===id?'active':''}" data-filter="${id}">${title}${id==='due'?` <span>${getDueWords(progress).length}</span>`:''}</button>`).join('')}</div></div><div class="category-filters">${CATEGORIES.map(category=>`<button class="chip ${journalFilter===category.id?'active':''}" data-filter="${category.id}">${category.emoji} ${category.name}</button>`).join('')}</div><div class="word-grid" id="word-grid"></div><p class="journal-footnote">${icon('leaf',15)} Click any word to discover it. Explore the island to see it in the world.</p>`;
  section.querySelector('#wordbook-review').onclick=()=>startSession('mixed');
  section.querySelector('#word-search').oninput=event=>{journalQuery=event.target.value;renderWordGrid();};
  section.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{journalFilter=button.dataset.filter;renderWordbook();});
  renderWordGrid();
}

function renderWordGrid() {
  const dueSet = new Set(getDueWords(progress).map(word=>word.id));
  const words = WORDS.filter(word=>{
    const text = translation(word);
    const search = `${word.english} ${text.text} ${text.reading}`.toLocaleLowerCase().includes(journalQuery.toLocaleLowerCase());
    const matches = journalFilter==='all'||journalFilter==='discovered'&&progress.learned[word.id]||journalFilter==='due'&&dueSet.has(word.id)||word.category===journalFilter;
    return search&&matches;
  });
  document.querySelector('#word-grid').innerHTML=words.length?words.map(word=>{
    const entry=progress.learned[word.id]; const text=translation(word);
    return `<button class="word-tile ${entry?'is-discovered':''}" data-word="${word.id}"><div class="word-tile-art" data-category="${word.category}">${word.emoji}<span class="word-tile-status">${icon(entry?'check':'plus',14)}</span></div><div class="word-tile-info"><strong class="word-tile-native" lang="${activeLanguage}">${entry?esc(text.text):esc(word.english)}</strong><span class="word-tile-english">${entry?esc(word.english):'Waiting to be discovered'}</span>${entry?`<div class="mastery-dots">${Array.from({length:5},(_,i)=>`<i class="${i<entry.level?'filled':''}"></i>`).join('')}</div>`:''}</div></button>`;
  }).join(''):`<div class="empty-state">${icon('leaf',40)}<h3>${journalFilter==='due'?'All caught up. Take a little wander.':'No little words here yet.'}</h3><p>${journalFilter==='due'?'Your next review will appear when it’s time. You can still practice whenever you like.':'Try another search or discover something on the island.'}</p><button class="button secondary" data-page="explore">Back to the island</button></div>`;
}

function renderPractice() {
  const due=getDueWords(progress).length;
  const mastered=Object.values(progress.learned).filter(entry=>entry.level>=3).length;
  const correct=Object.values(progress.learned).reduce((total,entry)=>total+entry.correct,0);
  const wrong=Object.values(progress.learned).reduce((total,entry)=>total+entry.wrong,0);
  document.querySelector('#section-page').innerHTML = `${pageHeader('A LITTLE PRACTICE, A LOT OF GROWTH','Make it second nature<span>.</span>','A few gentle challenges to help your new words feel like old friends.')}<div class="practice-hero"><div class="practice-hero-art">${icon('leaf',64)}<i>✦</i><i>✧</i></div><div><div class="eyebrow">RIGHT ON TIME</div><h2>${due?`${due} familiar ${due===1?'face':'faces'} to say hello to.`:'Your next small step starts here.'}</h2><p>${due?'Your spaced reviews bring words back just before they fade.':'Learn at your own pace. A five-question mix is a lovely place to begin.'}</p><button class="button primary" id="start-daily">Start a little practice ${icon('arrow',17)}</button></div><span class="practice-hero-badge">5 questions<br><strong>~ 2 minutes</strong></span></div><div class="stats-grid">${[[learnedIds().length,'Words discovered','book'],[due,'Ready to revisit','clock'],[mastered,'Taking root','leaf'],[correct+wrong?`${Math.round(correct/(correct+wrong)*100)}%`:'—','Review accuracy','trophy']].map(([value,label,symbol])=>`<div class="stat-card">${icon(symbol,21)}<strong>${value}</strong><span>${label}</span></div>`).join('')}</div><h2 class="section-heading">Find your rhythm</h2><div class="practice-options">${[['mixed','sparkles','A little of everything','Match, listen, and recall. A balanced way to help words stick.','Mix it up'],['listen','headphones','An ear for the language','Listen closely, then find the meaning. Written readings stay available.','Let’s listen'],['type','keyboard','At your fingertips','Remember the word and type it out. Romanized Japanese and Chinese work too.','Try recalling']].map(([mode,symbol,title,description,label])=>`<article class="practice-option"><span class="practice-option-icon">${icon(symbol,27)}</span><h3>${title}</h3><p>${description}</p><button class="button secondary" data-practice="${mode}">${label} ${icon('arrow',16)}</button></article>`).join('')}</div><p class="journal-footnote">${icon('heart',16)} Mistakes just tell us what to revisit. Your streak never depends on getting everything right.</p>`;
  document.querySelector('#start-daily').onclick=()=>startSession('mixed');
  document.querySelectorAll('[data-practice]').forEach(button=>button.onclick=()=>startSession(button.dataset.practice));
}

function renderQuests() {
  document.querySelector('#section-page').innerHTML = `${pageHeader('GOOD WORDS BRING US TOGETHER','A few little favors<span>.</span>',`Help your neighbors bring the island’s Community Almanac back to life. ${progress.quests.length} of ${QUESTS.length} chapters complete.`)}<div class="quest-list">${QUESTS.map((quest,index)=>{
    const mission=getMissionSummary(progress,quest.id);const state=mission.phase==='complete'?'completed':mission.phase==='locked'?'locked':mission.phase==='challenge'||mission.phase==='return'?'ready':'available';const character=CHARACTERS.find(person=>person.id===quest.characterId);
    return `<article class="quest-tile ${state}"><div class="quest-tile-top"><span class="tiny-avatar" style="--avatar-color:${character.color}">${character.emoji}</span><span>${esc(character.name)} · ${esc(REGIONS.find(item=>item.id===quest.region).name)}</span><span>${state==='completed'?icon('check',17):state==='locked'?icon('lock',16):String(index+1).padStart(2,'0')}</span></div><h3>${esc(quest.title)}</h3><p class="quest-map-name">${icon('compass',14)} ${esc(getMap(quest.id).name)} · ${getMap(quest.id).objects.length} objects</p><p>${esc(quest.description)}</p><div class="quest-tile-bottom"><span>${icon('sparkles',14)} ${quest.reward.xp} XP ${quest.milestone?' · Island restoration':''}</span><button class="button ${state==='ready'?'primary':'secondary'}" data-quest="${quest.id}" ${state==='locked'?'disabled':''}>${state==='completed'?'Complete':state==='locked'?'Locked':state==='ready'?'Take the challenge':'Take a look'} ${icon(state==='completed'?'check':'arrow',15)}</button></div></article>`;
  }).join('')}</div><h2 class="section-heading">Make the island a little lovelier</h2><p class="page-subtitle">A good home grows with you. Spend the coins you earn on little island projects.</p><div class="project-grid">${[['lanterns','🏮','Evening lanterns','A little glow for your favorite paths.',25],['picnic','🧺','A place to gather','Set out a cozy spot for your neighbors.',40],['wildflowers','🌼','Wildflower wishes','A few more reasons to stop and smile.',60]].map(([id,emoji,title,description,cost])=>`<article class="project-card"><span>${emoji}</span><div><h3>${title}</h3><p>${description}</p></div><button class="button ${progress.projects.includes(id)?'secondary':'primary'}" data-project="${id}" data-cost="${cost}" ${progress.projects.includes(id)||progress.coins<cost?'disabled':''}>${progress.projects.includes(id)?icon('check',16)+' All planted':icon('coin',16)+' '+cost+' coins'}</button></article>`).join('')}</div>`;
  document.querySelectorAll('[data-project]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.project;const cost=Number(button.dataset.cost);
    if(progress.projects.includes(id)||progress.coins<cost)return;
    progress={...progress,coins:progress.coins-cost,projects:[...progress.projects,id]}; save();sound();renderQuests();toast('A little kindness makes the island bloom.', 'flower');
  });
}

function renderPhrases() {
  document.querySelector('#section-page').innerHTML = `${pageHeader('WORDS ARE JUST THE BEGINNING','Something worth saying<span>.</span>','A pocketful of useful phrases for the places life takes you.')}<div class="conversation-grid">${CONVERSATIONS.map(conversation=>{
    const person=CHARACTERS.find(character=>character.id===conversation.characterId);
    return `<button class="conversation-card" data-conversation="${conversation.id}"><span class="character-avatar" style="background:${person.color}">${person.emoji}</span><div><span class="eyebrow">A LITTLE CONVERSATION</span><h3>${esc(conversation.title)}</h3><p>${esc(conversation.description)}</p><span class="conversation-label">${progress.conversations?.includes(conversation.id)?'Have another little chat':'3 moments · +25 XP'} ${icon('arrow',14)}</span></div></button>`;
  }).join('')}</div><h2 class="section-heading">A pocketful of phrases</h2><div class="phrase-list">${PHRASES.map(phrase=>{
    const text=phrase.translations[activeLanguage];
    return `<article class="phrase-card"><div class="phrase-scene">${icon(phrase.scene==='cafe'?'home':phrase.scene==='garden'?'flower':phrase.scene==='harbor'?'anchor':'chat',16)} ${esc(phrase.scene)}</div><h3 lang="${activeLanguage}">${esc(text.text)}</h3>${text.reading!==text.text?`<p class="phrase-reading">${esc(text.reading)}</p>`:''}<p>${esc(phrase.english)}</p><button class="speech-button" data-speak-phrase="${phrase.id}" aria-label="Listen: ${esc(phrase.english)}">${icon('speaker',18)}</button></article>`;
  }).join('')}</div><p class="journal-footnote">${icon('speaker',16)} Pronunciation uses your device’s installed voices. Written readings work without audio.</p>`;
  document.querySelectorAll('[data-speak-phrase]').forEach(button=>button.onclick=()=>speak(PHRASES.find(phrase=>phrase.id===button.dataset.speakPhrase).translations[activeLanguage].text));
  document.querySelectorAll('[data-conversation]').forEach(button=>button.onclick=()=>startConversation(button.dataset.conversation));
}

function startConversation(id) {
  const conversation=CONVERSATIONS.find(item=>item.id===id);
  if(!conversation)return;
  const person=CHARACTERS.find(character=>character.id===conversation.characterId);
  const panel=openModal('<div id="conversation-content"></div>','conversation-modal',()=>{if(page==='phrases')renderPhrases();});
  let index=0;
  const content=panel.querySelector('#conversation-content');
  const render=()=>{
    const step=conversation.steps[index];
    const phrases=shuffle([step.phraseId,...step.distractorIds]).map(id=>PHRASES.find(phrase=>phrase.id===id));
    let answered=false;
    content.innerHTML=`<div class="modal-header"><div class="modal-eyebrow">${esc(conversation.title)} <span>${index+1} / ${conversation.steps.length}</span></div><div class="quiz-progress">${conversation.steps.map((_,i)=>`<span class="quiz-dot ${i<index?'done':i===index?'current':''}"></span>`).join('')}</div><div class="conversation-speaker"><span class="character-avatar" style="background:${person.color}">${person.emoji}</span><div><h2 id="modal-title">A little chat with ${esc(person.name)}.</h2><span>${esc(person.role)}</span></div></div></div><div class="modal-body"><p class="conversation-prompt">${esc(step.prompt)}</p><div class="conversation-choices">${phrases.map(phrase=>{
      const text=phrase.translations[activeLanguage];
      return `<button class="conversation-choice" data-phrase-answer="${phrase.id}"><strong lang="${activeLanguage}">${esc(text.text)}</strong>${text.reading?`<span>${esc(text.reading)}</span>`:''}<small class="conversation-english" hidden>${esc(phrase.english)}</small></button>`;
    }).join('')}</div><button class="text-button" id="conversation-hint">A little help? Show English meanings</button><div id="conversation-feedback" aria-live="polite"></div></div><div class="modal-footer"><span class="muted">Real words. Real little moments.</span><button class="button primary" id="conversation-next" hidden>${index===conversation.steps.length-1?'See how it went':'Keep chatting'} ${icon('arrow',16)}</button></div>`;
    panel.querySelector('#conversation-hint').onclick=()=>{
      panel.querySelectorAll('.conversation-english').forEach(item=>item.hidden=false);
      panel.querySelector('#conversation-hint').hidden=true;
    };
    panel.querySelectorAll('[data-phrase-answer]').forEach(button=>button.onclick=()=>{
      if(answered)return;
      const phrase=PHRASES.find(phrase=>phrase.id===button.dataset.phraseAnswer);
      if(phrase.id!==step.phraseId){
        button.classList.add('incorrect');button.disabled=true;sound('wrong');
        panel.querySelector('#conversation-feedback').innerHTML=`<p class="conversation-feedback">${icon('leaf',18)} That means “${esc(phrase.english)}” Try another little phrase.</p>`;
        return;
      }
      answered=true;button.classList.add('correct');sound('success');
      panel.querySelectorAll('[data-phrase-answer]').forEach(item=>item.disabled=true);
      panel.querySelector('#conversation-feedback').innerHTML=`<div class="conversation-reply"><span>${esc(person.name)}</span><p>“${esc(step.reply)}”</p><button class="text-button" id="conversation-listen">${icon('speaker',17)} Hear your phrase again</button></div>`;
      panel.querySelector('#conversation-listen').onclick=()=>speak(phrase.translations[activeLanguage].text);
      const next=panel.querySelector('#conversation-next');next.hidden=false;next.focus();
    });
    panel.querySelector('#conversation-next').onclick=()=>{
      if(!answered)return;
      index++;
      if(index<conversation.steps.length){render();return;}
      const wasComplete=progress.conversations?.includes(id);
      progress=awardConversation(progress,id);save();sound();
      content.innerHTML=`<div class="modal-header session-result"><div class="result-icon">${icon('chat',50)}</div><div class="modal-eyebrow">A LITTLE CONNECTION</div><h2 id="modal-title">That felt like a conversation.</h2><p class="modal-subtitle">${esc(person.name)} is happy you stopped by. A few simple phrases can open a whole new world.</p><div class="result-stats"><div><strong>${conversation.steps.length}</strong><span>real-life moments</span></div><div><strong>${wasComplete?'A little':'+'+conversation.reward.xp}</strong><span>${wasComplete?'extra practice':'XP earned'}</span></div><div><strong>${wasComplete?'♡':'+'+conversation.reward.coins}</strong><span>${wasComplete?'a connection made':'island coins'}</span></div></div></div><div class="modal-footer"><button class="button primary" id="conversation-done">A lovely little chat ${icon('check',17)}</button><button class="button secondary" id="conversation-again">Try it again</button></div>`;
      panel.querySelector('#conversation-done').onclick=closeModal;
      panel.querySelector('#conversation-again').onclick=()=>startConversation(id);
    };
  };
  render();
}

function startSession(mode='mixed',options={}) {
  if(options.questId&&getMissionSummary(progress,options.questId).phase!=='challenge'){toast('Help with the little map tasks before checking the words.','flag');return;}
  const length=options.length||5;
  let questions;
  if(options.wordIds?.length){
    const ids=options.wordIds.filter(id=>WORD_BY_ID.has(id));
    questions=Array.from({length},(_,index)=>{
      const id=ids[index%ids.length];
      const alternatives=shuffle(WORDS.filter(word=>word.id!==id)).slice(0,3).map(word=>word.id);
      return {wordId:id,type:mode==='type'?'type':mode==='listen'?'listen':index%3===2?'type':'choice',options:shuffle([id,...alternatives])};
    });
  } else questions=buildSession(progress,{mode,length});
  if(!questions.length){toast('Discover a little word first, then try again.','book');return;}
  const initialXP=progress.xp;
  const panel=openModal('<div id="quiz-content"></div>','quiz-modal',()=>{if(page!=='explore')navigate(page);});
  session={questions,index:0,correct:0,answered:false,initialXP,questId:options.questId,title:options.title||'A little practice',answers:[],missed:[]};
  renderQuestion(panel);
}

function shuffle(values) {
  const result=[...values];for(let index=result.length-1;index>0;index--){const j=Math.floor(Math.random()*(index+1));[result[index],result[j]]=[result[j],result[index]];}return result;
}

function renderQuestion(panel) {
  if(!session)return;
  const current=session.questions[session.index];
  const word=WORD_BY_ID.get(current.wordId);const text=translation(word);
  const content=panel.querySelector('#quiz-content');
  const isListen=current.type==='listen';const isType=current.type==='type';
  content.innerHTML=`<div class="modal-header"><div class="modal-eyebrow">${esc(session.title)} <span>${session.index+1} / ${session.questions.length}</span></div><div class="quiz-progress">${session.questions.map((_,index)=>`<span class="quiz-dot ${index<session.index?'done':index===session.index?'current':''}"></span>`).join('')}</div><h2 id="modal-title" class="quiz-prompt">${isType?`How do you say “${esc(word.english)}”?`:isListen?'Listen. What do you hear?':'What’s this little word?'}</h2><p class="modal-subtitle">${isType?`Type in ${lang().name}${['ja','zh'].includes(activeLanguage)?' or use the romanized reading':''}.`:'Choose the meaning that feels right.'}</p></div><div class="modal-body"><div class="quiz-word">${isType?`<span class="quiz-emoji">${word.emoji}</span>`:isListen?`<button class="large-speech-button" id="quiz-listen" aria-label="Play word">${icon('speaker',34)}</button><button class="text-button" id="reveal-reading">Show written word</button><div class="listening-reading" id="listening-reading" hidden><strong lang="${activeLanguage}">${esc(text.text)}</strong><span>${esc(text.reading)}</span></div>`:`<strong lang="${activeLanguage}">${esc(text.text)}</strong>${text.reading!==text.text?`<span>${esc(text.reading)}</span>`:''}`}</div>${isType?`<form id="answer-form"><input class="answer-input" id="typed-answer" placeholder="Your little answer…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer" required/><div class="type-actions"><button class="text-button" type="button" id="give-hint">A little hint?</button>${('SpeechRecognition' in window||'webkitSpeechRecognition' in window)?`<button class="text-button" type="button" id="speak-answer">${icon('mic',16)} Say it instead</button>`:''}</div><p class="answer-hint" id="answer-hint" hidden></p><button class="button primary" type="submit" id="check-answer">Check my answer ${icon('arrow',16)}</button></form>`:`<div class="answer-options">${current.options.map((id,index)=>`<button class="answer-option" data-answer="${id}"><span class="answer-number">${index+1}</span>${esc(WORD_BY_ID.get(id).english)}</button>`).join('')}</div>`}<div id="quiz-feedback" aria-live="polite"></div></div><div class="modal-footer quiz-footer"><span>${icon('heart',15)} There’s room to get it wrong.</span><button class="button primary" id="next-question" hidden>Keep going ${icon('arrow',16)}</button></div>`;
  session.answered=false;
  panel.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>submitAnswer(button.dataset.answer===word.id,button.dataset.answer,panel));
  if(isType){
    const input=panel.querySelector('#typed-answer');
    panel.querySelector('#answer-form').onsubmit=event=>{event.preventDefault();if(!input.value.trim())return;submitAnswer(checkAnswer(word,input.value,activeLanguage),input.value,panel);};
    panel.querySelector('#give-hint').onclick=()=>{const hint=panel.querySelector('#answer-hint');hint.hidden=false;hint.textContent=`Starts with “${(['ja','zh'].includes(activeLanguage)?text.reading:text.text).slice(0,2)}…”`;};
    panel.querySelector('#speak-answer')?.addEventListener('click',()=>recognizeAnswer(input));
    setTimeout(()=>input.focus(),80);
  }
  if(isListen){
    panel.querySelector('#quiz-listen').onclick=()=>speak(text.text);
    panel.querySelector('#reveal-reading').onclick=()=>{panel.querySelector('#listening-reading').hidden=false;};
    const voices='speechSynthesis' in window?speechSynthesis.getVoices():[];
    if(!voices.some(voice=>voice.lang.toLowerCase().startsWith(activeLanguage))) {
      panel.querySelector('#listening-reading').hidden=false;
      panel.querySelector('#reveal-reading').textContent='Reading shown — no matching voice installed';
    } else speak(text.text);
  }
  panel.querySelector('#next-question').onclick=()=>{
    if(!session?.answered)return;
    session.index++;
    if(session.index>=session.questions.length)showSessionResult(panel);else renderQuestion(panel);
  };
}

function submitAnswer(correct,answer,panel) {
  if(!session||session.answered)return;
  session.answered=true;
  const current=session.questions[session.index];const word=WORD_BY_ID.get(current.wordId);const text=translation(word);
  session.correct+=correct?1:0;session.answers.push({id:word.id,correct});
  if(!correct&&!session.missed.includes(word.id))session.missed.push(word.id);
  progress=gradeWord(progress,word.id,correct);save();sound(correct?'success':'wrong');
  panel.querySelectorAll('[data-answer]').forEach(button=>{
    button.disabled=true;
    if(button.dataset.answer===word.id)button.classList.add('correct');
    else if(button.dataset.answer===answer)button.classList.add('incorrect');
  });
  const input=panel.querySelector('#typed-answer');
  if(input){input.disabled=true;input.classList.add(correct?'correct':'incorrect');panel.querySelector('#check-answer').hidden=true;panel.querySelectorAll('.type-actions button').forEach(button=>button.disabled=true);}
  panel.querySelector('#quiz-feedback').innerHTML=`<div class="quiz-feedback ${correct?'correct':'incorrect'}">${icon(correct?'check':'leaf',21)}<div><strong>${correct?'That’s the one. Nicely done!':'A little learning moment.'}</strong><span>${esc(text.text)}${text.reading!==text.text?' · '+esc(text.reading):''} — ${esc(word.english)}${correct?'':' · We’ll revisit this soon.'}</span></div><button class="speech-button" id="feedback-listen" aria-label="Listen to correct word">${icon('speaker',17)}</button></div>`;
  panel.querySelector('#feedback-listen').onclick=()=>speak(text.text);
  const next=panel.querySelector('#next-question');next.hidden=false;next.innerHTML=`${session.index===session.questions.length-1?'See how you grew':'Keep going'} ${icon('arrow',16)}`;next.focus();
}

function recognizeAnswer(input) {
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition)return;
  const recognition=new Recognition();recognition.lang=lang().locale;recognition.continuous=false;recognition.interimResults=false;
  toast('Listening for your word…','mic');
  recognition.onresult=event=>{input.value=event.results[0][0].transcript;input.focus();toast('Check your answer when you’re ready.','mic');};
  recognition.onerror=()=>toast('Microphone input wasn’t available. You can always type instead.','keyboard');
  try{recognition.start();}catch{toast('Try typing this one.','keyboard');}
}

function showSessionResult(panel) {
  const result=session;
  const perfect=result.correct===result.questions.length;
  const quest=result.questId?QUESTS.find(item=>item.id===result.questId):null;
  let readyToReturn=false;
  if(quest&&perfect){
    progress=markMissionAssessment(progress,quest.id,result.correct,result.questions.length);
    readyToReturn=getMissionSummary(progress,quest.id).phase==='return';
    save();
  }
  const earned=progress.xp-result.initialXP;
  const person=quest?CHARACTERS.find(item=>item.id===quest.characterId):null;
  panel.querySelector('#quiz-content').innerHTML=`<div class="modal-header session-result"><div class="result-icon">${icon(perfect?'trophy':'leaf',52)}</div><div class="modal-eyebrow">${readyToReturn?'ONE LAST LITTLE VISIT':'LOOK AT YOU GROW'}</div><h2 id="modal-title">${readyToReturn?`Ready for ${esc(person.name)}.`:perfect?'A lovely little success.':'A little better than before.'}</h2><p class="modal-subtitle">${readyToReturn?`You remembered every word. Bring your work back to ${esc(person.name)} in ${esc(currentMap().name)} to finish the favor and collect your thank-you.`:perfect?'Those words are starting to feel like home.':'Every try helps a word take root. Let’s give the tricky ones a little more love.'}</p><div class="result-stats"><div><strong>${result.correct}/${result.questions.length}</strong><span>words remembered</span></div><div><strong>+${earned}</strong><span>practice XP earned</span></div><div><strong>${progress.streak}</strong><span>day streak</span></div></div>${quest&&!perfect?'<p class="quest-retry-note">Your little tasks are saved. Remember every word in a fresh check before returning to your neighbor.</p>':''}${readyToReturn?'<p class="learned-badge">'+icon('flag',18)+' Your mission reward is waiting with your neighbor.</p>':''}</div><div class="modal-footer result-actions"><button class="button primary" id="finish-practice">Back to my little world ${icon('arrow',17)}</button>${!perfect?`<button class="button secondary" id="retry-session">${icon('reset',16)} ${quest?'Try the word check again':'Revisit the tricky words'}</button>`:!quest?'<button class="button secondary" id="another-session">A little more practice</button>':''}</div>`;
  panel.querySelector('#finish-practice').onclick=()=>{closeModal();navigate('explore');};
  panel.querySelector('#retry-session')?.addEventListener('click',()=>startSession('mixed',{wordIds:quest?quest.wordIds:result.missed,questId:quest?.id,title:quest?.title||'A little second chance',length:quest?quest.wordIds.length:Math.max(result.missed.length,1)}));
  panel.querySelector('#another-session')?.addEventListener('click',()=>startSession('mixed'));
  sound();
}

function openSettings() {
  const panel=openModal(`<div class="modal-header"><div class="modal-eyebrow">MAKE YOURSELF AT HOME</div><h2 id="modal-title">Your little preferences.</h2><p class="modal-subtitle">A comfortable place to learn, just the way you like it.</p></div><div class="modal-body"><div class="settings-list"><label class="setting-row"><div><strong>Little sounds</strong><span>Gentle chimes for your discoveries</span></div><input type="checkbox" class="switch" id="setting-sound" ${progress.settings.sound?'checked':''}></label><label class="setting-row"><div><strong>A living island</strong><span>Water, clouds, and a gentle breeze${prefersReducedMotion?' · Reduced motion is enabled on your device':''}</span></div><input type="checkbox" class="switch" id="setting-motion" ${progress.settings.motion?'checked':''}></label><div class="setting-row"><div><strong>Saved right here</strong><span>Your progress lives in this browser, separately for each language.</span></div>${icon(storageAvailable?'check':'help',20)}</div></div><h3>Keep a little backup</h3><p class="muted">Export all four language saves before clearing browser data or moving devices. Importing replaces only the languages included in the file.</p><div class="settings-actions"><button class="button secondary" id="export-save">${icon('download',17)} Export progress</button><button class="button secondary" id="import-save">${icon('upload',17)} Import a backup</button><input type="file" id="import-file" accept="application/json,.json" hidden></div><div class="settings-note">${icon('speaker',18)}<p>Audio uses installed device voices. Voice input, when supported, may use your browser’s speech service and requests microphone permission. Neither is required to play.</p></div><button class="text-button danger" id="reset-progress">Start ${lang().name} over</button></div><div class="modal-footer"><button class="button primary" id="settings-done">All comfy ${icon('check',17)}</button></div>`,'settings-modal');
  panel.querySelector('#setting-sound').onchange=event=>{progress.settings.sound=event.target.checked;save();};
  panel.querySelector('#setting-motion').onchange=event=>{progress.settings.motion=event.target.checked;world?.setMotion(progress.settings.motion&&!prefersReducedMotion);save();};
  panel.querySelector('#settings-done').onclick=closeModal;
  panel.querySelector('#export-save').onclick=()=>{
    saves[activeLanguage]=progress;
    const blob=new Blob([JSON.stringify({app:'thing-ling',version:1,saves},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='thing-ling-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('A little backup, safely tucked away.','download');
  };
  panel.querySelector('#import-save').onclick=()=>panel.querySelector('#import-file').click();
  panel.querySelector('#import-file').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    if(file.size>1_000_000){toast('That file is too large for a game save.','help');return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed.app!=='thing-ling'||parsed.version!==1||!parsed.saves||typeof parsed.saves!=='object')throw new Error();
      const imported={};
      for(const [id,value] of Object.entries(parsed.saves)){
        const valid=validateProgress(value);
        if(!valid||valid.language!==id)throw new Error();
        imported[id]=valid;
      }
      if(!Object.keys(imported).length)throw new Error();
      const backupSaves={...saves};
      const count=Object.keys(imported).length;
      const confirmPanel=openModal(`<div class="modal-header"><div class="modal-eyebrow">BRING YOUR WORDS HOME</div><h2 id="modal-title">Import this little backup?</h2><p class="modal-subtitle">This will replace ${count} language ${count===1?'save':'saves'} in this browser. Other languages will stay as they are.</p></div><div class="modal-footer"><button class="button primary" id="confirm-import">Import my progress</button><button class="button secondary" id="cancel-import">Keep my current progress</button></div>`);
      confirmPanel.querySelector('#cancel-import').onclick=()=>{saves=backupSaves;closeModal();};
      confirmPanel.querySelector('#confirm-import').onclick=()=>{saves={...saves,...imported};progress=saves[activeLanguage]||createProgress(activeLanguage);world?.loadMap?.(progress.mapId||'home');save();world?.setMotion(progress.settings.motion&&!prefersReducedMotion);syncWorldProgress();closeModal();navigate(page);toast('Welcome home. Your words came with you.','book');};
    }catch{toast('This doesn’t look like a valid Thing Ling backup. Your progress is safe.','help');}
  };
  panel.querySelector('#reset-progress').onclick=()=>{
    const confirmPanel=openModal(`<div class="modal-header"><div class="modal-eyebrow">A FRESH LITTLE START</div><h2 id="modal-title">Begin ${lang().name} again?</h2><p class="modal-subtitle">This clears your ${lang().name} wordbook, coins, and quests. Other languages stay as they are. Export a backup first if you want to keep this chapter.</p></div><div class="modal-footer"><button class="button secondary" id="cancel-reset">Keep my little world</button><button class="button danger-button" id="confirm-reset">Yes, start over</button></div>`);
    confirmPanel.querySelector('#cancel-reset').onclick=closeModal;
    confirmPanel.querySelector('#confirm-reset').onclick=()=>{progress=createProgress(activeLanguage);world?.loadMap?.('home');save();closeModal();navigate('explore');toast('A fresh page. The island is happy to see you.','leaf');};
  };
}

function openHelp() {
  const panel=openModal(`<div class="modal-header"><div class="modal-eyebrow">WELCOME TO THING LING</div><h2 id="modal-title">Good things start small.</h2><p class="modal-subtitle">Your little island is full of words waiting to become familiar.</p></div><div class="modal-body"><div class="help-grid">${[['compass','1. Take a little wander','Drag to look around and scroll to zoom. Open the atlas to visit the village and twelve mission maps. Click objects and neighbors, or use Objects here to find every little part.'],['book','2. Find your first words','Turn on Labels to see the words around you. Every object, including building parts and scenery, has a word card. Listen if a device voice is available, or use the written reading.'],['flag','3. Lend a helping hand','Travel to a favor’s own map. Help with each marked object, pass its word check, then return to Mika, Jun, Luna, or Theo to finish the favor and collect your reward.'],['leaf','4. Let your words take root','Revisit words with listening, matching, and typing. Reviews return after 10 minutes, 1 day, 3 days, 7 days, and 14 days.']].map(([symbol,title,body])=>`<div class="help-item"><span>${icon(symbol,23)}</span><div><h3>${title}</h3><p>${body}</p></div></div>`).join('')}</div><div class="settings-note">${icon('heart',19)}<p>No microphone, account, or subscription required. Progress saves automatically in this browser. You can export a backup in Settings.</p></div><p class="muted keyboard"><kbd>Esc</kbd> closes a dialog. <kbd>Tab</kbd> moves between controls. Every word is also available in the wordbook.</p></div><div class="modal-footer"><button class="button primary" id="help-close">Let’s make ourselves at home ${icon('arrow',17)}</button></div>`,'help-modal');
  panel.querySelector('#help-close').onclick=closeModal;
}

renderShell();
try {
  world=await createWorld(document.querySelector('#world'),{
    onSelect:object=>{
      if(object.kind==='npc')openCharacter(object.id);
      else openWord(object.id,{fromMap:true,instanceId:object.instanceId});
    },
    onRegionChange:id=>{region=id;updateHUD();},
    motion:progress.settings.motion&&!prefersReducedMotion,
  });
  world?.loadMap?.(progress.mapId||'home');
  syncWorldProgress();
  updateHUD();
}catch(error){
  console.error('The 3D island could not start:',error);
  document.querySelector('#world').innerHTML=`<div class="world-fallback"><span>🌴</span><h2>A little island, waiting for you.</h2><p>Your browser couldn’t start 3D graphics. You can still discover every word and complete every favor.</p><button class="button primary" data-page="wordbook">Open the wordbook ${icon('book',17)}</button></div>`;
  toast('The 3D view needs WebGL. The wordbook, practice, and quests are ready to play.','help');
}

document.querySelectorAll('.wordmark,.brand-mark').forEach(link=>link.onclick=event=>{event.preventDefault();navigate('explore');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&'speechSynthesis' in window)speechSynthesis.cancel();});
if(!storageAvailable)toast('Browser storage is unavailable. You can play and export a backup in Settings.','help');

// A timer keeps the review badge accurate when a word becomes due while playing.
setInterval(()=>{updateHUD();if(page==='practice')renderPractice();},60_000);
