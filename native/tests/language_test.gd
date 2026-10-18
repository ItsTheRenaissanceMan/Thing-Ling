extends SceneTree

const Language = preload("res://scripts/language.gd")
var failures: Array = []
var checks: int = 0

func expect(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)

func _initialize() -> void:
	var errors = Language.validate_content()
	expect(errors.is_empty(), "Content validation: " + "; ".join(errors))
	expect(Language.normalize_answer("  ¿QUISIERA   té?  ") == "quisiera té", "Normalize punctuation, case, and repeated whitespace.")
	expect(Language.normalize_answer("Straße") == "strasse", "German alternative spelling ß/ss.")
	expect(Language.normalize_answer("schön") != Language.normalize_answer("schon"), "Keep meaningful German umlauts.")
	expect(Language.normalize_answer("té") != Language.normalize_answer("te"), "Keep meaningful Spanish accents.")
	expect(Language.get_challenge("missing-challenge").is_empty(), "Unknown challenges must not silently become a generic question.")
	expect(Language.get_challenge("tea-order", -2).get("tier") == 1, "Clamp a low difficulty to tier 1.")
	expect(Language.get_challenge("tea-order", 99).get("tier") == 3, "Clamp a high difficulty to tier 3.")
	expect(Language.get_challenge("kettle-on", 2).get("id") == "tea-order-2", "Original activity-map aliases select the authored context.")
	expect(Language.get_challenge("venue-kettle-on", 3).get("id") == "tea-order-3", "Prefixed original activity aliases work too.")
	var story = JSON.parse_string(FileAccess.get_file_as_string("res://data/story.json"))
	var all_challenges: Dictionary = story.get("challenges", {}).duplicate(true)
	if FileAccess.file_exists("res://data/venue_challenges.json"):
		var extra = JSON.parse_string(FileAccess.get_file_as_string("res://data/venue_challenges.json"))
		all_challenges.merge(extra.get("challenges", {}), true)
	expect(all_challenges.size() >= 120, "72 mission and 48 dedicated venue challenges are present.")
	for id in all_challenges:
		var challenge: Dictionary = all_challenges[id]
		for lang in ["de", "ja", "es", "zh"]:
			var tr: Dictionary = challenge["translations"][lang]
			var answer = str(tr["answer"])
			expect(Language.check_answer(answer, challenge, lang), "Accept authored answer %s/%s" % [id, lang])
			expect(not Language.check_answer("", challenge, lang), "Reject empty answer %s/%s" % [id, lang])
			expect(not Language.check_answer("apple", challenge, lang), "A noun alone cannot pass a sentence challenge %s/%s" % [id, lang])
			expect(not Language.check_answer(answer, challenge, "fr"), "No unsupported French answer path.")
			for choice in tr["choices"]:
				expect(Language.check_answer(str(choice), challenge, lang) == (str(choice) == answer), "Only the intended full-sentence choice passes %s/%s: %s" % [id, lang, choice])
			var composer = ("" if lang in ["ja", "zh"] else " ").join(tr.get("tokens", []))
			expect(Language.check_answer(composer, challenge, lang), "Native phrase tokens reconstruct %s/%s" % [id, lang])
			if lang in ["ja", "zh"]:
				expect(Language.check_answer(str(tr.get("reading", "")), challenge, lang), "Accept full romaji/pinyin alternative %s/%s" % [id, lang])
			else:
				expect(Language.check_answer("  " + answer.to_upper() + " !! ", challenge, lang), "Case/punctuation do not block an otherwise correct sentence %s/%s" % [id, lang])
		var base = str(challenge.get("group", id))
		var tier = int(challenge["tier"])
		expect(Language.get_challenge(base, tier).get("id") == id, "Correct difficulty variant resolves for " + str(id))
	var clone = Language.get_challenge("tea-order")
	clone["translations"]["de"]["answer"] = "mutation"
	expect(Language.get_challenge("tea-order")["translations"]["de"]["answer"] != "mutation", "UI receives a deep copy of challenge content.")
	var aliases = Language.get_challenge("tea-order")
	aliases["translations"]["de"]["accepted"].append("Ich möchte eine Tasse Tee.")
	expect(Language.check_answer("Ich möchte eine Tasse Tee.", aliases, "de"), "Accepted alternative whole sentences work.")
	var required_graph = {
		"little-hello": [], "kettle-on": ["little-hello"], "breakfast-club": ["kettle-on"], "lantern-cafe": ["breakfast-club"],
		"first-seedlings": ["little-hello"], "orchard-colors": ["first-seedlings"], "small-neighbors": ["orchard-colors"], "garden-in-bloom": ["small-neighbors"],
		"water-edge": ["little-hello"], "lost-and-found": ["water-edge"], "homecoming-parcel": ["lost-and-found"],
		"harbor-lanterns": ["homecoming-parcel", "lantern-cafe", "garden-in-bloom"]
	}
	var total_stages: int = 0
	for quest in story["quests"]:
		var id = str(quest["id"])
		expect(required_graph.has(id) and required_graph[id] == quest["requires"], "Preserve original mission dependency graph: " + id)
		expect(quest["steps"][0]["type"] == "talk" and quest["steps"][0]["mapId"] == "town", "An NPC in town assigns the mission: " + id)
		expect(quest["steps"][-1]["type"] == "deliver" and quest["steps"][-1]["npcId"] == quest["npcId"], "Finish by a physical delivery to the assigning NPC: " + id)
		total_stages += quest["steps"].size()
	expect(total_stages >= 96, "The 12 missions contain substantial ordered gameplay, not one-word checklist cards.")
	expect(story["dialogues"].size() >= 36, "All 36 residents have authored conversations.")
	for npc in story["dialogues"]:
		expect(story["dialogues"][npc].size() >= 3, "Personal, advice, and practice conversation branches for " + str(npc))
		expect(not Language.get_dialogue(str(npc)).is_empty(), "Dialogue lookup for " + str(npc))
		expect(not Language.get_dialogue(str(npc), str(npc) + "-advice").is_empty(), "Advice branch lookup for " + str(npc))
	expect(Language.get_dialogue("unknown").is_empty(), "Unknown NPC has no fabricated dialogue.")
	expect(Language.get_dialogue("theo", "missing").is_empty(), "Unknown scene has no fabricated branch.")
	expect(Language.get_grammar("ja").size() == 3, "Japanese gets its own particle notes plus shared request/difficulty guidance.")
	# Every active recipe must teach the order the player is actually preparing,
	# including restaurant meals, rather than a generic unrelated cup of tea.
	var drink_data = JSON.parse_string(FileAccess.get_file_as_string("res://data/drink_names.json"))
	var activities = JSON.parse_string(FileAccess.get_file_as_string("res://data/activities.json"))
	expect(drink_data.get("recipes", {}).size() == 30, "Localized recipe names cover all thirty menu items.")
	for recipe_id in activities["recipes"]:
		expect(drink_data["recipes"].has(recipe_id), "Every playable recipe has a translated menu name: " + str(recipe_id))
		for tier in ["1", "2", "3"]:
			var dynamic_challenge: Dictionary = drink_data["templates"][tier].duplicate(true)
			for lang in ["de", "ja", "es", "zh"]:
				var menu: Dictionary = drink_data["recipes"][recipe_id]["translations"][lang]
				var tr: Dictionary = dynamic_challenge["translations"][lang]
				var answer = str(tr["answer"]).replace("{dish}", str(menu["name"]))
				tr["answer"] = answer
				tr["reading"] = str(tr.get("reading", "")).replace("{reading}", str(menu["reading"]))
				var tokens: Array = []
				for token in tr["tokens"]:
					tokens.append(str(token).replace("{dish}", str(menu["name"])))
				tr["tokens"] = tokens
				var choices: Array = []
				for choice in tr["choices"]:
					choices.append(str(choice).replace("{dish}", str(menu["name"])))
				tr["choices"] = choices
				expect(answer.contains(str(menu["name"])), "Confirmation names the actual recipe %s/%s/%s" % [recipe_id, tier, lang])
				expect(Language.check_answer(answer, dynamic_challenge, lang), "Confirm the correct actual order %s/%s/%s" % [recipe_id, tier, lang])
				expect(Language.check_answer(("" if lang in ["ja", "zh"] else " ").join(tokens), dynamic_challenge, lang), "Recipe phrase composer reconstructs %s/%s/%s" % [recipe_id, tier, lang])
				for choice in choices:
					expect(Language.check_answer(str(choice), dynamic_challenge, lang) == (str(choice) == answer), "Only correct recipe confirmation passes %s/%s/%s" % [recipe_id, tier, lang])
				if lang in ["ja", "zh"]:
					expect(Language.check_answer(str(tr["reading"]), dynamic_challenge, lang), "Recipe-specific full reading accepted %s/%s/%s" % [recipe_id, tier, lang])
	# Authored physical quest steps must remain possible in the real map data.
	var town = JSON.parse_string(FileAccess.get_file_as_string("res://data/town.json"))
	var maps: Dictionary = {}
	for map in town["maps"]:
		maps[map["id"]] = map
	for quest in story["quests"]:
		for stage in quest["steps"]:
			var map_id = str(stage["mapId"])
			expect(maps.has(map_id), "Physical quest map exists: " + map_id)
			if not maps.has(map_id):
				continue
			var map: Dictionary = maps[map_id]
			if stage["type"] in ["collect", "use"]:
				var found: bool = false
				for object in map["objects"]:
					if str(object["wordId"]) == str(stage["wordId"]):
						found = true
				expect(found, "Physically present quest object %s/%s" % [map_id, stage["wordId"]])
			if stage["type"] in ["talk", "deliver", "challenge"]:
				var found: bool = false
				for npc in map["npcs"]:
					if str(npc["id"]) == str(stage.get("npcId", "")):
						found = true
				expect(found, "Required NPC is present in map %s/%s" % [map_id, stage.get("npcId", "")])
	if failures.is_empty():
		print("PASS language content: %d checks; %d authored challenges in four languages, 12 ordered missions, 36 residents." % [checks, all_challenges.size()])
		quit(0)
	else:
		for failure in failures:
			printerr("FAIL: " + failure)
		quit(1)
