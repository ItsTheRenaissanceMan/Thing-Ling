extends RefCounted
## Pure, UI-independent helpers for authored multilingual sentence challenges.
## The passed level is a curriculum tier (1–3), not the player's raw XP level.

const STORY_PATH = "res://data/story.json"
const VENUE_PATH = "res://data/venue_challenges.json"
const LANGUAGE_IDS = ["de", "ja", "es", "zh"]
const ACTIVITY_ALIASES = {
	"little-hello": "hello-introduction", "kettle-on": "tea-order",
	"breakfast-club": "breakfast-order", "lantern-cafe": "cafe-seating",
	"first-seedlings": "garden-plan", "orchard-colors": "orchard-quantity",
	"small-neighbors": "animal-care", "garden-in-bloom": "weather-observation",
	"water-edge": "harbor-safety", "lost-and-found": "parcel-return",
	"homecoming-parcel": "cottage-arrival", "harbor-lanterns": "lantern-arrangements"
}
static var _cached_challenges: Dictionary = {}
static var _cached_story: Dictionary = {}

static func normalize_answer(text: String) -> String:
	var result = text.to_lower().strip_edges()
	# Sentence punctuation and typographic quotation marks do not change meaning.
	# Accents, umlauts, verb endings, particles, and word order remain significant.
	for mark in [".", ",", "!", "?", "¿", "¡", "。", "、", "，", "！", "？", ":", ";", "：", "；", "\"", "“", "”", "„", "「", "」", "『", "』"]:
		result = result.replace(mark, "")
	result = result.replace("’", "'").replace("‘", "'").replace("ß", "ss")
	result = result.replace("　", " ").replace("\t", " ").replace("\n", " ").replace("\r", " ")
	while result.contains("  "):
		result = result.replace("  ", " ")
	return result.strip_edges()

static func check_answer(answer: String, challenge: Dictionary, language: String) -> bool:
	if not LANGUAGE_IDS.has(language) or not challenge.get("translations", {}) is Dictionary:
		return false
	var translation: Dictionary = challenge.get("translations", {}).get(language, {})
	if translation.is_empty() or answer.strip_edges().is_empty():
		return false
	var candidates: Array = [translation.get("answer", "")]
	if translation.get("accepted", []) is Array:
		candidates.append_array(translation.get("accepted", []))
	# Romaji/pinyin support lets a player without a target-language keyboard type
	# the entire sentence. Native spelling is always shown beside the reading.
	var reading = str(translation.get("reading", ""))
	if not reading.is_empty():
		candidates.append(reading)
	var normalized = normalize_answer(answer)
	for candidate in candidates:
		var expected = normalize_answer(str(candidate))
		if language in ["ja", "zh"]:
			if normalized.replace(" ", "") == expected.replace(" ", ""):
				return true
		elif normalized == expected:
			return true
	return false

static func _read_dictionary(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	return parsed if parsed is Dictionary else {}

static func _load_content() -> void:
	if not _cached_challenges.is_empty():
		return
	_cached_story = _read_dictionary(STORY_PATH)
	var source = _cached_story.get("challenges", {})
	if source is Dictionary:
		_cached_challenges = source.duplicate(true)
	var venues = _read_dictionary(VENUE_PATH).get("challenges", {})
	if venues is Dictionary:
		for id in venues:
			_cached_challenges[id] = venues[id].duplicate(true)

static func get_challenge(id: String, level: int = 1) -> Dictionary:
	_load_content()
	var base = str(ACTIVITY_ALIASES.get(id, id))
	# Activities may use either the map ID or venue-<map ID> for original venues.
	if base.begins_with("venue-") and ACTIVITY_ALIASES.has(base.trim_prefix("venue-")):
		base = str(ACTIVITY_ALIASES[base.trim_prefix("venue-")])
	var tier = clampi(level, 1, 3)
	var candidate = base if tier == 1 else "%s-%d" % [base, tier]
	if _cached_challenges.has(candidate):
		return _cached_challenges[candidate].duplicate(true)
	if _cached_challenges.has(base):
		return _cached_challenges[base].duplicate(true)
	return {}

static func get_dialogue(npc_id: String, dialogue_id: String = "") -> Dictionary:
	_load_content()
	var scenes = _cached_story.get("dialogues", {}).get(npc_id, [])
	if not scenes is Array or scenes.is_empty():
		return {}
	if dialogue_id.is_empty():
		return scenes[0].duplicate(true)
	for scene in scenes:
		if scene is Dictionary and str(scene.get("id", "")) == dialogue_id:
			return scene.duplicate(true)
	return {}

static func get_grammar(language: String = "") -> Array:
	_load_content()
	var result: Array = []
	for entry in _cached_story.get("grammar", []):
		if entry is Dictionary and (language.is_empty() or not entry.has("language") or entry.get("language") == language):
			result.append(entry.duplicate(true))
	return result

static func validate_content() -> Array:
	_load_content()
	var errors: Array = []
	if _cached_story.is_empty():
		return ["Missing or invalid native/data/story.json"]
	if _cached_challenges.size() < 72:
		errors.append("At least 72 authored sentence challenges are required.")
	for id in _cached_challenges:
		var challenge = _cached_challenges[id]
		if not challenge is Dictionary:
			errors.append("Invalid challenge: " + str(id))
			continue
		if str(challenge.get("prompt", "")).is_empty() or str(challenge.get("grammar", "")).is_empty():
			errors.append("Missing prompt or grammar: " + str(id))
		if int(challenge.get("tier", 0)) not in [1, 2, 3]:
			errors.append("Invalid difficulty tier: " + str(id))
		for lang in LANGUAGE_IDS:
			var tr = challenge.get("translations", {}).get(lang, {})
			var answer = str(tr.get("answer", ""))
			var choices = tr.get("choices", [])
			if answer.is_empty() or str(tr.get("explanation", "")).is_empty():
				errors.append("Missing answer/explanation: %s/%s" % [id, lang])
			if not choices is Array or choices.size() != 3 or not choices.has(answer):
				errors.append("Expected 3 choices including the correct answer: %s/%s" % [id, lang])
			else:
				var unique: Dictionary = {}
				for choice in choices:
					unique[normalize_answer(str(choice))] = true
				if unique.size() != 3:
					errors.append("Duplicate normalized choices: %s/%s" % [id, lang])
			if lang in ["ja", "zh"] and str(tr.get("reading", "")).is_empty():
				errors.append("Missing reading: %s/%s" % [id, lang])
			var tokens = tr.get("tokens", [])
			if not tokens is Array or tokens.size() < 2:
				errors.append("Missing sentence-composer tokens: %s/%s" % [id, lang])
			elif not check_answer(("" if lang in ["ja", "zh"] else " ").join(tokens), challenge, lang):
				errors.append("Sentence tokens do not reconstruct answer: %s/%s" % [id, lang])
	var quests = _cached_story.get("quests", [])
	if not quests is Array or quests.size() != 12:
		errors.append("Expected all 12 original missions.")
	var quest_ids: Dictionary = {}
	for quest in quests:
		quest_ids[str(quest.get("id", ""))] = true
	for quest in quests:
		var id = str(quest.get("id", ""))
		var steps = quest.get("steps", [])
		if steps.size() < 6:
			errors.append("Mission needs a substantial ordered task chain: " + id)
		var types: Dictionary = {}
		for stage in steps:
			var kind = str(stage.get("type", ""))
			types[kind] = true
			if kind not in ["talk", "collect", "use", "activity", "deliver", "challenge"]:
				errors.append("Unknown stage type in " + id)
			if str(stage.get("mapId", "")).is_empty() or str(stage.get("text", "")).is_empty():
				errors.append("Stage lacks a map or instruction in " + id)
			if kind == "challenge" and get_challenge(str(stage.get("challengeId", ""))).is_empty():
				errors.append("Missing stage challenge in " + id)
			if kind in ["collect", "use", "deliver"] and str(stage.get("wordId", "")).is_empty():
				errors.append("Missing physical object in " + id)
			if kind in ["talk", "deliver"] and str(stage.get("npcId", "")).is_empty():
				errors.append("Missing interaction recipient in " + id)
		for kind in ["talk", "collect", "activity", "deliver", "challenge"]:
			if not types.has(kind):
				errors.append("Mission %s is missing gameplay type %s" % [id, kind])
		for prerequisite in quest.get("requires", []):
			if not quest_ids.has(prerequisite):
				errors.append("Unknown prerequisite in " + id)
	var residents = _cached_story.get("dialogues", {})
	if residents.size() < 30:
		errors.append("At least 30 residents need dialogue.")
	for npc in residents:
		var scenes = residents[npc]
		var scene_ids: Dictionary = {}
		for scene in scenes:
			scene_ids[str(scene.get("id", ""))] = true
		for scene in scenes:
			if scene.get("lines", []).size() < 2:
				errors.append("Dialogue needs an exchange: " + str(scene.get("id", "")))
			for line in scene.get("lines", []):
				for lang in LANGUAGE_IDS:
					if str(line.get("text", {}).get(lang, "")).is_empty():
						errors.append("Untranslated dialogue %s/%s" % [scene.get("id", ""), lang])
			for response in scene.get("responses", []):
				if response.has("nextId") and not scene_ids.has(response["nextId"]):
					errors.append("Broken dialogue branch: " + str(response["nextId"]))
				for lang in LANGUAGE_IDS:
					if str(response.get("text", {}).get(lang, "")).is_empty():
						errors.append("Untranslated dialogue response for " + str(npc))
			if scene.has("challengeId") and get_challenge(str(scene["challengeId"])).is_empty():
				errors.append("Missing dialogue challenge: " + str(scene["challengeId"]))
	return errors
