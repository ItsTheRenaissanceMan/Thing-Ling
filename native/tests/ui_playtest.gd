extends SceneTree
## Real native Controls, loaded scenes and rendering. This never injects a win.
var app
var failures: Array[String] = []
var checks = 0
const OUTPUT = "res://test-output/"
func _initialize() -> void:
	call_deferred("run")
func check(value: bool, description: String) -> void:
	checks += 1
	if not value:
		failures.append(description)
		push_error("UI TEST: " + description)
func frames(count: int = 3) -> void:
	for index in range(count):
		await process_frame
func screenshot(name: String) -> void:
	await frames(3)
	if DisplayServer.get_name() != "headless":
		root.get_texture().get_image().save_png(OUTPUT + name + ".png")
func button_with_text(node: Node, text: String) -> Button:
	if node is Button:
		if str(node.text).contains(text):
			return node
		for label in node.find_children("*", "Label", true, false):
			if str(label.text).contains(text):
				return node
	for child in node.get_children():
		var found = button_with_text(child, text)
		if found:
			return found
	return null
func node_named(node: Node, target: String) -> Node:
	if str(node.name) == target:
		return node
	for child in node.get_children():
		var found = node_named(child, target)
		if found:
			return found
	return null
func press(text: String) -> bool:
	var button: Button = button_with_text(app.overlay if is_instance_valid(app.overlay) else app.menu if is_instance_valid(app.menu) else app.hud, text)
	check(button != null, "Real button exists: " + text)
	if not button:
		return false
	check(not button.disabled, "Button is enabled: " + text)
	if button.disabled:
		return false
	button.pressed.emit()
	await frames(3)
	return true
func near_npc(id: String) -> void:
	check(app.world.actor_nodes.has(id), "NPC exists in the actual scene: " + id)
	if not app.world.actor_nodes.has(id):
		return
	app.world.set_player_position(app.world.actor_nodes[id].position + Vector3(0, 0.1, 0.9))
	await physics_frame
	await physics_frame
	app._on_interaction("npc", id)
	await frames()
func use_door(target: String) -> void:
	app._close_modal()
	var portal: Dictionary = {}
	for candidate in app.world.portal_records:
		if str(candidate.target) == target:
			portal = candidate
			break
	check(not portal.is_empty(), "Physical doorway exists to " + target)
	if portal.is_empty():
		return
	app.world.set_player_position(Vector3(float(portal.x), 0.1, float(portal.z) + 0.15))
	await frames(5)
	var nearest: Dictionary = app.world.get_nearest_interaction()
	check(str(nearest.get("kind", "")) == "portal" and str(nearest.get("id", "")) == str(portal.id), "E prioritizes the nearby doorway to " + target)
	var event = InputEventKey.new()
	event.physical_keycode = KEY_E
	event.keycode = KEY_E
	event.pressed = true
	Input.parse_input_event(event)
	await frames(2)
	event = InputEventKey.new()
	event.physical_keycode = KEY_E
	event.keycode = KEY_E
	event.pressed = false
	Input.parse_input_event(event)
	for index in range(180):
		if not app.transitioning and str(app.state.progress.mapId) == target:
			break
		await process_frame
	check(str(app.state.progress.mapId) == target and not app.transitioning, "E enters and finishes loading " + target)
	await frames(5)
func find_activity(node: Node):
	if node.get_script() == load("res://scripts/activities.gd"):
		return node
	for child in node.get_children():
		var found = find_activity(child)
		if found:
			return found
	return null
func key_press(code: Key) -> void:
	var event = InputEventKey.new()
	event.physical_keycode = code
	event.keycode = code
	event.pressed = true
	Input.parse_input_event(event)
	await frames(2)
	event = InputEventKey.new()
	event.physical_keycode = code
	event.keycode = code
	event.pressed = false
	Input.parse_input_event(event)
	await frames(3)
func collect_product(word_id: String, count: int) -> void:
	app._close_modal()
	var record: Dictionary = {}
	for candidate in app.world.get_objects():
		if str(candidate.wordId) == word_id and not str(candidate.instanceId).contains(":"):
			record = candidate
			break
	check(not record.is_empty(), "A stocked physical shelf product exists: " + word_id)
	if record.is_empty():
		return
	app.world.set_player_position(Vector3(float(record.x) + 0.8, 0.1, float(record.z) + 1.0))
	await physics_frame
	app._on_interaction("object", str(record.instanceId))
	await frames()
	var amounts = app.overlay.find_children("*", "SpinBox", true, false)
	check(amounts.size() == 1, "A physical shelf interaction allows measured quantities: " + word_id)
	if amounts.size() == 1:
		amounts[0].value = count
	await press("Pick up these items")
	check(app.state.inventory_count(word_id) >= count, "Collected groceries enter the real persistent bag: " + word_id)
func finish_customer_checkout(activity) -> void:
	var rules = load("res://scripts/activity_rules.gd")
	var lesson: Dictionary = rules.get_challenge(activity.get_state())
	await press(str(lesson.translations.de.answer))
	var basket: Dictionary = activity.get_state().basket.duplicate(true)
	for id in basket:
		for index in range(int(basket[id])):
			await press(str(app.state.words[id].translations.de.text))
	check(str(activity.get_state().stage) == "payment", "Physical groceries can all be scanned at checkout")
	var inputs = activity.find_children("*", "LineEdit", true, false)
	check(inputs.size() == 1, "Customer checkout offers exact payment input")
	if inputs.size() == 1:
		inputs[0].text = str(rules.total_for(basket))
		await press("Check the amount")
	check(str(activity.get_state().stage) == "complete", "Exact customer payment completes the shopping trip")
	await press("Finish and return to my host")
func finish_almanac_shift() -> void:
	var activity = find_activity(app.overlay)
	check(activity != null, "NPC opens an actual Almanac workbench")
	if activity == null:
		return
	var rules = load("res://scripts/activity_rules.gd")
	for attempt in range(100):
		var current: Dictionary = activity.get_state()
		if str(current.stage) == "complete":
			break
		if str(current.stage) == "grammar":
			var lesson: Dictionary = rules.get_challenge(current)
			await press(str(lesson.translations.de.answer))
			continue
		var task: Dictionary = rules.current_task(current)
		match str(task.get("type", "")):
			"choice":
				for option in task.options:
					if str(option.value) == str(task.answer):
						await press(str(option.label))
						break
			"sequence":
				var operation: String = str(task.sequence[int(current.sequence_index)])
				await press(str(task.get("labels", {}).get(operation, operation)))
			"number":
				var inputs = activity.find_children("*", "LineEdit", true, false)
				check(inputs.size() == 1, "Almanac arithmetic offers a real text input")
				if inputs.size() == 1:
					inputs[0].text = str(task.answer)
					await press("Check the amount")
			"set":
				for id in task.answer:
					await press(str(app.state.words[id].translations.de.text))
				await press("Check this set")
			_:
				check(false, "Almanac has a supported, playable task: " + str(task))
				break
	check(str(activity.get_state().stage) == "complete", "Three Almanac requests complete through their actual buttons")
	await press("Finish and return to my host")
func run() -> void:
	# The test machine has no speech-dispatcher service. Exercise the written
	# fallback without asking the Linux backend to initialize an absent synth.
	ProjectSettings.set_setting("audio/general/text_to_speech", false)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUTPUT))
	app = load("res://main.tscn").instantiate()
	root.add_child(app)
	await frames(5)
	app.state.saves = {}
	app.state.language = "de"
	app.state.progress = app.state.fresh_progress("de")
	check(is_instance_valid(app.menu), "Native title menu is visible")
	await screenshot("01-native-title")
	await app._resume_game()
	await frames(5)
	check(app.started and app.state.progress.mapId == "town", "Start loads the actual town")
	check(app.world.get_diagnostics().get("player", {}) != null, "Actual player is instantiated")
	await screenshot("02-town-walking")
	var before_xp = int(app.state.progress.xp)
	var before_bag = app.state.progress.inventory.duplicate(true)
	app._show_objects()
	await frames()
	var seen: Dictionary = {}
	var unique: Dictionary = {}
	for object in app.world.get_objects():
		unique[str(object.wordId)] = true
	for id in unique:
		var widget = node_named(app.overlay, "ObjectType_" + str(id))
		check(widget != null, "Objects here contains one card for " + str(id))
		seen[id] = true
	check(seen.size() == unique.size(), "Object directory has unique noun types")
	check(app.state.progress.inventory == before_bag and int(app.state.progress.xp) == before_xp, "Opening object names cannot collect items or award XP")
	await screenshot("03-unique-object-directory")
	app._close_modal()
	await near_npc("theo")
	await screenshot("04-neighbor-conversation")
	await press("I’ll help")
	check(app.state.quest_status("little-hello") == "active", "Theo actually assigns the opening quest")
	check(int(app.state.progress.quests.get("little-hello", {}).get("stage", -1)) == 1, "Accepting and discussing the briefing completes only the initial talk")
	app._close_modal()
	await use_door("little-hello")
	await screenshot("05-almanac-interior")
	for word_id in ["apple", "flower", "book"]:
		var record: Dictionary = {}
		for candidate in app.world.get_objects():
			if str(candidate.wordId) == word_id and not str(candidate.instanceId).contains(":"):
				record = candidate
				break
		check(not record.is_empty(), "Physical mission item exists: " + word_id)
		if record.is_empty():
			continue
		app.world.set_player_position(Vector3(float(record.get("x", 0)), 0.1, float(record.get("z", 0))) + Vector3(0.7, 0, 0.7))
		await physics_frame
		app._on_interaction("object", str(record.instanceId))
		await frames()
		await press("Pick up these items")
		check(app.state.inventory_count(word_id) >= 1, "Actual object interaction adds to the bag: " + word_id)
	check(int(app.state.progress.quests["little-hello"].stage) == 4, "Three physical collections reach the full-sentence conversation")
	await near_npc("theo")
	await press("Say it in a full sentence")
	var challenge = load("res://scripts/language.gd").get_challenge("hello-request", 1)
	await screenshot("06-sentence-grammar")
	var expected: String = str(challenge.translations.de.answer)
	await press(expected)
	check(int(app.state.progress.quests["little-hello"].stage) == 5, "A real full-sentence answer with the correct NPC advances the campaign")
	await press("Continue the conversation")
	await press("Work a shift")
	await finish_almanac_shift()
	check(int(app.state.progress.quests["little-hello"].stage) == 6, "A finished real work shift advances the physical mission")
	await use_door("town")
	await near_npc("theo")
	await press("Hand over:")
	check(app.state.quest_status("little-hello") == "complete", "Returning to the actual town NPC completes the whole opening mission")
	check(app.state.inventory_count("book") == 0, "The physical handover consumes the borrowed book")
	await screenshot("12-completed-first-mission")
	app._close_modal()
	# Review via the live controller: every answer must save once, including a
	# mid-session close, and finish events cannot duplicate the cumulative reward.
	var review_xp: int = int(app.state.progress.xp)
	app._open_review("choice", "apple")
	await frames()
	for index in range(5):
		await press(str(app.state.words.apple.translations.de.text))
		check(int(app.state.progress.xp) == review_xp + (index + 1) * 8, "Review progress applies each effort reward once")
		await press("Finish practice" if index == 4 else "Continue")
	check(int(app.state.progress.learned.apple.mastery) == 1, "Repeated early reviews retain the first due mastery and schedule")
	await screenshot("13-native-spaced-review")
	await press("Return to your adventure")
	app._close_modal()
	# Test remote work rejection, then open the cafe from a nearby real resident.
	await app._load_map("lantern-cafe")
	await frames(5)
	await screenshot("07-cafe-interior")
	var ids: Array = app.world.actor_nodes.keys()
	check(not ids.is_empty(), "Cafe has resident workers")
	if not ids.is_empty():
		await near_npc(str(ids[0]))
		await press("Work a shift")
		await screenshot("08-cafe-drink-job")
		check(node_named(app.overlay, "Dialog") != null, "The playable workbench remains in a native dialog")
	app._close_modal()
	await app._load_map("supermarket")
	await frames(5)
	await screenshot("09-supermarket-aisles")
	var position_before_view: Vector3 = app.world.get_player_position()
	await key_press(KEY_F)
	check(app.world.get_camera_mode() == "first-person", "The actual F key selects first-person shopping view")
	check(not app.world.player.rig.visible, "First-person view hides the third-person avatar")
	check(app.world.get_player_position().distance_to(position_before_view) < 0.05, "Changing view does not move the character")
	app.world.set_player_position(Vector3(0, 0.05, 5))
	await frames(5)
	await screenshot("14-first-person-shopping")
	await key_press(KEY_F)
	check(app.world.get_camera_mode() == "follow" and app.world.player.rig.visible, "F returns to the same controllable walking avatar")
	ids = app.world.actor_nodes.keys()
	if not ids.is_empty():
		await near_npc(str(ids[0]))
		await press("Shop as a customer")
		await screenshot("10-customer-shopping")
		await press("Take this list into the shop")
		var shopping: Dictionary = app.state.progress.shopping.duplicate(true)
		check(not shopping.get("items", {}).is_empty(), "The shopkeeper pins a real shopping list without supplying it")
		for id in shopping.get("items", {}):
			var missing: int = maxi(0, int(shopping.items[id]) - app.state.inventory_count(str(id)))
			if missing > 0:
				await collect_product(str(id), missing)
		await near_npc(str(ids[0]))
		await press("Shop as a customer")
		var activity = find_activity(app.overlay)
		check(activity != null, "Returning to the real shopkeeper opens checkout with the collected bag")
		if activity != null:
			await finish_customer_checkout(activity)
		check(app.state.progress.shopping.is_empty(), "Successful physical shopping clears the completed HUD list")
		check(int(app.state.progress.jobs.get("supermarket", {}).get("shifts", 0)) == 1, "The real shopping trip records one completed job")
		await screenshot("15-completed-shopping")
	app._close_modal()
	var exported: Dictionary = app.state.export_payload()
	check(app.state.save_game(), "Actual native UI progress writes to disk")
	var other = load("res://scripts/game_state.gd").new()
	other.setup(app.state.data, app.state.story, {"words": app.state.words.values()})
	check(other.load_game(), "A new native state loads the disk save")
	if other.progress != app.state.progress:
		for key in app.state.progress:
			if other.progress.get(key) != app.state.progress[key]:
				print("NATIVE_UI_SAVE_DIFF ", key, " live=", var_to_str(app.state.progress[key]), " disk=", var_to_str(other.progress.get(key)))
	check(other.progress == app.state.progress, "Native save restores map, mission progress and bag exactly")
	await app._load_map("harbor-lanterns")
	await frames(5)
	await screenshot("11-lighthouse-interior")
	app._close_modal()
	app.world.set_active(false)
	var report = {"passed": failures.is_empty(), "checks": checks, "failures": failures, "renderer": DisplayServer.get_name(), "screenshots": ProjectSettings.globalize_path(OUTPUT), "nativeWindowsExecuted": false}
	var out = FileAccess.open(OUTPUT + "ui-report.json", FileAccess.WRITE)
	out.store_string(JSON.stringify(report, "\t"))
	out.close()
	print("NATIVE_UI_PLAYTEST " + JSON.stringify(report))
	app.queue_free()
	app = null
	await frames(10)
	quit(0 if failures.is_empty() else 1)
