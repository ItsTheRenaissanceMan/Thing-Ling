extends SceneTree
## Exercises the actual native scripts and physics, not an independent game model.
var failures: Array[String] = []
var checks = 0
var words: Dictionary = {}
var maps: Dictionary = {}
var town: Dictionary = {}
var story: Dictionary = {}
var vocabulary: Dictionary = {}
var interaction_events: Array = []

func _initialize() -> void:
	call_deferred("_run")

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)
		push_error("NATIVE TEST: " + message)

func read_json(path: String) -> Dictionary:
	var value = JSON.parse_string(FileAccess.get_file_as_string(path))
	check(value is Dictionary, "Readable JSON dictionary: " + path)
	return value if value is Dictionary else {}

func _run() -> void:
	if "--render" in OS.get_cmdline_user_args():
		await _render_game()
		return
	town = read_json("res://data/town.json")
	story = read_json("res://data/story.json")
	vocabulary = read_json("res://data/vocabulary.json")
	var extra = read_json("res://data/extra_vocabulary.json")
	for word in vocabulary.get("words", []) + extra.get("words", []):
		words[str(word.id)] = word
	vocabulary["words"] = words.values()
	for place in town.get("maps", []):
		maps[str(place.id)] = place
	_test_language()
	_test_campaign()
	_test_saves()
	await _test_world()
	await _test_authored_worlds()
	await _test_audio()
	await process_frame
	await process_frame
	# Release the test process's shared mesh library before SceneTree shutdown.
	# Normal gameplay keeps these resources for all subsequent map visits.
	var models = load("res://scripts/models.gd")
	models._meshes.clear()
	models._metadata.clear()
	models._vertices = PackedFloat32Array()
	models._material = null
	var report = {"checks": checks, "failures": failures, "passed": failures.is_empty(), "maps": maps.size(), "words": words.size(), "languages": ["de", "ja", "es", "zh"], "engine": Engine.get_version_info().string}
	var output = OS.get_environment("THING_LING_TEST_REPORT")
	if output.is_empty():
		output = "/tmp/thing-ling-native-integration.json"
	var file = FileAccess.open(output, FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(report, "\t"))
		file.close()
	print("NATIVE_INTEGRATION " + JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)

func _test_language() -> void:
	var curriculum = load("res://scripts/language.gd")
	check(curriculum != null, "Native sentence curriculum script loads")
	if curriculum == null:
		return
	var errors = curriculum.validate_content()
	check(errors.is_empty(), "Curriculum validates: " + str(errors))
	var content = read_json("res://data/venue_challenges.json")
	for id in content.get("challenges", {}):
		var challenge: Dictionary = content.challenges[id]
		for language in ["de", "ja", "es", "zh"]:
			var translation: Dictionary = challenge.translations[language]
			check(curriculum.check_answer(str(translation.answer), challenge, language), "Accept full native sentence: " + id + "/" + language)
			check(curriculum.check_answer(str(translation.reading), challenge, language), "Accept full reading: " + id + "/" + language)
			check(not curriculum.check_answer("apple", challenge, language), "Reject noun-only shortcut: " + id + "/" + language)
			check(not curriculum.check_answer("", challenge, language), "Reject blank sentence: " + id + "/" + language)
		var base = str(challenge.get("group", id))
		var resolved = curriculum.get_challenge(base, int(challenge.tier))
		check(str(resolved.get("id", "")) == str(id), "Level resolves the authored grammar tier: " + id)

func _new_state():
	var script = load("res://scripts/game_state.gd")
	var state = script.new()
	state.setup(town, story, vocabulary)
	return state

func _test_campaign() -> void:
	var curriculum = load("res://scripts/language.gd")
	var quests: Array = story.get("quests", [])
	check(quests.size() >= 12, "Retained twelve complete story missions")
	for language in ["de", "ja", "es", "zh"]:
		var state = _new_state()
		state.switch_language(language)
		for quest in quests:
			var id = str(quest.id)
			state.progress.mapId = str(quest.get("steps", [{}])[0].get("mapId", "town"))
			check(not state.accept_quest(id, "not-the-assigned-neighbor"), "Wrong NPC cannot assign " + id)
			check(state.accept_quest(id, str(quest.npcId)), "NPC assigns available mission: " + id + "/" + language)
			if not state.progress.quests.has(id):
				continue
			for step in quest.get("steps", []):
				state.progress.mapId = str(step.get("mapId", quest.get("mapId", "town")))
				var before = int(state.progress.quests[id].stage)
				var kind = str(step.type)
				state.handle_event(kind, {"mapId": "wrong-map", "wordId": step.get("wordId", ""), "npcId": step.get("npcId", ""), "correct": true, "challengeId": step.get("challengeId", ""), "success": true, "venue": step.get("activity", "")})
				check(int(state.progress.quests[id].stage) == before, "Wrong-map event cannot advance " + id + "/" + str(before))
				if step.has("wordId"):
					state.discover(str(step.wordId))
					check(int(state.progress.quests[id].stage) == before, "Naming alone cannot complete a physical task: " + id + "/" + str(before))
				var context = {"mapId": state.progress.mapId, "npcId": step.get("npcId", ""), "wordId": step.get("wordId", ""), "quantity": step.get("quantity", 1)}
				match kind:
					"collect":
						state.take_item(str(step.wordId), int(step.get("quantity", 1)))
					"challenge":
						var challenge = curriculum.get_challenge(str(step.challengeId), 1)
						check(not challenge.is_empty(), "Mission sentence challenge exists: " + str(step.challengeId))
						state.grade(str(step.challengeId), false, str(step.get("npcId", "")))
						check(int(state.progress.quests[id].stage) == before, "Incorrect grammar cannot advance " + id)
						if not challenge.is_empty():
							check(curriculum.check_answer(str(challenge.translations[language].answer), challenge, language), "Mission full sentence is accepted: " + id + "/" + language)
						if step.has("npcId"):
							state.grade(str(step.challengeId), true, "wrong-neighbor")
							check(int(state.progress.quests[id].stage) == before, "Correct sentence with wrong interlocutor cannot advance " + id)
						state.grade(str(step.challengeId), true, str(step.get("npcId", "")))
					"activity":
						state.award_job({"venue": step.get("activity", state.progress.mapId), "mode": step.get("mode", "work"), "success": true, "score": 100, "xp": 20, "coins": 8}, id + "-" + str(before))
					"deliver":
						check(state.inventory_count(str(step.wordId)) >= int(step.get("quantity", 1)), "Earlier physical steps supply the delivery: " + id + "/" + str(step.wordId))
						state.handle_event(kind, context)
					_:
						state.handle_event(kind, context)
				check(int(state.progress.quests[id].stage) == before + 1, "Authored task advances exactly one step: " + id + "/" + str(before) + "/" + kind)
			check(state.quest_status(id) == "complete", "Finish complete multi-step mission: " + id + "/" + language)
			var xp = int(state.progress.xp)
			var coins = int(state.progress.coins)
			state.handle_event("talk", {"mapId": state.progress.mapId, "npcId": quest.npcId})
			check(int(state.progress.xp) == xp and int(state.progress.coins) == coins, "Completed mission never pays twice: " + id)

func _test_saves() -> void:
	var state = _new_state()
	state.discover("apple")
	state.take_item("bread", 2)
	state.progress.mapId = "supermarket"
	state.progress.position = [1.0, 0.0, 3.0]
	var result = {"venue": "supermarket", "mode": "work", "success": true, "score": 100, "xp": 30, "coins": 10}
	state.award_job(result, "native-test-receipt")
	var xp = int(state.progress.xp)
	state.award_job(result, "native-test-receipt")
	check(int(state.progress.xp) == xp, "The same job receipt cannot pay twice")
	var original: Dictionary = state.export_payload()
	var copy = _new_state()
	check(copy.import_payload(original), "Native save round-trip imports")
	check(copy.progress == state.progress, "Round-trip preserves avatar map, inventory, discoveries, jobs, and rewards")
	check(copy.inventory_count("bread") == 2, "Inventory quantity survives import")
	copy.switch_language("ja")
	check(not copy.progress.learned.has("apple"), "Separate languages do not share discoveries")
	copy.switch_language("de")
	check(copy.progress.learned.has("apple"), "Switching back restores the original language")
	var malformed = original.duplicate(true)
	malformed.saves.de.mapId = "missing-map"
	check(not copy.import_payload(malformed), "Unknown-map save is rejected")
	check(copy.progress.learned.has("apple"), "Rejected import preserves the working save")
	var corruptions: Array = []
	for key in ["correct", "wrong", "mastery", "discovered", "dueAt"]:
		var corrupt = original.duplicate(true)
		corrupt.saves.de.learned.apple[key] = 6 if key == "mastery" else "invalid-counter"
		corruptions.append([corrupt, "Invalid nested learned " + key])
	var corrupt = original.duplicate(true)
	corrupt.saves.de.inventory.bread = 1.5
	corruptions.append([corrupt, "Fractional inventory quantity"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.grammar["venue-supermarket"] = {"correct": [], "wrong": 0}
	corruptions.append([corrupt, "Malformed nested grammar counter"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.jobs.supermarket.best = 101
	corruptions.append([corrupt, "Job score beyond 100"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.jobs.supermarket.shifts = -1
	corruptions.append([corrupt, "Negative job shift count"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.shopping = {"items": []}
	corruptions.append([corrupt, "Shopping items array instead of dictionary"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.shopping = {"items": {"not-an-item": 1}}
	corruptions.append([corrupt, "Unknown shopping item"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.activeQuest = "little-hello"
	corruptions.append([corrupt, "Selected unaccepted quest"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.quests["little-hello"] = {"stage": story.quests[0].steps.size(), "complete": false, "accepted": 0}
	corruptions.append([corrupt, "Unfinished quest beyond final stage"])
	for key in ["receipts", "events"]:
		corrupt = original.duplicate(true)
		corrupt.saves.de[key] = {}
		corruptions.append([corrupt, "Malformed " + key + " collection"])
	corrupt = original.duplicate(true)
	corrupt.saves.de.position = [0, NAN, 0]
	corruptions.append([corrupt, "Non-finite avatar position"])
	for specimen in corruptions:
		var working = copy.progress.duplicate(true)
		check(not copy.import_payload(specimen[0]), "Reject corrupt save: " + str(specimen[1]))
		check(copy.progress == working, "Rejected save remains atomic: " + str(specimen[1]))
	# Physics uses single-precision Vector3 components; JSON decimal parsing used
	# to drift at sub-nanometre scale. Save-time position canonicalization must
	# retain the actual location to sub-millimetre precision and round-trip exactly.
	var raw_position = [0.0, -0.00488281669095159, 20.0]
	state.progress.position = raw_position.duplicate()
	check(state.save_game(), "Native atomic save writes successfully")
	check(absf(float(state.progress.position[1]) - float(raw_position[1])) <= 1.0 / 1024.0, "Canonical save preserves raw physics position within one millimetre")
	var loaded = _new_state()
	check(loaded.load_game(), "Native save loads from disk")
	check(loaded.progress == state.progress, "Actual disk save preserves progress")

func _key(code: Key, pressed: bool) -> void:
	var event = InputEventKey.new()
	event.physical_keycode = code
	event.keycode = code
	event.pressed = pressed
	Input.parse_input_event(event)

func _frames(count: int) -> void:
	for index in range(count):
		await physics_frame
		await process_frame

func _test_world() -> void:
	var script = load("res://scripts/world.gd")
	var world = script.new()
	root.add_child(world)
	var fixture = {"id": "town", "width": 26, "depth": 26, "spawn": [0, 5], "objects": [{"id": "solid-test-crate", "wordId": "crate", "x": 0, "z": 0, "size": [2, 2, 2], "solid": true}], "npcs": [{"id": "mika", "x": 7, "z": 4, "route": [[10, 4], [7, 4]]}], "portals": [], "traffic": [{"id": "test-car", "wordId": "car", "speed": 4, "route": [[-10, -7], [10, -7]], "loop": true}], "districts": [{"id": "garden", "name": "Garden", "x": 8, "z": 8}]}
	world.setup(fixture, words, "de", {"mika": {"id": "mika", "name": "Mika", "color": "df9b85"}})
	world.interaction_requested.connect(func(kind, id): interaction_events.append([kind, id]))
	await _frames(8)
	var initial: Vector3 = world.get_player_position()
	check(absf(initial.y) < 0.15, "Actual capsule rests on the physical floor")
	world.focus_object("solid-test-crate")
	world.move_to_district("garden")
	check(world.get_player_position().distance_to(initial) < 0.01, "Selecting an object or district never teleports the player")
	_key(KEY_E, true)
	await _frames(2)
	_key(KEY_E, false)
	check(interaction_events.is_empty(), "E cannot interact with a distant object")
	var npc_start: Vector3 = world.actor_nodes.mika.position
	var car_start: Vector3 = world._traffic[0].node.position
	# Return from the map overview without changing the physical avatar position.
	_key(KEY_HOME, true)
	_key(KEY_HOME, false)
	_key(KEY_W, true)
	await _frames(100)
	_key(KEY_W, false)
	await _frames(10)
	var stopped: Vector3 = world.get_player_position()
	check(stopped.z < initial.z - 1.0, "Actual WASD input moves the controllable avatar")
	check(stopped.z >= 1.25, "Avatar cannot walk through a solid crate")
	check(world.actor_nodes.mika.position.distance_to(npc_start) > 0.05, "NPC follows its actual walking route")
	check(world._traffic[0].node.position.distance_to(car_start) > 0.5, "Traffic advances along its authored street route")
	check(world.get_interaction_distance("object", "solid-test-crate") < 2.4, "Nearby object has a real proximity distance")
	_key(KEY_E, true)
	await _frames(2)
	_key(KEY_E, false)
	check(interaction_events.has(["object", "solid-test-crate"]), "E activates the nearby physical object")
	world.set_active(false)
	await _frames(12)
	var paused: Vector3 = world.get_player_position()
	_key(KEY_D, true)
	await _frames(12)
	_key(KEY_D, false)
	check(world.get_player_position().distance_to(paused) < 0.05, "Paused/modal world suppresses movement")
	world.queue_free()
	await process_frame

func _test_authored_worlds() -> void:
	var script = load("res://scripts/world.gd")
	var definitions: Dictionary = {}
	for npc in town.get("npcs", []):
		definitions[str(npc.id)] = npc
	for place in maps.values():
		var world = script.new()
		root.add_child(world)
		world.setup(place, words, "de", definitions)
		await _frames(3)
		var diagnostics: Dictionary = world.get_diagnostics()
		check(diagnostics.unknownWords.is_empty(), "Every real object and model part has vocabulary: " + str(place.id))
		check(int(diagnostics.authoredObjects) == place.objects.size(), "All authored objects are built: " + str(place.id))
		check(int(diagnostics.npcs) == place.get("npcs", []).size(), "Every assigned NPC is instantiated: " + str(place.id))
		check(world.player is CharacterBody3D and world.player.get_child_count() >= 2, "Avatar has a visible rig and collider: " + str(place.id))
		check(absf(world.get_player_position().y) < 0.2, "Spawn rests on the floor: " + str(place.id))
		var unique: Dictionary = {}
		for record in world.get_objects():
			check(not unique.has(str(record.instanceId)), "Real object instance IDs are unique: " + str(place.id) + "/" + str(record.instanceId))
			unique[str(record.instanceId)] = true
		world.queue_free()
		await process_frame

func _test_audio() -> void:
	var script = load("res://scripts/ambience.gd")
	var audio = script.new()
	root.add_child(audio)
	audio.setup()
	for place in maps.values():
		audio.play_environment(str(place.ambience))
		await _frames(2)
		var diagnostics: Dictionary = audio.get_diagnostics()
		check(str(diagnostics.get("environment", "")) == str(place.ambience), "Correct environment audio loads: " + str(place.id))
		check(int(diagnostics.get("playingLoops", 0)) >= 1, "Environment audio actually starts: " + str(place.id))
	audio.set_enabled(false)
	await _frames(8)
	audio.queue_free()
	await _frames(3)

func _render_game() -> void:
	var scene = load("res://main.tscn")
	check(scene != null, "Actual native main scene loads")
	if scene == null:
		quit(1)
		return
	var game = scene.instantiate()
	root.add_child(game)
	await _frames(90)
	await RenderingServer.frame_post_draw
	var path = OS.get_environment("THING_LING_SCREENSHOT")
	if path.is_empty():
		path = "/tmp/thing-ling-native-preview.png"
	var image = root.get_texture().get_image()
	check(image != null and image.get_width() >= 1000, "Actual native framebuffer is rendered")
	if image != null:
		check(image.save_png(path) == OK, "Save actual native rendered screenshot")
	print("NATIVE_RENDER " + JSON.stringify({"passed": failures.is_empty(), "screenshot": path, "width": image.get_width() if image != null else 0, "height": image.get_height() if image != null else 0, "failures": failures}))
	quit(0 if failures.is_empty() else 1)
