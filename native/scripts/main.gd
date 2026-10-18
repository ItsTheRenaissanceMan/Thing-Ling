extends Node
## Native desktop game controller. No browser, HTTP server, or remote account.
const State = preload("res://scripts/game_state.gd")
const World = preload("res://scripts/world.gd")
const Language = preload("res://scripts/language.gd")
const Ambience = preload("res://scripts/ambience.gd")
const Activities = preload("res://scripts/activities.gd")
const ActivityRules = preload("res://scripts/activity_rules.gd")
const Review = preload("res://scripts/review.gd")
const CREAM = Color("faf6e9")
const INK = Color("304b40")
const MUTED = Color("6b8072")
const GREEN = Color("dbe9c5")
const LANG_NAMES = ["Deutsch · German", "日本語 · Japanese", "Español · Spanish", "中文 · Chinese"]
var state = State.new()
var world
var ambience
var npc_defs: Dictionary = {}
var ui: CanvasLayer
var hud: Control
var menu: Control
var overlay: Control
var loading: Control
var toast_label: Label
var modal_body: VBoxContainer
var quest_label: Label
var status_label: Label
var interaction_label: Label
var location_label: Label
var inventory_label: Label
var shopping_label: Label
var language_select: OptionButton
var cjk_font: Font
var started = false
var transitioning = false
var refresh_timer = 0.0
var autosave_timer = 0.0
var toast_timer = 0.0
var elapsed_seconds = 0.0
var instance_stock: Dictionary = {}
var active_npc = ""
var active_job = ""
var challenge_callback: Callable
var dialogue_history: Array = []
var _challenge_attempts = 0
var _job_serial = 0
var _bootstrap_ok = false
var _review_xp = 0
var _review_coins = 0
var _review_id = ""

func _ready() -> void:
	var town: Dictionary = _json("res://data/town.json")
	var curriculum: Dictionary = _json("res://data/story.json")
	var vocab: Dictionary = _json("res://data/vocabulary.json")
	state.setup(town, curriculum, vocab)
	for npc in town.get("npcs", []):
		npc_defs[str(npc.id)] = npc
	state.load_game()
	if ResourceLoader.exists("res://assets/NotoSansCJKsc-Regular.otf"):
		cjk_font = load("res://assets/NotoSansCJKsc-Regular.otf")
	ui = CanvasLayer.new()
	ui.layer = 5
	add_child(ui)
	var theme = Theme.new()
	theme.default_font_size = 15
	if cjk_font:
		theme.default_font = cjk_font
	var base = Control.new()
	base.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	base.theme = theme
	ui.add_child(base)
	hud = Control.new()
	hud.name = "GameHUD"
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	base.add_child(hud)
	_build_hud()
	ambience = Ambience.new()
	add_child(ambience)
	ambience.setup()
	ambience.set_volume(float(state.settings.volume))
	ambience.set_enabled(bool(state.settings.sound))
	toast_label = _label("", 16)
	toast_label.name = "Toast"
	toast_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	toast_label.position = Vector2(-350, 100)
	toast_label.custom_minimum_size = Vector2(700, 60)
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.add_theme_stylebox_override("normal", _box(GREEN, 12, 12))
	toast_label.hide()
	base.add_child(toast_label)
	_bootstrap_ok = not town.is_empty() and not curriculum.is_empty() and not vocab.is_empty()
	_show_menu()
	get_tree().auto_accept_quit = false

func _json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("Missing game content: " + path)
		return {}
	var value = JSON.parse_string(FileAccess.get_file_as_string(path))
	return value if value is Dictionary else {}

func _box(color: Color, radius: int = 12, padding: int = 16) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(radius)
	style.set_content_margin_all(padding)
	style.border_color = Color("d4ddc9")
	style.set_border_width_all(1)
	return style

func _label(text: String, size: int = 15, color: Color = INK) -> Label:
	var item = Label.new()
	item.text = text
	item.add_theme_font_size_override("font_size", size)
	item.add_theme_color_override("font_color", color)
	item.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	item.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return item

func _button(text: String, action: Callable, primary: bool = false) -> Button:
	var item = Button.new()
	item.text = text
	item.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	item.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	item.custom_minimum_size = Vector2(0, 43)
	item.add_theme_color_override("font_color", INK)
	item.add_theme_color_override("font_hover_color", INK)
	item.add_theme_color_override("font_pressed_color", INK)
	item.add_theme_stylebox_override("normal", _box(GREEN if primary else Color("fffdf5"), 9, 10))
	item.add_theme_stylebox_override("hover", _box(Color("e7edda"), 9, 10))
	item.add_theme_stylebox_override("pressed", _box(Color("c9dbaf"), 9, 10))
	item.add_theme_stylebox_override("disabled", _box(Color("e9e9df"), 9, 10))
	item.pressed.connect(action)
	item.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	return item

func _row(parent: Node) -> HBoxContainer:
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	parent.add_child(row)
	return row

func _card(parent: Node) -> VBoxContainer:
	var panel = PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _box(CREAM))
	parent.add_child(panel)
	var column = VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	panel.add_child(column)
	return column

func _build_hud() -> void:
	var top = PanelContainer.new()
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	top.offset_bottom = 74
	top.add_theme_stylebox_override("panel", _box(Color("faf8ee"), 0, 14))
	hud.add_child(top)
	var bar = _row(top)
	var brand = _label("thing ling.", 26)
	bar.add_child(brand)
	language_select = OptionButton.new()
	for title in LANG_NAMES:
		language_select.add_item(title)
	language_select.select(State.LANGUAGES.find(state.language))
	language_select.item_selected.connect(_switch_language)
	bar.add_child(language_select)
	bar.add_child(_button("Journal [J]", _show_journal))
	bar.add_child(_button("Town guide [Tab]", _show_guide))
	bar.add_child(_button("Bag [I]", _show_inventory))
	bar.add_child(_button("Settings", _show_settings))
	var bottom = PanelContainer.new()
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom.offset_top = -70
	bottom.add_theme_stylebox_override("panel", _box(Color("faf8ee"), 0, 14))
	hud.add_child(bottom)
	var footer = _row(bottom)
	status_label = _label("")
	footer.add_child(status_label)
	footer.add_child(_button("Objects here", _show_objects))
	footer.add_child(_button("Wordbook", _show_wordbook))
	footer.add_child(_button("Labels [L]", _toggle_labels))
	footer.add_child(_button("Pause [Esc]", _show_menu))
	var rail = VBoxContainer.new()
	rail.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	rail.offset_left = -333
	rail.offset_right = -20
	rail.offset_top = 96
	rail.add_theme_constant_override("separation", 10)
	hud.add_child(rail)
	var location = _card(rail)
	location.add_child(_label("YOUR CORNER OF THE TOWN", 11, MUTED))
	location_label = _label("Lantern Town", 23)
	location.add_child(location_label)
	var quest = _card(rail)
	quest.add_child(_label("THE NEXT PART OF YOUR STORY", 11, MUTED))
	quest_label = _label("Meet Theo in the Old Village.\n\nWalk with WASD or the arrow keys. Hold Shift to run. Stand near someone and press E to talk.", 14)
	quest.add_child(quest_label)
	quest.add_child(_button("Open my journal", _show_journal))
	var shopping = _card(rail)
	shopping_label = _label("Your bag starts empty. Pick up supplies and groceries by walking to them and pressing E.", 13, MUTED)
	shopping.add_child(shopping_label)
	var prompt_panel = PanelContainer.new()
	prompt_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	prompt_panel.offset_left = 22
	prompt_panel.offset_right = 680
	prompt_panel.offset_top = -166
	prompt_panel.offset_bottom = -86
	prompt_panel.add_theme_stylebox_override("panel", _box(Color(0.98, 0.97, 0.92, 0.94)))
	hud.add_child(prompt_panel)
	interaction_label = _label("WASD / arrows: walk   ·   Shift: run   ·   E: interact\nRight-drag: camera   ·   Wheel: zoom   ·   F: first person   ·   M: overview", 14)
	prompt_panel.add_child(interaction_label)

func _show_menu() -> void:
	_close_modal()
	if world:
		world.set_active(false)
	hud.hide()
	if is_instance_valid(menu):
		menu.queue_free()
	menu = Control.new()
	menu.name = "MainMenu"
	menu.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.get_child(0).add_child(menu)
	var backdrop = ColorRect.new()
	backdrop.color = Color(0.83, 0.89, 0.81, 0.93)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	menu.add_child(backdrop)
	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	menu.add_child(center)
	var card = _card(center)
	card.custom_minimum_size = Vector2(680, 0)
	card.add_child(_label("THING LING   /   NATIVE DESKTOP EDITION", 12, MUTED))
	card.add_child(_label("A whole town.\nA language of your own.", 43))
	card.add_child(_label("Walk the old village, garden and harbor. Meet the residents, step inside every building, and learn by living a little life here.", 17))
	var facts: String = "%d places to explore  ·  %d neighbors  ·  %d discoverable words" % [state.maps.size(), npc_defs.size(), state.words.size()]
	card.add_child(_label(facts, 14, MUTED))
	var language_row = _row(card)
	language_row.add_child(_label("I’m learning"))
	var select = OptionButton.new()
	for text in LANG_NAMES:
		select.add_item(text)
	select.select(State.LANGUAGES.find(state.language))
	select.item_selected.connect(func(index): _switch_language(index); _show_menu())
	language_row.add_child(select)
	var name_row = _row(card)
	name_row.add_child(_label("My character’s name"))
	var name_input = LineEdit.new()
	name_input.text = str(state.settings.name)
	name_input.max_length = 30
	name_input.custom_minimum_size = Vector2(280, 40)
	name_input.text_changed.connect(func(value): state.settings.name = value if not value.strip_edges().is_empty() else "You")
	name_row.add_child(name_input)
	card.add_child(_button("Continue my adventure" if started or not state.progress.quests.is_empty() else "Start my adventure", _resume_game, true))
	card.add_child(_button("How to play", _show_help))
	var buttons = _row(card)
	buttons.add_child(_button("Settings & backups", _show_settings))
	buttons.add_child(_button("Save and quit", _quit))
	card.add_child(_label("Your adventure lives on this PC, separately for each language. No account, subscription or connection required.", 12, MUTED))
	if not _bootstrap_ok:
		card.add_child(_label("Game content is missing. Please extract the complete download and launch the executable again.", 14, Color("a84e43")))

func _resume_game() -> void:
	if not _bootstrap_ok:
		return
	if is_instance_valid(menu):
		menu.queue_free()
	menu = null
	hud.show()
	started = true
	if not world:
		var p: Array = state.progress.get("position", [0, 0, 3])
		await _load_map(str(state.progress.mapId), [float(p[0]), float(p[2])], true)
	else:
		world.set_active(true)
		if world.has_method("set_avatar"):
			world.set_avatar(state.settings)
	_refresh_hud()

func _load_map(id: String, spawn: Array = [], preserve_height: bool = false) -> void:
	if transitioning or not state.maps.has(id):
		return
	transitioning = true
	_close_modal()
	if world:
		world.set_active(false)
	loading = Control.new()
	loading.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	loading.mouse_filter = Control.MOUSE_FILTER_STOP
	ui.get_child(0).add_child(loading)
	var shade = ColorRect.new()
	shade.color = CREAM
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	loading.add_child(shade)
	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	loading.add_child(center)
	var content = VBoxContainer.new()
	content.custom_minimum_size = Vector2(650, 0)
	center.add_child(content)
	content.add_child(_label("A LITTLE CHANGE OF SCENERY", 13, MUTED))
	content.add_child(_label(str(state.maps[id].name), 37))
	content.add_child(_label("Opening the door, finding the neighbors, and putting every little thing in its place…", 17))
	content.add_child(_label("Walk with WASD. Press E near objects, people and doors. Your conversations, bag and favor progress travel with you.", 14, MUTED))
	await get_tree().create_timer(0.12).timeout
	if is_instance_valid(world):
		world.queue_free()
		await get_tree().process_frame
	world = World.new()
	world.name = "NativeWorld"
	add_child(world)
	state.progress.mapId = id
	var entry: Array = spawn if spawn.size() >= 2 else state.maps[id].get("spawn", [0, 0])
	world.setup(state.maps[id], state.words, state.language, npc_defs, entry)
	if cjk_font and world.has_method("set_font"):
		world.set_font(cjk_font)
	world.set_labels(bool(state.settings.labels))
	if world.has_method("set_avatar"):
		world.set_avatar(state.settings)
	world.interaction_requested.connect(_on_interaction)
	world.district_changed.connect(func(district): _refresh_hud())
	world.player_moved.connect(_on_player_moved)
	world.set_active(true)
	ambience.play_environment(str(state.maps[id].get("ambience", id)))
	ambience.play_effect("door")
	instance_stock.clear()
	await get_tree().process_frame
	loading.queue_free()
	loading = null
	transitioning = false
	_save()
	_refresh_hud()
	if not preserve_height:
		_toast("Welcome to " + str(state.maps[id].name) + ". Find a neighbor or a workstation to begin.")

func _on_player_moved(_position: Vector3) -> void:
	if ambience:
		ambience.play_effect("footstep")

func _process(delta: float) -> void:
	if not started:
		return
	refresh_timer += delta
	autosave_timer += delta
	elapsed_seconds += delta
	if toast_timer > 0:
		toast_timer -= delta
		if toast_timer <= 0 and is_instance_valid(toast_label):
			toast_label.hide()
	if refresh_timer >= 0.25:
		refresh_timer = 0
		_update_prompt()
	if elapsed_seconds >= 1:
		state.progress.play_seconds += int(elapsed_seconds)
		elapsed_seconds = 0
	if autosave_timer >= 20 and not transitioning:
		autosave_timer = 0
		_save()

func _update_prompt() -> void:
	if not world or not is_instance_valid(world) or is_instance_valid(overlay):
		return
	var near: Dictionary = world.get_nearest_interaction() if world.has_method("get_nearest_interaction") else {}
	if near.is_empty():
		interaction_label.text = "WASD / arrows: walk   ·   Shift: run   ·   E: interact\nRight-drag: camera   ·   Wheel: zoom   ·   F: first person   ·   M: overview"
	else:
		var kind: String = str(near.get("kind", "object"))
		var noun: String = str(near.get("name", near.get("label", near.get("id", "something"))))
		if kind == "npc":
			noun = str(npc_defs.get(str(near.get("id", "")), {}).get("name", noun))
		interaction_label.text = "[E] %s %s\nWalk closer to explore; nothing is collected from a name in a list." % ["Talk to" if kind == "npc" else "Enter" if kind == "portal" else "Interact with", noun]

func _on_interaction(kind: String, id: String) -> void:
	if transitioning or is_instance_valid(overlay):
		return
	if world.has_method("get_interaction_distance") and world.get_interaction_distance(kind, id) > 3.5:
		_toast("Walk closer and press E to interact.")
		return
	if kind == "portal":
		for portal in state.maps[state.progress.mapId].get("portals", []):
			if str(portal.id) == id:
				_load_map(str(portal.target), portal.get("spawn", []))
				return
	elif kind == "npc":
		active_npc = id
		_show_npc(id)
	else:
		for object in world.get_objects():
			if str(object.get("instanceId", object.get("id", ""))) == id:
				_show_word(str(object.wordId), id)
				return

func _refresh_hud() -> void:
	if not is_instance_valid(status_label):
		return
	var completed = 0
	for record in state.progress.quests.values():
		if record.get("complete", false):
			completed += 1
	status_label.text = "%s  ·  Level %d  ·  %d XP  ·  %d coins  ·  %d words  ·  %d/%d favors" % [str(state.settings.name), state.level(), int(state.progress.xp), int(state.progress.coins), state.progress.learned.size(), completed, state.quests.size()]
	location_label.text = str(state.maps.get(str(state.progress.mapId), {}).get("name", "Lantern Town"))
	var quest_id: String = str(state.progress.get("activeQuest", ""))
	var step: Dictionary = state.current_step(quest_id)
	if step.is_empty():
		quest_label.text = "You brought the Community Almanac to life. Keep exploring, take harder shifts and try another language. Your town is yours to enjoy."
		for available_id in state.quests:
			if state.quest_status(str(available_id)) == "available":
				var available: Dictionary = state.quests[available_id]
				var giver: Dictionary = npc_defs.get(str(available.get("npcId", "")), {})
				quest_label.text = "%s\n\nTalk to %s outdoors in town to begin this favor.\n\nEvery building has a resident and a job. All the town’s doors are open to explore." % [str(available.title), str(giver.get("name", "your neighbor"))]
				break
	else:
		var record: Dictionary = state.progress.quests[quest_id]
		quest_label.text = "%s\n\n%d / %d steps\n%s\n\nWhere: %s" % [str(state.quests[quest_id].title), int(record.stage) + 1, state.quests[quest_id].steps.size(), str(step.get("text", "Help your neighbor.")), str(state.maps.get(str(step.get("mapId", "town")), {}).get("name", "Town"))]
	var shopping: Dictionary = state.progress.get("shopping", {})
	if shopping.is_empty():
		shopping_label.text = "Bag: %d kinds of supplies\nJobs adapt to your level. Difficulty %d / 3.\n\nTalk to a shopkeeper to work a shift or ask for a shopping list." % [state.progress.inventory.size(), state.difficulty()]
	else:
		var lines: Array[String] = ["MY SHOPPING LIST"]
		for word_id in shopping.get("items", {}):
			lines.append("%s  %d / %d" % [_english(str(word_id)), state.inventory_count(str(word_id)), int(shopping.items[word_id])])
		lines.append("Return to the supermarket cashier when your basket is ready.")
		shopping_label.text = "\n".join(lines)
	if is_instance_valid(language_select):
		language_select.select(State.LANGUAGES.find(state.language))

func _save() -> void:
	if is_instance_valid(world) and not transitioning:
		var position: Vector3 = world.get_player_position()
		state.progress.position = [position.x, position.y, position.z]
	if not state.save_game():
		_toast(state.last_error)

func _switch_language(index: int) -> void:
	if index < 0 or index >= State.LANGUAGES.size():
		return
	_save()
	state.switch_language(State.LANGUAGES[index])
	if started:
		var position: Array = state.progress.position
		_load_map(str(state.progress.mapId), [position[0], position[2]], true)
	state.save_game()
	_refresh_hud()

func _open_panel(title: String, subtitle: String = "", width: float = 940) -> VBoxContainer:
	_close_modal()
	if world:
		world.set_active(false)
	overlay = Control.new()
	overlay.name = "Dialog"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.get_child(0).add_child(overlay)
	var dim = ColorRect.new()
	dim.color = Color(0.12, 0.20, 0.17, 0.55)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(dim)
	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)
	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(minf(width, get_viewport().get_visible_rect().size.x - 50), 0)
	panel.add_theme_stylebox_override("panel", _box(CREAM, 16, 22))
	center.add_child(panel)
	var stack = VBoxContainer.new()
	stack.add_theme_constant_override("separation", 12)
	panel.add_child(stack)
	var header = _row(stack)
	header.add_child(_label(title, 27))
	header.add_child(_button("Close [Esc]", _close_modal))
	if not subtitle.is_empty():
		stack.add_child(_label(subtitle, 14, MUTED))
	stack.add_child(HSeparator.new())
	var scroll = ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(panel.custom_minimum_size.x - 44, minf(560, get_viewport().get_visible_rect().size.y - 245))
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	stack.add_child(scroll)
	modal_body = VBoxContainer.new()
	modal_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	modal_body.add_theme_constant_override("separation", 12)
	scroll.add_child(modal_body)
	return modal_body

func _close_modal() -> void:
	if is_instance_valid(overlay):
		if overlay.get_parent():
			overlay.get_parent().remove_child(overlay)
		overlay.queue_free()
	overlay = null
	modal_body = null
	_review_id = ""
	if started and not is_instance_valid(menu) and is_instance_valid(world) and not transitioning:
		world.set_active(true)

func _english(word_id: String) -> String:
	return str(state.words.get(word_id, {}).get("english", word_id))

func _translation(word_id: String) -> Dictionary:
	return state.words.get(word_id, {}).get("translations", {}).get(state.language, {"text": _english(word_id), "reading": ""})

func _show_word(word_id: String, instance_id: String = "") -> void:
	if not state.words.has(word_id):
		return
	var word: Dictionary = state.words[word_id]
	var translated: Dictionary = _translation(word_id)
	var physical: bool = not instance_id.is_empty() and is_instance_valid(world) and world.get_interaction_distance("object", instance_id) <= 3.5
	if physical:
		state.discover(word_id)
		_save()
	var body = _open_panel(_english(word_id).capitalize(), "A real object in " + str(state.maps[state.progress.mapId].name) if physical else "The wordbook is for looking and learning. Walk to an object to use or collect it.", 780)
	body.add_child(_label(str(translated.get("text", "")), 38))
	if str(translated.get("reading", "")) != "":
		body.add_child(_label(str(translated.reading), 18, MUTED))
	body.add_child(_label(_english(word_id) + "   ·   " + str(word.get("category", "")), 17))
	body.add_child(_button("Hear the pronunciation", func(): _speak(str(translated.get("text", "")))))
	body.add_child(_label("In your bag: %d" % state.inventory_count(word_id)))
	if state.progress.learned.has(word_id):
		body.add_child(_button("Practice this word", func(): _open_review("mixed", word_id)))
	if physical:
		for portal in state.maps[state.progress.mapId].get("portals", []):
			if world.get_interaction_distance("portal", str(portal.id)) <= 3.2:
				var entry: Dictionary = portal.duplicate(true)
				body.add_child(_button("Enter / leave: " + str(entry.label), func(): _load_map(str(entry.target), entry.get("spawn", [])), true))
		var needed: Dictionary = _matching_step("use", word_id)
		body.add_child(_button(str(needed.get("text", "Use / inspect this object")), func(): _use_object(word_id, instance_id), true))
		if _collectible(word_id, instance_id):
			var controls = _row(body)
			controls.add_child(_label("Take supplies / add groceries to your basket"))
			var quantity = SpinBox.new()
			quantity.min_value = 1
			quantity.max_value = mini(10, int(instance_stock.get(instance_id, 20)))
			quantity.value = 1
			controls.add_child(quantity)
			body.add_child(_button("Pick up these items", func(): _take_object(word_id, instance_id, int(quantity.value)), true))
		else:
			body.add_child(_label("This is part of the place, rather than something to put in your bag. You can inspect it and use it for a favor.", 14, MUTED))
	else:
		body.add_child(_label("No remote pickup: use WASD to walk to an instance and press E. Repeated instances appear only once in Objects here.", 14, MUTED))

func _collectible(word_id: String, instance_id: String) -> bool:
	# Supplies explicitly requested by an active favor must be carriable even
	# when other instances of that noun are part of the scenery (e.g. a lamp).
	if not _matching_step("collect", word_id).is_empty():
		return true
	for descriptor in state.maps[state.progress.mapId].get("objects", []):
		if str(descriptor.id) == instance_id and descriptor.has("collectible"):
			return bool(descriptor.collectible)
	return word_id not in ["house", "tree", "wall", "roof", "door", "window", "floor", "tile", "grass", "sand", "path", "mountain", "bridge", "lighthouse", "fountain", "shelf", "counter", "table", "chair", "sofa", "bed", "bench", "gate", "fence", "chimney", "sun", "moon", "star", "rain", "cloud", "car", "bus", "train", "boat", "piano", "guitar", "cat", "dog", "bird", "goat", "sheep", "cow", "horse", "pig", "hen", "rabbit", "oven", "stove", "refrigerator", "washingMachine", "sink", "toilet", "bathtub", "lamp", "trafficLight", "streetlight", "grass", "road"]

func _matching_step(kind: String, word_id: String = "", npc_id: String = "") -> Dictionary:
	for id in state.progress.quests:
		var step: Dictionary = state.current_step(str(id))
		if str(step.get("type", "")) == kind and str(step.get("mapId", state.progress.mapId)) == str(state.progress.mapId):
			if not word_id.is_empty() and str(step.get("wordId", "")) != word_id:
				continue
			if not npc_id.is_empty() and str(step.get("npcId", "")) != npc_id:
				continue
			return step
	return {}

func _take_object(word_id: String, instance_id: String, count: int) -> void:
	if not world or world.get_interaction_distance("object", instance_id) > 3.5:
		_toast("Walk closer to collect this item.")
		return
	var stock: int = int(instance_stock.get(instance_id, 20))
	if count < 1 or count > stock:
		_toast("There are not that many items here.")
		return
	instance_stock[instance_id] = stock - count
	var result: Dictionary = state.take_item(word_id, count)
	ambience.play_effect("collect")
	_close_modal()
	_after_event(result)
	_toast("Added %d × %s to your bag." % [count, _english(word_id)])

func _use_object(word_id: String, instance_id: String) -> void:
	if not world or world.get_interaction_distance("object", instance_id) > 3.5:
		return
	state.discover(word_id)
	var result: Dictionary = state.handle_event("use", {"wordId": word_id, "mapId": state.progress.mapId})
	_close_modal()
	ambience.play_effect("use")
	_after_event(result)
	if not result.get("changed", false):
		_toast("You inspected the " + _english(word_id) + ". Ask a neighbor how it helps with their work.")

func _after_event(result: Dictionary, dialogue_id: String = "", npc_id: String = "") -> void:
	_save()
	_refresh_hud()
	if not result.get("completed", []).is_empty():
		ambience.play_effect("success")
		var id: String = str(result.completed[0])
		var quest: Dictionary = state.quests[id]
		var body = _open_panel("A favor finished. A town brought closer.", str(quest.title), 800)
		if not dialogue_id.is_empty():
			var scene: Dictionary = Language.get_dialogue(npc_id, dialogue_id)
			for line in scene.get("lines", []):
				var line_text = line.get("text", {})
				body.add_child(_label(str(line_text.get(state.language, line.get("english", ""))) if line_text is Dictionary else str(line_text), 20))
				body.add_child(_label(str(line.get("english", "")), 13, MUTED))
		body.add_child(_label(str(quest.get("completion", "Your work, words and kindness have made a difference to your neighbors.")), 21))
		body.add_child(_label("+%d XP   ·   +%d coins\n\nThe next favors are waiting with your neighbors. Completed stories stay complete; work shifts can be replayed at greater difficulty." % [int(quest.get("reward", {}).get("xp", 90)), int(quest.get("reward", {}).get("coins", 20))]))
		body.add_child(_button("Back to my town", _close_modal, true))
	elif result.get("changed", false):
		ambience.play_effect("success")
		_toast("One step further. Your journal has the next part of the favor.")

func _show_npc(npc_id: String, dialogue_id: String = "") -> void:
	var npc: Dictionary = npc_defs.get(npc_id, {"name": npc_id, "role": "Neighbor"})
	var body = _open_panel(str(npc.name), str(npc.get("role", "Neighbor")) + " · " + str(state.maps[state.progress.mapId].name), 960)
	active_npc = npc_id
	if dialogue_id.is_empty():
		for quest_id in state.progress.quests:
			var narrative_step: Dictionary = state.current_step(str(quest_id))
			if str(narrative_step.get("npcId", "")) == npc_id and str(narrative_step.get("mapId", state.progress.mapId)) == str(state.progress.mapId):
				dialogue_id = str(narrative_step.get("dialogueId", ""))
				if not dialogue_id.is_empty():
					break
	body.add_child(_label(str(npc.get("bio", npc.get("personality", "A neighbor with a story to share."))), 14, MUTED))
	var conversations = state.story.get("dialogues", {}).get(npc_id, [])
	var conversation: Dictionary = {}
	if conversations is Array:
		for candidate in conversations:
			if conversation.is_empty() or str(candidate.get("id", "")) == dialogue_id:
				conversation = candidate
			if not dialogue_id.is_empty() and str(candidate.get("id", "")) == dialogue_id:
				break
	elif conversations is Dictionary:
		conversation = conversations
	for line in conversation.get("lines", []):
		var line_card = _card(body)
		line_card.add_child(_label(str(line.get("speaker", npc.name)), 11, MUTED))
		var translated = line.get("text", {})
		var text: String = str(translated.get(state.language, line.get("english", ""))) if translated is Dictionary else str(translated)
		line_card.add_child(_label(text, 20))
		if line.has("english"):
			line_card.add_child(_label(str(line.english), 13, MUTED))
	for response in conversation.get("responses", []):
		var response_text = response.get("text", {})
		var text: String = str(response_text.get(state.language, response.get("english", "Continue"))) if response_text is Dictionary else str(response_text)
		var captured: Dictionary = response.duplicate(true)
		body.add_child(_button(text, func(): _dialogue_response(npc_id, captured)))
	for quest_id in state.quests:
		var quest: Dictionary = state.quests[quest_id]
		var step: Dictionary = state.current_step(str(quest_id))
		if not step.is_empty() and str(step.get("npcId", "")) == npc_id and str(step.get("mapId", state.progress.mapId)) == str(state.progress.mapId):
			var stage_type: String = str(step.type)
			if stage_type == "deliver":
				var needed_count: int = int(step.get("quantity", 1))
				var item: String = str(step.get("wordId", ""))
				var deliver_button = _button("Hand over: " + str(step.get("text", _english(item))), func(): _deliver(npc_id, item), true)
				deliver_button.disabled = state.inventory_count(item) < needed_count
				body.add_child(deliver_button)
				body.add_child(_label("In your bag: %d / %d %s" % [state.inventory_count(item), needed_count, _english(item)], 13, MUTED))
			elif stage_type == "talk":
				body.add_child(_button(str(step.get("text", "Discuss the favor")), func(): _talk(npc_id), true))
			elif stage_type == "challenge":
				var challenge_id: String = str(step.challengeId)
				body.add_child(_button("Say it in a full sentence: " + str(step.get("text", "Continue the conversation")), func(): _show_challenge(challenge_id, func(): _show_npc(npc_id)), true))
		if str(quest.get("npcId", "")) == npc_id:
			var status: String = state.quest_status(str(quest_id))
			if status == "available" and str(quest.get("steps", [{}])[0].get("mapId", state.progress.mapId)) == str(state.progress.mapId):
				var offer = _card(body)
				offer.add_child(_label(str(quest.title), 20))
				offer.add_child(_label(str(quest.get("description", ""))))
				var captured_id: String = str(quest_id)
				offer.add_child(_button("I’ll help — accept this favor", func(): _accept_quest(captured_id, npc_id), true))
	var venue: String = str(state.progress.mapId)
	if venue != "town":
		body.add_child(HSeparator.new())
		body.add_child(_label("LEARN BY DOING", 12, MUTED))
		body.add_child(_label("Take a shift here. Listen to the customer, answer in sentences, and do the work. Jobs become harder as your level grows.", 14))
		body.add_child(_button("Work a shift · difficulty %d / 3" % state.difficulty(), func(): _open_activity(venue, "work"), true))
		if venue == "supermarket":
			body.add_child(_button("Shop as a customer — get a list / check out", func(): _open_activity(venue, "customer")))
	var challenge: String = str(conversation.get("challengeId", ""))
	if not challenge.is_empty():
		body.add_child(_button("Practice this conversation", func(): _show_challenge(challenge, func(): _show_npc(npc_id))))
	body.add_child(_button("Ask about my next favor", _show_journal))

func _dialogue_response(npc_id: String, response: Dictionary) -> void:
	var next_id: String = str(response.get("nextId", ""))
	var challenge_id: String = str(response.get("challengeId", ""))
	if not challenge_id.is_empty():
		_show_challenge(challenge_id, func(): _show_npc(npc_id, next_id))
	elif not next_id.is_empty():
		_show_npc(npc_id, next_id)
	else:
		_talk(npc_id)

func _accept_quest(id: String, npc_id: String) -> void:
	if state.accept_quest(id, npc_id):
		var step: Dictionary = state.current_step(id)
		var briefing_id: String = str(step.get("dialogueId", ""))
		if str(step.get("type", "")) == "talk" and str(step.get("npcId", "")) == npc_id:
			state.handle_event("talk", {"npcId": npc_id, "mapId": state.progress.mapId})
		_save()
		_refresh_hud()
		_show_npc(npc_id, briefing_id)
		_toast("Favor accepted. Follow its steps in your journal.")

func _talk(npc_id: String) -> void:
	var narrative: Dictionary = _matching_step("talk", "", npc_id)
	var dialogue_id: String = str(narrative.get("dialogueId", ""))
	var result: Dictionary = state.handle_event("talk", {"npcId": npc_id, "mapId": state.progress.mapId})
	_close_modal()
	_after_event(result)
	if not result.get("completed", []).is_empty():
		return
	if result.get("changed", false):
		_show_npc(npc_id, dialogue_id)
	else:
		_show_npc(npc_id)
		_toast("Ask about a favor, take a shift, or choose a conversation response.")

func _deliver(npc_id: String, word_id: String) -> void:
	var narrative: Dictionary = _matching_step("deliver", word_id, npc_id)
	var result: Dictionary = state.handle_event("deliver", {"npcId": npc_id, "wordId": word_id, "mapId": state.progress.mapId})
	_close_modal()
	_after_event(result, str(narrative.get("dialogueId", "")), npc_id)

func _show_challenge(id: String, after: Callable = Callable()) -> void:
	var challenge: Dictionary = Language.get_challenge(id, state.difficulty())
	if challenge.is_empty():
		_toast("This conversation is unavailable. Your task has not advanced.")
		return
	challenge_callback = after
	_challenge_attempts = 0
	var translated: Dictionary = challenge.get("translations", {}).get(state.language, {})
	var body = _open_panel("Find the words for the moment.", str(challenge.get("context", challenge.get("prompt", "A conversation with your neighbor."))), 980)
	body.add_child(_label(str(challenge.get("prompt", "Respond with a complete sentence.")), 23))
	body.add_child(_label("Grammar focus: " + str(challenge.get("grammar", "Full sentences in context")), 14, MUTED))
	var feedback = _label("Use a complete sentence. Written readings are accepted for Japanese and Chinese.", 14, MUTED)
	var continue_button = _button("Continue the conversation", func():
		_close_modal()
		if challenge_callback.is_valid():
			challenge_callback.call()
	)
	continue_button.hide()
	var choices: Array = translated.get("choices", [])
	var answer: String = str(translated.get("answer", ""))
	var input = LineEdit.new()
	input.placeholder_text = "Write your full response…"
	input.custom_minimum_size.y = 48
	# Choices still share the grading callback. Keep its optional text input
	# parented so closing a beginner conversation also releases the Control.
	input.hide()
	body.add_child(input)
	var choice_buttons: Array = []
	var check = func(value: String):
		if continue_button.visible:
			return
		var correct: bool = Language.check_answer(value, challenge, state.language)
		_challenge_attempts += 1
		var result: Dictionary = state.grade(id, correct, active_npc)
		if correct:
			feedback.text = "That expresses it clearly.\n" + answer + "\n" + str(translated.get("reading", "")) + "\n\n" + str(translated.get("explanation", challenge.get("grammar", "")))
			feedback.add_theme_color_override("font_color", Color("3d6c43"))
			continue_button.show()
			input.editable = false
			for button in choice_buttons:
				button.disabled = true
			ambience.play_effect("success")
			_save()
			_refresh_hud()
			if not result.get("completed", []).is_empty():
				_toast("The favor is complete. Your reward has been saved.")
		else:
			feedback.text = "Let’s try again.\n" + str(translated.get("choiceNotes", {}).get(value, translated.get("explanation", "Check the word order, verb form and request."))) + ("\nExample: " + answer + "\n" + str(translated.get("reading", "")) if _challenge_attempts >= 2 else "")
			feedback.add_theme_color_override("font_color", Color("a1573f"))
			ambience.play_effect("failure")
			_save()
	if state.difficulty() == 1 and not choices.is_empty():
		var shuffled: Array = choices.duplicate()
		shuffled.shuffle()
		for choice in shuffled:
			var value: String = str(choice.get("text", "")) if choice is Dictionary else str(choice)
			var button = _button(value, func(): check.call(value))
			button.custom_minimum_size.y = 50
			body.add_child(button)
			choice_buttons.append(button)
	else:
		var tokens: Array = translated.get("tokens", [])
		if tokens.is_empty() and state.language not in ["ja", "zh"]:
			tokens = answer.split(" ", false)
		if not tokens.is_empty():
			var chosen: Array[String] = []
			var display = _label("Build your response: ", 19)
			body.add_child(display)
			var flow = HFlowContainer.new()
			flow.add_theme_constant_override("h_separation", 7)
			flow.add_theme_constant_override("v_separation", 7)
			body.add_child(flow)
			var pieces: Array = tokens.duplicate()
			pieces.shuffle()
			for token in pieces:
				var value: String = str(token)
				flow.add_child(_button(value, func(): chosen.append(value); input.text = " ".join(chosen); display.text = " ".join(chosen)))
			body.add_child(_button("Clear my sentence", func(): chosen.clear(); input.text = ""; display.text = "Build your response: "))
		input.show()
		body.move_child(input, body.get_child_count() - 1)
		body.add_child(_button("Say this sentence", func(): check.call(input.text), true))
		input.text_submitted.connect(func(value): check.call(value))
	body.add_child(feedback)
	body.add_child(_button("Hear a pronunciation model / show reading", func():
		_speak(answer)
		feedback.text = answer + "\n" + str(translated.get("reading", "")) + "\n" + str(translated.get("explanation", ""))
	))
	body.add_child(continue_button)

func _open_activity(venue: String, mode: String) -> void:
	if not is_instance_valid(world) or venue != str(state.progress.mapId) or active_npc.is_empty() or world.get_interaction_distance("npc", active_npc) > 3.5:
		_toast("Walk to the person at the counter and ask them to begin.")
		return
	var body = _open_panel("A little work. A lot to learn.", str(state.maps[venue].name) + " · difficulty %d / 3" % state.difficulty(), 1180)
	var activity = Activities.new()
	activity.custom_minimum_size = Vector2(1060, 500)
	body.add_child(activity)
	_job_serial += 1
	var transaction: String = "%s-%d-%d" % [venue, Time.get_ticks_msec(), _job_serial]
	active_job = transaction
	activity.closed.connect(_close_modal)
	activity.finished.connect(func(result):
		if transaction != active_job:
			return
		active_job = ""
		var event: Dictionary = state.award_job(result, transaction)
		if result.get("success", false) and str(result.get("mode", "")) == "customer":
			state.progress.shopping = {}
		_close_modal()
		_after_event(event)
		if result.get("success", false):
			_toast(str(result.get("summary", "Shift finished. Your work and rewards are saved.")))
	)
	if activity.has_signal("shopping_requested"):
		activity.shopping_requested.connect(func(spec):
			state.progress.shopping = spec.duplicate(true)
			_save()
			_refresh_hud()
			_toast("Your shopping list is pinned to the HUD. Walk the aisles and collect each item.")
		)
	activity.setup(venue, state.language, state.difficulty(), mode, state.progress.inventory.duplicate(true), int(state.progress.jobs.get(venue, {}).get("shifts", 0)))

func _show_journal() -> void:
	var body = _open_panel("A town full of stories.", "Accept a favor from its neighbor. Every step needs a real action, a conversation, or a completed job.", 1000)
	for id in state.quests:
		var quest: Dictionary = state.quests[id]
		var status: String = state.quest_status(str(id))
		var card = _card(body)
		card.add_child(_label(str(quest.title) + "   ·   " + status.capitalize(), 21))
		card.add_child(_label(str(quest.get("description", "")), 14, MUTED))
		card.add_child(_label("From " + str(npc_defs.get(str(quest.get("npcId", "")), {}).get("name", "your neighbor")) + " · " + str(state.maps.get(str(quest.get("mapId", "town")), {}).get("name", "Town")), 13, MUTED))
		var stage = int(state.progress.quests.get(id, {}).get("stage", 0))
		var index = 0
		for step in quest.get("steps", []):
			var prefix: String = "✓ " if index < stage else "→ " if index == stage and status == "active" else "· "
			card.add_child(_label(prefix + str(step.get("text", "Help your neighbor.")) + "  [" + str(state.maps.get(str(step.get("mapId", "town")), {}).get("name", "Town")) + "]", 13, INK if index == stage else MUTED))
			index += 1
		if status == "active":
			var capture: String = str(id)
			card.add_child(_button("Track this favor", func(): state.select_quest(capture); _refresh_hud(); _close_modal(), true))
		elif status == "locked":
			var requirements: Array[String] = []
			for prerequisite in quest.get("requires", []):
				requirements.append(str(state.quests.get(str(prerequisite), {}).get("title", prerequisite)))
			card.add_child(_label("First finish: " + ", ".join(requirements), 13, MUTED))

func _show_guide() -> void:
	var body = _open_panel("Twenty-eight doors. A whole town inside.", "Every building below has its own loaded interior, residents, labelled objects, and a playable activity. Follow the streets and press E at its door.", 1080)
	if str(state.progress.mapId) == "town":
		var districts = _row(body)
		for district in state.maps.town.get("districts", []):
			var captured_id: String = str(district.id)
			var button = _button(str(district.name), func(): _close_modal(); world.move_to_district(captured_id))
			districts.add_child(button)
	for id in state.maps:
		if id == "town":
			continue
		var place: Dictionary = state.maps[id]
		var card = _card(body)
		card.add_child(_label(str(place.name), 20))
		card.add_child(_label(str(place.get("description", "")), 14, MUTED))
		card.add_child(_label("%d objects · %d residents · distinct interior · gameplay available" % [place.get("objects", []).size(), place.get("npcs", []).size()], 13, MUTED))
		for portal in state.maps.town.get("portals", []):
			if str(portal.target) == str(id):
				card.add_child(_label("Town entrance: east/west %.0f, north/south %.0f" % [float(portal.x), float(portal.z)], 13, MUTED))
				if str(state.progress.mapId) == "town" and world.has_method("set_waypoint"):
					var position = Vector3(float(portal.x), 0, float(portal.z))
					var title: String = str(place.name)
					card.add_child(_button("Mark the entrance — walk there", func(): _close_modal(); world.set_waypoint(position, title)))

func _show_objects() -> void:
	var body = _open_panel("Every little thing, listed once.", "One entry per object type. Instance counts preserve the detail in the world; use E near an object to interact with it.", 950)
	var search = LineEdit.new()
	search.placeholder_text = "Search English, the target language, or a reading…"
	search.custom_minimum_size.y = 44
	body.add_child(search)
	var list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 8)
	body.add_child(list)
	var grouped: Dictionary = {}
	if world:
		for object in world.get_objects():
			var id: String = str(object.get("wordId", ""))
			if not state.words.has(id):
				continue
			if not grouped.has(id):
				grouped[id] = []
			grouped[id].append(object)
	var rebuild = func(query: String):
		for child in list.get_children():
			list.remove_child(child)
			child.queue_free()
		var ids: Array = grouped.keys()
		ids.sort_custom(func(a, b): return _english(str(a)) < _english(str(b)))
		for key in ids:
			var id: String = str(key)
			var translated: Dictionary = _translation(id)
			var searchable: String = (_english(id) + " " + str(translated.get("text", "")) + " " + str(translated.get("reading", ""))).to_lower()
			if not query.strip_edges().is_empty() and query.to_lower() not in searchable:
				continue
			var item = _button("%s   ·   %s   ·   %d in this place" % [_english(id).capitalize(), str(translated.get("text", "")), grouped[id].size()], func(): _show_word(id))
			item.name = "ObjectType_" + id
			list.add_child(item)
	search.text_changed.connect(rebuild)
	rebuild.call("")

func _show_wordbook() -> void:
	var body = _open_panel("Words that belong to your life.", "%d discoveries / %d words. Look up any word; learn and gather by interacting in the world." % [state.progress.learned.size(), state.words.size()], 950)
	var reviews = _row(body)
	reviews.add_child(_button("Spaced review — mixed", func(): _open_review("mixed"), true))
	reviews.add_child(_button("Listen and recognize", func(): _open_review("listen")))
	reviews.add_child(_button("Type what you remember", func(): _open_review("type")))
	var search = LineEdit.new()
	search.placeholder_text = "Search your wordbook…"
	body.add_child(search)
	var list = VBoxContainer.new()
	body.add_child(list)
	var rebuild = func(query: String):
		for child in list.get_children():
			list.remove_child(child)
			child.queue_free()
		for key in state.words:
			var id: String = str(key)
			var translated: Dictionary = _translation(id)
			if not query.is_empty() and query.to_lower() not in (_english(id) + " " + str(translated.text) + " " + str(translated.get("reading", ""))).to_lower():
				continue
			list.add_child(_button(("✓ " if state.progress.learned.has(id) else "· ") + _english(id).capitalize() + "   " + str(translated.text), func(): _show_word(id)))
	search.text_changed.connect(rebuild)
	rebuild.call("")

func _show_inventory() -> void:
	var body = _open_panel("The things you’re carrying.", "Collect objects in person, use them for work, and hand supplies to the neighbor who asked for them.", 900)
	if state.progress.inventory.is_empty():
		body.add_child(_label("Your bag is empty. Step up to something small and press E to pick it up. A supermarket cashier can give you a real shopping list.", 19))
	for key in state.progress.inventory:
		var id: String = str(key)
		if state.inventory_count(id) <= 0:
			continue
		body.add_child(_button("%d × %s   ·   %s" % [state.inventory_count(id), _english(id).capitalize(), str(_translation(id).text)], func(): _show_word(id)))

func _show_settings() -> void:
	var body = _open_panel("Make this town your own.", "Native desktop preferences, character, and save backups.", 900)
	var sounds = CheckButton.new()
	sounds.text = "Environmental ambience and interaction sounds"
	sounds.button_pressed = bool(state.settings.sound)
	sounds.toggled.connect(func(value): state.settings.sound = value; ambience.set_enabled(value); _save())
	body.add_child(sounds)
	body.add_child(_label("Ambience volume"))
	var volume = HSlider.new()
	volume.min_value = 0
	volume.max_value = 1
	volume.step = 0.05
	volume.value = float(state.settings.volume)
	volume.value_changed.connect(func(value): state.settings.volume = value; ambience.set_volume(value))
	body.add_child(volume)
	var names = _row(body)
	names.add_child(_label("Your character’s name"))
	var name_input = LineEdit.new()
	name_input.text = str(state.settings.name)
	name_input.max_length = 30
	name_input.custom_minimum_size = Vector2(280, 40)
	name_input.text_changed.connect(func(value): state.settings.name = value; _refresh_hud())
	names.add_child(name_input)
	var shirt_row = _row(body)
	shirt_row.add_child(_label("Your jacket"))
	for color_id in ["sage", "coral", "ocean", "gold", "lavender"]:
		var selected: String = str(color_id)
		shirt_row.add_child(_button(selected.capitalize(), func():
			state.settings.shirt = selected
			if world and world.has_method("set_avatar"):
				world.set_avatar(state.settings)
		))
	body.add_child(_button("Toggle fullscreen [F11]", _toggle_fullscreen))
	body.add_child(_button("Save now [F5]", func(): _save(); _toast("Your adventure has been saved on this PC."), true))
	body.add_child(_button("Export all four language saves", func(): _file_dialog(false)))
	body.add_child(_button("Import a native or older browser backup", func(): _file_dialog(true)))
	body.add_child(_label("Saves are stored in your operating system’s user-data folder, separately for each learning language. A malformed import is rejected before changing any language. Audio uses original local environmental loops. Optional pronunciation uses installed system voices.", 13, MUTED))
	body.add_child(_button("Start this language again…", _confirm_reset))

func _file_dialog(importing: bool) -> void:
	var picker = FileDialog.new()
	picker.access = FileDialog.ACCESS_FILESYSTEM
	picker.file_mode = FileDialog.FILE_MODE_OPEN_FILE if importing else FileDialog.FILE_MODE_SAVE_FILE
	picker.title = "Import Thing Ling progress" if importing else "Export Thing Ling progress"
	picker.filters = PackedStringArray(["*.json ; Thing Ling save backup"])
	picker.current_file = "Thing-Ling-progress.json"
	picker.use_native_dialog = true
	add_child(picker)
	picker.file_selected.connect(func(path):
		if importing:
			var source = FileAccess.open(path, FileAccess.READ)
			if source == null:
				_toast("That file could not be opened. Your progress is unchanged.")
				picker.queue_free()
				return
			var source_size = source.get_length()
			source.close()
			if source_size > 4000000:
				_toast("That file is too large for a save. Your progress is unchanged.")
				picker.queue_free()
				return
			var payload = JSON.parse_string(FileAccess.get_file_as_string(path))
			if not payload is Dictionary:
				_toast("This is not a valid backup. Your progress is unchanged.")
			else:
				_confirm_import(payload)
		else:
			_save()
			var file = FileAccess.open(path, FileAccess.WRITE)
			if file:
				file.store_string(JSON.stringify(state.export_payload(), "\t", true, true))
				file.close()
				_toast("Your backup is exported.")
			else:
				_toast("That folder could not be written. Choose a writable location.")
		picker.queue_free()
	)
	picker.canceled.connect(func(): picker.queue_free())
	picker.popup_centered(Vector2i(900, 600))

func _confirm_import(payload: Dictionary) -> void:
	var probe = State.new()
	probe.setup(state.data, state.story, {"words": state.words.values()})
	if not probe.import_payload(payload):
		_toast("This backup is not valid. Your existing progress is unchanged.")
		return
	var body = _open_panel("Bring these words home?", "Importing replaces only the languages in the file. Export your current progress first if you need a backup.", 800)
	body.add_child(_button("Import this backup", func():
		_close_modal()
		if state.import_payload(payload):
			state.save_game()
			if started:
				var p: Array = state.progress.position
				_load_map(str(state.progress.mapId), [p[0], p[2]], true)
			_refresh_hud()
			_toast("Your words, favors and bag came with you.")
	, true))
	body.add_child(_button("Keep my current adventure", _close_modal))

func _confirm_reset() -> void:
	var body = _open_panel("Start a fresh page?", "This clears only your current language. Other languages keep their own progress. Export a backup first if you want to keep this adventure.", 780)
	body.add_child(_button("Keep this adventure", _close_modal, true))
	body.add_child(_button("Yes — start this language over", func():
		state.reset_language(state.language)
		state.save_game()
		_close_modal()
		if started:
			_load_map("town")
		_refresh_hud()
	))

func _show_help() -> void:
	var body = _open_panel("A town you can live in.", "Take your time. The world stays here while you learn.", 1000)
	for heading in [
		["Walk, look, interact", "WASD or arrow keys move your character. Shift runs. Right-drag turns the camera; the wheel zooms, M opens a wider view, and F switches to first-person view. Stand near a person, object or door and press E. Labels and wordbook entries never collect things remotely."],
		["Every door opens", "Use the Town guide to locate the 28 buildings. Walk to a door and press E; its interior loads with different objects, people and work. Return through its exit. Village, garden and harbor are connected parts of the same town."],
		["A favor is a whole story", "Talk to Theo in the Old Village. Accept his favor, follow the journal’s ordered steps, collect and deliver supplies, complete jobs, and answer in full sentences. Other stories open as you help."],
		["Work and shop", "Ask an indoor neighbor for a shift. Serve drinks in the right order, scan groceries and calculate change, repair, cook, sort letters and more. Supermarket customer mode gives you a list: collect its items from actual shelves, then return to check out."],
		["Grow your language", "Conversations and shifts become harder with your level. Early challenges offer whole-sentence choices; later work asks you to arrange or write the response. Wrong answers explain the grammar and let you retry. Japanese romaji and Chinese pinyin are accepted."],
		["Make it yours", "Choose a learning language, name and jacket. Each language keeps its own story, bag and progress. Settings controls ambience, fullscreen and import/export. F5 saves, F11 toggles fullscreen, Esc pauses. Your save is local to this PC."]
	]:
		var card = _card(body)
		card.add_child(_label(str(heading[0]), 21))
		card.add_child(_label(str(heading[1]), 16))

func _toggle_labels() -> void:
	state.settings.labels = not bool(state.settings.labels)
	if world:
		world.set_labels(bool(state.settings.labels))
	_save()
	_toast("Nearby translated labels are on." if state.settings.labels else "Nearby labels hidden. E and Objects here still identify every object.")

func _toggle_fullscreen() -> void:
	state.settings.fullscreen = not bool(state.settings.fullscreen)
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if state.settings.fullscreen else DisplayServer.WINDOW_MODE_WINDOWED)
	_save()

func _speak(text: String) -> void:
	if not ProjectSettings.get_setting("audio/general/text_to_speech", false) or not DisplayServer.has_feature(DisplayServer.FEATURE_TEXT_TO_SPEECH):
		_toast("No matching system voice is installed. Native text and written readings remain available.")
		return
	var voices = DisplayServer.tts_get_voices_for_language(state.language)
	if voices.is_empty():
		_toast("No matching system voice is installed. Native text and written readings remain available.")
		return
	DisplayServer.tts_speak(text, voices[0], 70, 1.0, 0.9)

func _toast(text: String) -> void:
	if is_instance_valid(toast_label):
		toast_label.text = text
		toast_label.show()
		toast_label.move_to_front()
		toast_timer = 5.0

func _unhandled_input(event: InputEvent) -> void:
	if transitioning:
		return
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.keycode == KEY_ESCAPE:
		if is_instance_valid(overlay):
			_close_modal()
		elif is_instance_valid(menu):
			_resume_game()
		else:
			_show_menu()
	elif event.keycode == KEY_F11:
		_toggle_fullscreen()
	elif event.keycode == KEY_F5:
		_save()
		_toast("Saved on this PC.")
	elif started and not is_instance_valid(overlay) and not is_instance_valid(menu):
		match event.keycode:
			KEY_I: _show_inventory()
			KEY_J: _show_journal()
			KEY_TAB: _show_guide()
			KEY_L: _toggle_labels()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		_quit()

func _quit() -> void:
	_save()
	get_tree().quit()

func _open_review(mode: String = "mixed", only_word: String = "") -> void:
	if state.progress.learned.is_empty():
		_toast("Walk to an object and press E to discover your first word before reviewing.")
		return
	var learned: Dictionary = state.progress.learned.duplicate(true)
	if not only_word.is_empty():
		learned = {only_word: learned[only_word]} if learned.has(only_word) else {}
	var body = _open_panel("Let your words take root.", "Due words come first. Extra practice earns effort rewards without inflating mastery or postponing a review.", 1100)
	var review = Review.new()
	body.add_child(review)
	_review_xp = 0
	_review_coins = 0
	_review_id = str(Time.get_ticks_usec())
	var session_id: String = _review_id
	var session_language: String = state.language
	var update = func(result: Dictionary):
		if session_id != _review_id or session_language != state.language:
			return
		for id in result.get("learned", {}):
			state.progress.learned[id] = result.learned[id].duplicate(true)
		var earned_xp: int = maxi(0, int(result.get("xp", 0)) - _review_xp)
		var earned_coins: int = maxi(0, int(result.get("coins", 0)) - _review_coins)
		state.progress.xp += earned_xp
		state.progress.coins += earned_coins
		_review_xp += earned_xp
		_review_coins += earned_coins
		_save()
		_refresh_hud()
	review.progress_changed.connect(update)
	review.finished.connect(func(result): update.call(result); _toast(str(result.get("summary", "Your review and next due dates are saved."))))
	review.closed.connect(func(): _review_id = ""; _close_modal())
	review.setup(state.language, state.words, learned, mode)
