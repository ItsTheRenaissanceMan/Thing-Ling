import { learnWord } from './learning.js';
import { QUESTS, awardQuest, getQuestState } from './story.js';

/** Each chapter has its own place, purpose, and hands-on object interactions. */
export const MISSION_DEFINITIONS = [
  {
    questId: 'little-hello', mapId: 'little-hello', action: 'collect', actionLabel: 'Add to Almanac',
    objectiveTitle: 'Fill the first Almanac page',
    instruction: 'Explore Almanac Courtyard and collect a sample, a story, and a pressed flower for Theo.',
    steps: [
      { wordId: 'apple', instruction: 'Pick the courtyard apple for Theo’s first nature entry.', actionLabel: 'Pick the apple', completionText: 'A crisp apple is ready for the Almanac’s nature page.' },
      { wordId: 'book', instruction: 'Retrieve the blank Almanac from its reading stand.', actionLabel: 'Open the Almanac', completionText: 'The Almanac is open to its first empty page.' },
      { wordId: 'flower', instruction: 'Choose a flower to press between the first pages.', actionLabel: 'Press a flower', completionText: 'A bright flower marks the beginning of your island story.' },
    ],
    turnInText: 'Show Theo the apple, open Almanac, and pressed flower to finish the first page.',
  },
  {
    questId: 'kettle-on', mapId: 'kettle-on', action: 'serve', actionLabel: 'Prepare the drinks',
    objectiveTitle: 'Set up the Tea House welcome tray',
    instruction: 'Help Mika prepare four parts of the welcome drinks in the Tea House.',
    steps: [
      { wordId: 'coffee', instruction: 'Brew the coffee waiting at the coffee station.', actionLabel: 'Brew the coffee', completionText: 'Fresh coffee is ready for the welcome tray.' },
      { wordId: 'cup', instruction: 'Take a clean cup from the crockery shelf.', actionLabel: 'Set out a cup', completionText: 'A clean cup is set out for the next guest.' },
      { wordId: 'water', instruction: 'Fill the drinking-water pitcher at the water station.', actionLabel: 'Fill the pitcher', completionText: 'The pitcher is full of fresh drinking water.' },
      { wordId: 'tea', instruction: 'Steep the tea for Mika’s visitors.', actionLabel: 'Steep the tea', completionText: 'The tea is steeped and the welcome tray is complete.' },
    ],
    turnInText: 'Return to Mika and present the drinks tray after checking the four drink words.',
  },
  {
    questId: 'breakfast-club', mapId: 'breakfast-club', action: 'prepare', actionLabel: 'Prepare breakfast',
    objectiveTitle: 'Prepare the Sunrise Bakery breakfast',
    instruction: 'Visit the bakery’s ingredient stations and prepare breakfast before the neighbors arrive.',
    steps: [
      { wordId: 'bread', instruction: 'Slice the fresh loaf at the bread station.', actionLabel: 'Slice the bread', completionText: 'Warm bread is sliced for the breakfast basket.' },
      { wordId: 'egg', instruction: 'Collect a fresh egg from the ingredient display.', actionLabel: 'Prepare an egg', completionText: 'An egg is ready for the neighbors’ breakfast.' },
      { wordId: 'milk', instruction: 'Pour the breakfast milk from the chilled bottle.', actionLabel: 'Pour the milk', completionText: 'Breakfast milk is poured and ready.' },
      { wordId: 'cheese', instruction: 'Portion the cheese on the cheese board.', actionLabel: 'Portion the cheese', completionText: 'Cheese portions finish the morning basket.' },
    ],
    turnInText: 'Bring Mika the prepared breakfast and name its ingredients to open the bakery table.',
  },
  {
    questId: 'lantern-cafe', mapId: 'lantern-cafe', action: 'arrange', actionLabel: 'Arrange the café',
    objectiveTitle: 'Make the Lantern Café ready to reopen',
    instruction: 'Arrange the café furniture and restore its little comforts for opening day.',
    steps: [
      { wordId: 'table', instruction: 'Set the café table for the first guests.', actionLabel: 'Set the table', completionText: 'The table is ready for friends to gather.' },
      { wordId: 'chair', instruction: 'Place the chair at the window seat.', actionLabel: 'Arrange the chair', completionText: 'A welcoming window seat is ready.' },
      { wordId: 'lamp', instruction: 'Light the café lamp to welcome visitors.', actionLabel: 'Switch on the lamp', completionText: 'The café lamp casts its first warm glow.' },
      { wordId: 'clock', instruction: 'Set the opening-time clock.', actionLabel: 'Set the clock', completionText: 'The clock is set for the café’s reopening.' },
    ],
    turnInText: 'Tell Mika the café is ready. Your final word check and handover reopen the Lantern Café.',
  },
  {
    questId: 'first-seedlings', mapId: 'first-seedlings', action: 'plant', actionLabel: 'Tend the planting',
    objectiveTitle: 'Start the Seedling Terraces growing',
    instruction: 'Help Jun establish four growing stations on the Seedling Terraces.',
    steps: [
      { wordId: 'tree', instruction: 'Firm the soil around the young tree’s roots.', actionLabel: 'Tend the tree', completionText: 'The young tree is settled into its new home.' },
      { wordId: 'carrot', instruction: 'Sow the carrot row in the raised bed.', actionLabel: 'Sow the carrots', completionText: 'A neat carrot row is sown and labeled.' },
      { wordId: 'tomato', instruction: 'Plant and support the tomato seedling.', actionLabel: 'Plant the tomato', completionText: 'The tomato seedling stands safely beside its support.' },
      { wordId: 'strawberry', instruction: 'Set a strawberry plant into its sunny bed.', actionLabel: 'Plant the strawberry', completionText: 'The strawberry plant has a sunny place to grow.' },
    ],
    turnInText: 'Report the planted beds to Jun and name the new plants for the garden records.',
  },
  {
    questId: 'orchard-colors', mapId: 'orchard-colors', action: 'harvest', actionLabel: 'Record the harvest',
    objectiveTitle: 'Gather the Citrus Grove harvest notes',
    instruction: 'Gather three fruits and record the pollinator that keeps the grove healthy.',
    steps: [
      { wordId: 'banana', instruction: 'Gather a ripe banana from the grove’s produce station.', actionLabel: 'Gather the banana', completionText: 'A ripe banana joins the harvest basket.' },
      { wordId: 'orange', instruction: 'Pick an orange for Jun’s harvest basket.', actionLabel: 'Pick the orange', completionText: 'An orange adds a splash of color to the harvest.' },
      { wordId: 'lemon', instruction: 'Pick a lemon for the community kitchen.', actionLabel: 'Pick the lemon', completionText: 'A fragrant lemon is ready for the community kitchen.' },
      { wordId: 'butterfly', instruction: 'Observe the butterfly without disturbing its flowers.', actionLabel: 'Record the butterfly', completionText: 'The butterfly is recorded in the grove’s pollinator notes.' },
    ],
    turnInText: 'Give Jun the harvest basket and your butterfly observation after the orchard word check.',
  },
  {
    questId: 'small-neighbors', mapId: 'small-neighbors', action: 'care', actionLabel: 'Care for a neighbor',
    objectiveTitle: 'Prepare Willow Sanctuary for its residents',
    instruction: 'Check on the sanctuary animals and prepare their quiet resting place.',
    steps: [
      { wordId: 'cat', instruction: 'Check the cat’s resting spot and leave a little breakfast.', actionLabel: 'Feed the cat', completionText: 'The cat has breakfast and a peaceful place to rest.' },
      { wordId: 'dog', instruction: 'Check the dog’s corner and refresh its breakfast.', actionLabel: 'Feed the dog', completionText: 'The dog’s breakfast is ready for a happy morning.' },
      { wordId: 'bird', instruction: 'Leave seeds for the bird at its perch.', actionLabel: 'Leave birdseed', completionText: 'Fresh birdseed waits beside the sanctuary perch.' },
      { wordId: 'stone', instruction: 'Clear the flat stone where Jun checks on the animals.', actionLabel: 'Clear the resting stone', completionText: 'The smooth resting stone is clean and ready.' },
    ],
    turnInText: 'Let Jun know every sanctuary neighbor is cared for, then check their names together.',
  },
  {
    questId: 'garden-in-bloom', mapId: 'garden-in-bloom', action: 'observe', actionLabel: 'Record an observation',
    objectiveTitle: 'Complete the Skyglass Conservatory field notes',
    instruction: 'Use the conservatory’s observation points to record the weather and distant landscape.',
    steps: [
      { wordId: 'sun', instruction: 'Check the sun observation point for the garden’s light record.', actionLabel: 'Record the sunlight', completionText: 'Sunlight is entered in the conservatory field notes.' },
      { wordId: 'rain', instruction: 'Read the rain observation station.', actionLabel: 'Measure the rain', completionText: 'The rainfall observation is safely recorded.' },
      { wordId: 'cloud', instruction: 'Observe the cloud display for the weather record.', actionLabel: 'Record the clouds', completionText: 'Cloud cover is added to today’s weather record.' },
      { wordId: 'mountain', instruction: 'Survey the mountain view from the conservatory lookout.', actionLabel: 'Sketch the mountain', completionText: 'A mountain sketch completes the garden field notes.' },
    ],
    turnInText: 'Share the complete field notes with Jun to reopen the community garden.',
  },
  {
    questId: 'water-edge', mapId: 'water-edge', action: 'survey', actionLabel: 'Inspect the waterfront',
    objectiveTitle: 'Survey the Driftwood Cove waterfront',
    instruction: 'Help Luna check the cove’s boat, wildlife, shoreline, and crossing before visitors arrive.',
    steps: [
      { wordId: 'boat', instruction: 'Inspect the moored boat and check that it is secure.', actionLabel: 'Inspect the boat', completionText: 'The boat is secure and ready for its next arrival.' },
      { wordId: 'fish', instruction: 'Record the fish at the cove’s wildlife station.', actionLabel: 'Record the fish', completionText: 'The fish is logged in the cove wildlife survey.' },
      { wordId: 'shell', instruction: 'Inspect a shoreline shell for the cove nature record.', actionLabel: 'Inspect the shell', completionText: 'The shell is recorded and left safely at the shore.' },
      { wordId: 'bridge', instruction: 'Check the footbridge before opening the waterfront route.', actionLabel: 'Check the bridge', completionText: 'The bridge is checked and the waterfront route is ready.' },
    ],
    turnInText: 'Hand Luna the completed waterfront survey after practicing the four cove words.',
  },
  {
    questId: 'lost-and-found', mapId: 'lost-and-found', action: 'sort', actionLabel: 'Tag lost property',
    objectiveTitle: 'Sort the Parcel Exchange lost property',
    instruction: 'Visit each lost-property station and prepare a clear return label for its owner.',
    steps: [
      { wordId: 'bicycle', instruction: 'Tag the bicycle in the exchange’s cycle bay.', actionLabel: 'Tag the bicycle', completionText: 'The bicycle has a clear return label.' },
      { wordId: 'hat', instruction: 'Label the hat on the lost-property stand.', actionLabel: 'Label the hat', completionText: 'The hat is labeled and ready for its owner.' },
      { wordId: 'bag', instruction: 'Check and tag the bag at the parcel shelf.', actionLabel: 'Tag the bag', completionText: 'The bag is checked and tagged for return.' },
      { wordId: 'shoe', instruction: 'Label the shoe at the small-items station.', actionLabel: 'Label the shoe', completionText: 'The shoe has its own lost-property label.' },
      { wordId: 'umbrella', instruction: 'Tag the umbrella at the covered stand.', actionLabel: 'Tag the umbrella', completionText: 'The umbrella is tagged and ready for a rainy reunion.' },
    ],
    turnInText: 'Show Luna all five return labels so the lost property can find its owners.',
  },
  {
    questId: 'homecoming-parcel', mapId: 'homecoming-parcel', action: 'deliver', actionLabel: 'Prepare the homecoming',
    objectiveTitle: 'Prepare Hearth Cottage for its new neighbor',
    instruction: 'Deliver the welcome parcel and check the cottage’s five homecoming stations with Theo.',
    steps: [
      { wordId: 'house', instruction: 'Deliver the welcome parcel to the cottage address.', actionLabel: 'Deliver the welcome parcel', completionText: 'The welcome parcel has reached the right house.' },
      { wordId: 'door', instruction: 'Check that the front door is ready for the new neighbor.', actionLabel: 'Check the front door', completionText: 'The front door is ready for a warm welcome.' },
      { wordId: 'window', instruction: 'Open the cottage window to let in the fresh air.', actionLabel: 'Open the window', completionText: 'Fresh air fills the cottage through its open window.' },
      { wordId: 'key', instruction: 'Collect the cottage key for the neighbor’s welcome envelope.', actionLabel: 'Prepare the key', completionText: 'The cottage key is tucked into the welcome envelope.' },
      { wordId: 'bed', instruction: 'Make the bed before the new neighbor arrives.', actionLabel: 'Make the bed', completionText: 'A comfortable bed completes the homecoming preparations.' },
    ],
    turnInText: 'Give Theo the key envelope and complete the home word check to welcome the new neighbor.',
  },
  {
    questId: 'harbor-lanterns', mapId: 'harbor-lanterns', action: 'light', actionLabel: 'Prepare the evening lights',
    objectiveTitle: 'Bring the Moonrise Lighthouse celebration to life',
    instruction: 'Prepare the evening lookout and its sky markers before Luna relights the harbor.',
    steps: [
      { wordId: 'moon', instruction: 'Align the moon marker for the lighthouse’s evening signal.', actionLabel: 'Align the moon marker', completionText: 'The moon marker is aligned for the evening signal.' },
      { wordId: 'star', instruction: 'Set the star beacon that guides the harbor celebration.', actionLabel: 'Set the star beacon', completionText: 'The star beacon is ready to guide everyone home.' },
      { wordId: 'bench', instruction: 'Prepare the lookout bench for the neighbors watching the lights.', actionLabel: 'Prepare the lookout bench', completionText: 'The neighbors have a welcoming place to watch the lights.' },
    ],
    turnInText: 'Meet Luna for the last word check and hand over the evening preparations to light the lighthouse.',
  },
];

const DEFINITIONS_BY_ID = new Map(MISSION_DEFINITIONS.map((definition) => [definition.questId, definition]));
const QUEST_BY_ID = new Map(QUESTS.map((quest) => [quest.id, quest]));

export function getMissionDefinition(questId) {
  return DEFINITIONS_BY_ID.get(questId);
}

/** Learning from the journal never substitutes for visiting a mission's objects. */
export function getMissionSummary(progress, questId) {
  const definition = getMissionDefinition(questId);
  const quest = QUEST_BY_ID.get(questId);
  const legacyComplete = quest && getQuestState(quest, progress) === 'completed';
  const collected = legacyComplete ? quest.wordIds : progress?.missions?.[questId]?.collected || [];
  const doneWordIds = quest ? quest.wordIds.filter((id) => collected.includes(id)) : [];
  const pendingWordIds = quest ? quest.wordIds.filter((id) => !collected.includes(id)) : [];
  const completed = doneWordIds.length;
  const total = quest?.wordIds.length || 0;
  let phase = 'locked';
  if (quest) {
    const state = getQuestState(quest, progress);
    if (state === 'completed') phase = 'complete';
    else if (state !== 'locked') {
      phase = completed < total ? 'discover' : progress?.missions?.[questId]?.assessmentPassed ? 'return' : 'challenge';
    }
  }
  return { phase, completed, total, doneWordIds, pendingWordIds, definition };
}

/** Completed maps can be revisited; unavailable chapters cannot be entered. */
export function startMission(progress, questId) {
  if (getMissionSummary(progress, questId).phase === 'locked' || progress.mapId === questId) return progress;
  return { ...progress, mapId: questId };
}

export function goHome(progress) {
  return progress.mapId === 'home' ? progress : { ...progress, mapId: 'home' };
}

/** The app invokes this on the physical object's authored action button. */
export function collectMissionWord(progress, questId, wordId, now = Date.now()) {
  const summary = getMissionSummary(progress, questId);
  if (progress.mapId !== questId || summary.phase !== 'discover' || !summary.pendingWordIds.includes(wordId)) return progress;
  const learned = learnWord(progress, wordId, now);
  const previous = progress.missions?.[questId];
  return {
    ...learned,
    missions: {
      ...(progress.missions || {}),
      [questId]: { collected: [...(previous?.collected || []), wordId], assessmentPassed: false },
    },
  };
}

/** A perfect chapter-sized check unlocks handover, but grants no quest reward. */
export function markMissionAssessment(progress, questId, correctCount, total) {
  const summary = getMissionSummary(progress, questId);
  if (progress.mapId !== questId || summary.phase !== 'challenge'
    || !Number.isSafeInteger(correctCount) || !Number.isSafeInteger(total)
    || total !== summary.total || correctCount !== total) return progress;
  return {
    ...progress,
    missions: {
      ...progress.missions,
      [questId]: { ...progress.missions[questId], assessmentPassed: true },
    },
  };
}

/** Only returning to the on-map character finishes the mission and pays once. */
export function submitMission(progress, questId) {
  if (progress.mapId !== questId || getMissionSummary(progress, questId).phase !== 'return') return progress;
  const awarded = awardQuest(progress, questId);
  if (awarded === progress) return progress;
  return {
    ...awarded,
    missions: {
      ...awarded.missions,
      [questId]: { ...awarded.missions[questId], submitted: true },
    },
  };
}
