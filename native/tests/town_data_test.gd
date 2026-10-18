extends SceneTree
## Data-to-game contract audit; spatial and route sweeps live in the deterministic generator.
var failures: Array[String] = []
var checks: int = 0

func check(condition: bool, text: String) -> void:
	checks += 1
	if not condition:
		failures.append(text)

func _initialize() -> void:
	var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/town.json"))
	var vocabulary: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/vocabulary.json"))
	var words: Dictionary = {}
	for word: Dictionary in vocabulary.get("words", []):
		words[word.id] = word
		for language: String in ["de", "ja", "es", "zh"]:
			check(not str(word.translations.get(language, {}).get("text", "")).is_empty(), "Missing translation: " + str(word.id) + "/" + language)
	var maps: Dictionary = {}
	var people: Dictionary = {}
	for npc: Dictionary in data.npcs:
		check(not people.has(npc.id), "Duplicate global NPC: " + str(npc.id))
		people[npc.id] = npc
	for map_data: Dictionary in data.maps:
		check(not maps.has(map_data.id), "Duplicate map: " + str(map_data.id))
		maps[map_data.id] = map_data
	check(maps.size() == 29, "Expected town and all 28 authored interiors")
	check(people.size() >= 36, "Expected diverse town residents")
	var outdoor: Dictionary = maps.town
	check(outdoor.objects.size() >= 1200, "Dense outdoor town detail must remain intact")
	check(outdoor.portals.size() == 28, "Every outdoor venue must be enterable")
	for map_data: Dictionary in data.maps:
		var types: Dictionary = {}
		for object: Dictionary in map_data.objects:
			check(words.has(object.wordId), "Unlabelled/unknown object: " + str(object.id))
			types[object.wordId] = true
		for npc: Dictionary in map_data.npcs:
			check(people.has(npc.id), "Missing NPC definition: " + str(npc.id))
			check(npc.route.size() >= 2, "NPC needs a live route: " + str(npc.id))
		for portal: Dictionary in map_data.portals:
			check(maps.has(portal.target), "Portal target must be an actual map: " + str(portal.id))
			check(portal.spawn.size() == 2, "Portal target needs a safe spawn: " + str(portal.id))
		if map_data.id != "town":
			check(map_data.objects.size() >= 100, "Interior must keep its authored detail: " + str(map_data.id))
			check(map_data.portals[0].target == "town", "Every interior needs a return exit")
	var requirements: Dictionary = {
		"little-hello": ["apple", "book", "flower"],
		"kettle-on": ["coffee", "cup", "water", "tea"],
		"breakfast-club": ["bread", "egg", "milk", "cheese"],
		"lantern-cafe": ["table", "chair", "lamp", "clock", "cup"],
		"first-seedlings": ["tree", "carrot", "tomato", "strawberry"],
		"orchard-colors": ["banana", "orange", "lemon", "butterfly"],
		"small-neighbors": ["cat", "dog", "bird", "stone", "fish"],
		"garden-in-bloom": ["sun", "rain", "cloud", "mountain", "flower"],
		"water-edge": ["boat", "fish", "shell", "bridge"],
		"lost-and-found": ["bicycle", "hat", "bag", "shoe", "umbrella"],
		"homecoming-parcel": ["house", "door", "window", "key", "bed"],
		"harbor-lanterns": ["moon", "star", "bench", "lamp"],
		"supermarket": ["apple", "bread", "milk", "cheese", "yogurt"],
		"post-office": ["parcel", "envelope", "stamp"],
	}
	for map_id: String in requirements:
		var types: Dictionary = {}
		for object: Dictionary in maps[map_id].objects:
			types[object.wordId] = true
		for word_id: String in requirements[map_id]:
			check(types.has(word_id), "Physical gameplay item must exist: " + map_id + "/" + word_id)
	var cafe_types: Dictionary = {}
	for object: Dictionary in maps["lantern-cafe"].objects:
		cafe_types[object.wordId] = true
	for ingredient: String in ["coffee", "tea", "milk", "water", "sugar", "honey", "lemon", "chocolate", "cream", "cinnamon", "mint", "ice", "vanilla"]:
		check(cafe_types.has(ingredient), "Café ingredient station missing: " + ingredient)
	print("Town data contract: %d checks, %d failures" % [checks, failures.size()])
	for failure: String in failures:
		push_error(failure)
	quit(0 if failures.is_empty() else 1)
