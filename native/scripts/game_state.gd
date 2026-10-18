extends RefCounted
## Deterministic native campaign, inventory and save rules. Scene interaction is
## separately gated by the world controller's distance checks.
const SAVE_PATH = "user://progress-v2.json"
const LANGUAGES = ["de", "ja", "es", "zh"]
var data: Dictionary = {}
var story: Dictionary = {}
var words: Dictionary = {}
var maps: Dictionary = {}
var quests: Dictionary = {}
var saves: Dictionary = {}
var language: String = "de"
var settings: Dictionary = {"sound": true, "volume": 0.3, "labels": false, "motion": true, "fullscreen": false, "name": "You", "shirt": "sage"}
var progress: Dictionary = {}
var last_error: String = ""

func setup(town: Dictionary, curriculum: Dictionary, vocabulary: Dictionary) -> void:
	data = town
	story = curriculum
	for word in vocabulary.get("words", []):
		words[str(word.id)] = word
	for place in town.get("maps", []):
		maps[str(place.id)] = place
	for quest in curriculum.get("quests", []):
		quests[str(quest.id)] = quest
	progress = fresh_progress("de")

func fresh_progress(id: String) -> Dictionary:
	return {"version": 2, "language": id, "mapId": "town", "position": [0.0, 0.0, 3.0], "xp": 0, "coins": 20, "learned": {}, "inventory": {}, "quests": {}, "activeQuest": "", "grammar": {}, "jobs": {}, "receipts": [], "shopping": {}, "play_seconds": 0, "events": [], "day": 1}

func level() -> int:
	return 1 + int(int(progress.get("xp", 0)) / 180.0)

func difficulty() -> int:
	return clampi(1 + int((level() - 1) / 4.0), 1, 3)

func switch_language(id: String) -> bool:
	if id not in LANGUAGES:
		return false
	if not progress.is_empty():
		saves[language] = progress.duplicate(true)
	language = id
	progress = saves.get(id, fresh_progress(id)).duplicate(true)
	return true

func reset_language(id: String) -> void:
	saves[id] = fresh_progress(id)
	if id == language:
		progress = saves[id].duplicate(true)

func discover(word_id: String) -> bool:
	if not words.has(word_id) or progress.learned.has(word_id):
		return false
	progress.learned[word_id] = {"discovered": int(Time.get_unix_time_from_system()), "correct": 0, "wrong": 0, "mastery": 0, "dueAt": int(Time.get_unix_time_from_system())}
	progress.xp += 5
	_log("discover", word_id)
	return true

func inventory_count(word_id: String) -> int:
	return int(progress.inventory.get(word_id, 0))

func take_item(word_id: String, quantity: int = 1) -> Dictionary:
	if not words.has(word_id) or quantity < 1 or quantity > 10:
		return {"changed": false, "completed": [], "message": "Choose an available item and a quantity from 1 to 10."}
	discover(word_id)
	progress.inventory[word_id] = mini(999, inventory_count(word_id) + quantity)
	return handle_event("collect", {"wordId": word_id, "quantity": quantity, "mapId": progress.mapId})

func current_step(id: String) -> Dictionary:
	if not quests.has(id):
		return {}
	var record: Dictionary = progress.quests.get(id, {})
	if record.is_empty() or record.get("complete", false):
		return {}
	var steps: Array = quests[id].get("steps", [])
	var stage = int(record.get("stage", 0))
	return steps[stage] if stage < steps.size() else {}

func quest_status(id: String) -> String:
	if not quests.has(id):
		return "unknown"
	if progress.quests.has(id):
		return "complete" if progress.quests[id].get("complete", false) else "active"
	for prerequisite in quests[id].get("requires", []):
		if not progress.quests.get(prerequisite, {}).get("complete", false):
			return "locked"
	return "available"

func accept_quest(id: String, npc_id: String) -> bool:
	if quest_status(id) != "available" or str(quests[id].get("npcId", "")) != npc_id:
		return false
	var initial_steps: Array = quests[id].get("steps", [])
	if not initial_steps.is_empty() and str(initial_steps[0].get("mapId", progress.mapId)) != str(progress.mapId):
		return false
	progress.quests[id] = {"stage": 0, "complete": false, "accepted": int(Time.get_unix_time_from_system())}
	progress.activeQuest = id
	_log("accept", id)
	return true

func select_quest(id: String) -> void:
	if quest_status(id) == "active":
		progress.activeQuest = id

func handle_event(kind: String, context: Dictionary) -> Dictionary:
	var advanced: Array = []
	var finished: Array = []
	var current_map: String = str(progress.get("mapId", "town"))
	if str(context.get("mapId", current_map)) != current_map:
		return {"changed": false, "advanced": [], "completed": []}
	# Snapshot keys: completing a quest may update selection, never iterate new state.
	for id in progress.quests.keys():
		var step: Dictionary = current_step(str(id))
		if step.is_empty() or str(step.get("type", "")) != kind:
			continue
		if step.has("mapId") and str(step.mapId) != current_map:
			continue
		if step.has("npcId") and str(step.npcId) != str(context.get("npcId", "")):
			continue
		if step.has("wordId") and str(step.wordId) != str(context.get("wordId", "")):
			continue
		if kind == "challenge" and (str(step.get("challengeId", "")) != str(context.get("challengeId", "")) or not context.get("correct", false)):
			continue
		if kind == "activity":
			if not context.get("success", false) or str(step.get("activity", step.get("mapId", ""))) != str(context.get("venue", "")):
				continue
			if step.has("mode") and str(step.mode) != str(context.get("mode", "work")):
				continue
		if kind == "collect" and inventory_count(str(step.get("wordId", ""))) < int(step.get("quantity", 1)):
			continue
		if kind == "deliver":
			var word_id: String = str(step.get("wordId", ""))
			var quantity: int = int(step.get("quantity", 1))
			if inventory_count(word_id) < quantity:
				continue
			progress.inventory[word_id] = inventory_count(word_id) - quantity
			if progress.inventory[word_id] <= 0:
				progress.inventory.erase(word_id)
		progress.quests[id].stage = int(progress.quests[id].stage) + 1
		advanced.append(id)
		_log(kind, str(id))
		if int(progress.quests[id].stage) >= quests[id].get("steps", []).size():
			progress.quests[id].complete = true
			var reward: Dictionary = quests[id].get("reward", {"xp": 90, "coins": 20})
			progress.xp += int(reward.get("xp", 90))
			progress.coins += int(reward.get("coins", 20))
			finished.append(id)
	if not finished.is_empty():
		if finished.has(progress.get("activeQuest", "")):
			progress.activeQuest = ""
			for id in progress.quests:
				if not progress.quests[id].get("complete", false):
					progress.activeQuest = str(id)
					break
	return {"changed": not advanced.is_empty(), "advanced": advanced, "completed": finished}

func grade(challenge_id: String, correct: bool, npc_id: String = "") -> Dictionary:
	var record: Dictionary = progress.grammar.get(challenge_id, {"correct": 0, "wrong": 0})
	var first_success: bool = int(record.get("correct", 0)) == 0
	record["correct" if correct else "wrong"] = int(record.get("correct" if correct else "wrong", 0)) + 1
	progress.grammar[challenge_id] = record
	if correct and first_success:
		progress.xp += 12
	if not correct:
		return {"changed": false, "completed": []}
	return handle_event("challenge", {"challengeId": challenge_id, "correct": true, "mapId": progress.mapId, "npcId": npc_id})

func award_job(result: Dictionary, transaction_id: String) -> Dictionary:
	if not result.get("success", false) or transaction_id.is_empty() or transaction_id in progress.receipts:
		return {"changed": false, "completed": []}
	var venue: String = str(result.get("venue", ""))
	if venue != str(progress.mapId) or not maps.has(venue):
		return {"changed": false, "completed": []}
	progress.receipts.append(transaction_id)
	if progress.receipts.size() > 200:
		progress.receipts.pop_front()
	progress.xp += clampi(int(result.get("xp", 20)), 0, 300)
	progress.coins += clampi(int(result.get("coins", 8)), 0, 100)
	var job: Dictionary = progress.jobs.get(venue, {"shifts": 0, "best": 0})
	job.shifts = int(job.shifts) + 1
	job.best = maxi(int(job.best), int(result.get("score", 0)))
	progress.jobs[venue] = job
	for word_id in result.get("consumed", {}):
		progress.inventory[word_id] = maxi(0, inventory_count(str(word_id)) - int(result.consumed[word_id]))
		if progress.inventory[word_id] == 0:
			progress.inventory.erase(word_id)
	for word_id in result.get("items", {}):
		if words.has(word_id):
			progress.inventory[word_id] = mini(999, inventory_count(str(word_id)) + maxi(0, int(result.items[word_id])))
	return handle_event("activity", {"venue": venue, "mode": str(result.get("mode", "work")), "success": true, "mapId": progress.mapId})

func save_game() -> bool:
	_canonicalize_position()
	saves[language] = progress.duplicate(true)
	var payload: Dictionary = {"app": "thing-ling-native", "version": 2, "language": language, "settings": settings, "saves": saves}
	var text: String = JSON.stringify(payload, "\t", true, true)
	var temp_path: String = SAVE_PATH + ".tmp"
	var file = FileAccess.open(temp_path, FileAccess.WRITE)
	if file == null:
		last_error = "Could not write your save: " + str(FileAccess.get_open_error())
		return false
	file.store_string(text)
	file.close()
	var error = DirAccess.rename_absolute(ProjectSettings.globalize_path(temp_path), ProjectSettings.globalize_path(SAVE_PATH))
	if error != OK:
		last_error = "Could not replace your save. Export a backup from Settings."
		return false
	last_error = ""
	return true

func load_game() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if not parsed is Dictionary or not import_payload(parsed):
		last_error = "Your save could not be read. A fresh session is available; the original file was preserved."
		return false
	return true

func export_payload() -> Dictionary:
	_canonicalize_position()
	saves[language] = progress.duplicate(true)
	return {"app": "thing-ling-native", "version": 2, "language": language, "settings": settings.duplicate(true), "saves": saves.duplicate(true)}

func import_payload(payload: Dictionary) -> bool:
	var imported: Dictionary = {}
	if payload.get("app", "") == "thing-ling" and int(payload.get("version", 0)) == 1:
		if not payload.get("saves", {}) is Dictionary:
			return false
		for id in payload.get("saves", {}):
			if str(id) not in LANGUAGES:
				return false
			var old = payload.saves[id]
			if not old is Dictionary or not old.get("learned", {}) is Dictionary or int(old.get("xp", -1)) < 0:
				return false
			var migrated: Dictionary = fresh_progress(str(id))
			migrated.xp = int(old.xp)
			migrated.coins = maxi(0, int(old.get("coins", 0)))
			if not old.get("quests", []) is Array:
				return false
			for word_id in old.learned:
				if not old.learned[word_id] is Dictionary:
					return false
				if words.has(word_id):
					migrated.learned[word_id] = {"discovered": int(old.learned[word_id].get("discoveredAt", 0) / 1000.0), "correct": int(old.learned[word_id].get("correct", 0)), "wrong": int(old.learned[word_id].get("wrong", 0)), "mastery": clampi(int(old.learned[word_id].get("level", 0)), 0, 5), "dueAt": int(old.learned[word_id].get("dueAt", Time.get_unix_time_from_system() * 1000.0) / 1000.0)}
			for quest_id in old.get("quests", []):
				if quests.has(quest_id):
					migrated.quests[quest_id] = {"stage": quests[quest_id].get("steps", []).size(), "complete": true, "accepted": 0}
			imported[id] = migrated
	elif payload.get("app", "") == "thing-ling-native" and int(payload.get("version", 0)) == 2:
		if not payload.get("saves", {}) is Dictionary:
			return false
		for id in payload.saves:
			if str(id) not in LANGUAGES:
				return false
			var valid: Dictionary = validate_save(payload.saves[id], str(id))
			if valid.is_empty():
				return false
			imported[id] = valid
	else:
		return false
	if imported.is_empty():
		return false
	for id in imported:
		saves[id] = imported[id]
	var desired_language: String = str(payload.get("language", language))
	if desired_language in LANGUAGES and imported.has(desired_language):
		language = desired_language
	progress = saves.get(language, fresh_progress(language)).duplicate(true)
	var imported_settings = payload.get("settings", {})
	if imported_settings is Dictionary:
		for key in ["sound", "labels", "motion", "fullscreen"]:
			if imported_settings.get(key) is bool:
				settings[key] = imported_settings[key]
		if imported_settings.get("volume") is float or imported_settings.get("volume") is int:
			settings.volume = clampf(float(imported_settings.volume), 0, 1)
		if imported_settings.get("name") is String:
			settings.name = str(imported_settings.name).substr(0, 30)
		if imported_settings.get("shirt", "") in ["sage", "coral", "ocean", "gold", "lavender"]:
			settings.shirt = imported_settings.shirt
	return true

func validate_save(raw, id: String) -> Dictionary:
	if not raw is Dictionary or str(raw.get("language", "")) != id or not maps.has(str(raw.get("mapId", ""))):
		return {}
	for key in ["xp", "coins", "play_seconds", "day"]:
		if not (raw.get(key) is int or raw.get(key) is float) or float(raw[key]) < 0 or float(raw[key]) > 100000000 or floorf(float(raw[key])) != float(raw[key]):
			return {}
	for key in ["learned", "inventory", "quests", "grammar", "jobs", "shopping"]:
		if not raw.get(key) is Dictionary:
			return {}
	var position = raw.get("position", [])
	if not position is Array or position.size() != 3:
		return {}
	for component in position:
		if not (component is int or component is float) or not is_finite(float(component)) or absf(float(component)) > 10000:
			return {}
	for word_id in raw.learned:
		if not words.has(word_id) or not raw.learned[word_id] is Dictionary:
			return {}
		var learned_record: Dictionary = raw.learned[word_id]
		for key in ["discovered", "correct", "wrong", "mastery", "dueAt"]:
			if not _valid_counter(learned_record.get(key, 0), 5 if key == "mastery" else 100000000000):
				return {}
	for word_id in raw.inventory:
		if not words.has(word_id) or not (raw.inventory[word_id] is int or raw.inventory[word_id] is float) or int(raw.inventory[word_id]) < 0 or int(raw.inventory[word_id]) > 999 or floorf(float(raw.inventory[word_id])) != float(raw.inventory[word_id]):
			return {}
	for quest_id in raw.quests:
		if not quests.has(quest_id) or not raw.quests[quest_id] is Dictionary:
			return {}
		var record: Dictionary = raw.quests[quest_id]
		if not (record.get("stage") is int or record.get("stage") is float) or floorf(float(record.stage)) != float(record.stage):
			return {}
		if not record.get("complete") is bool or int(record.get("stage", -1)) < 0 or int(record.stage) > quests[quest_id].get("steps", []).size():
			return {}
		if record.complete and int(record.stage) != quests[quest_id].get("steps", []).size():
			return {}
		if not record.complete and int(record.stage) >= quests[quest_id].get("steps", []).size():
			return {}
		if not _valid_counter(record.get("accepted", 0), 100000000000):
			return {}
	for key in ["receipts", "events"]:
		if not raw.get(key, []) is Array or raw.get(key, []).size() > 1000:
			return {}
	if not raw.get("activeQuest", "") is String:
		return {}
	if not str(raw.get("activeQuest", "")).is_empty() and not raw.quests.has(raw.activeQuest):
		return {}
	for challenge_id in raw.grammar:
		var grammar_record = raw.grammar[challenge_id]
		if not grammar_record is Dictionary:
			return {}
		if not _valid_counter(grammar_record.get("correct", -1)) or not _valid_counter(grammar_record.get("wrong", -1)):
			return {}
	for venue in raw.jobs:
		if not maps.has(venue) or not raw.jobs[venue] is Dictionary:
			return {}
		if not _valid_counter(raw.jobs[venue].get("shifts", -1)) or not _valid_counter(raw.jobs[venue].get("best", -1), 100):
			return {}
	if not raw.shopping.is_empty():
		if not raw.shopping.get("items", {}) is Dictionary:
			return {}
		for word_id in raw.shopping.get("items", {}):
			if not words.has(word_id) or not _valid_counter(raw.shopping.items[word_id], 999):
				return {}
	var valid: Dictionary = fresh_progress(id)
	for key in valid:
		if raw.has(key):
			valid[key] = raw[key]
	# JSON parses numbers as floats. Restore canonical counter types so an
	# imported/disk save is identical to the live state, including nested records.
	for key in valid:
		if key != "position":
			valid[key] = _canonical_numbers(valid[key])
	valid.position = [snappedf(float(position[0]), 1.0 / 1024.0), snappedf(float(position[1]), 1.0 / 1024.0), snappedf(float(position[2]), 1.0 / 1024.0)]
	valid.version = 2
	return valid.duplicate(true)

func _valid_counter(value, maximum: int = 100000000) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) >= 0 and float(value) <= maximum and floorf(float(value)) == float(value)

func _canonicalize_position() -> void:
	# A binary grid below one millimetre retains walking precision while avoiding
	# JSON decimal-parser drift in raw 32-bit physics coordinates.
	var position: Array = progress.get("position", [0.0, 0.0, 3.0])
	progress.position = [snappedf(float(position[0]), 1.0 / 1024.0), snappedf(float(position[1]), 1.0 / 1024.0), snappedf(float(position[2]), 1.0 / 1024.0)]

func _log(kind: String, id: String) -> void:
	progress.events.append({"type": kind, "id": id, "map": progress.mapId, "time": int(Time.get_unix_time_from_system())})
	if progress.events.size() > 100:
		progress.events.pop_front()

func _canonical_numbers(value):
	if value is Dictionary:
		var result: Dictionary = {}
		for key in value:
			result[key] = _canonical_numbers(value[key])
		return result
	if value is Array:
		var result: Array = []
		for element in value:
			result.append(_canonical_numbers(element))
		return result
	if value is float and is_finite(value) and absf(value) <= 9007199254740991 and floorf(value) == value:
		return int(value)
	return value
