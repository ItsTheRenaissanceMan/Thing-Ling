extends Control
## Native, self-contained workbench. Root opens it only after a nearby NPC interaction.
signal finished(result: Dictionary)
signal closed
signal shopping_requested(spec: Dictionary)

const Rules = preload("res://scripts/activity_rules.gd")
const CREAM: Color = Color("fff9ec")
const INK: Color = Color("344b43")
const GREEN: Color = Color("50795e")
const MUTED: Color = Color("6c7b70")
const GOLD: Color = Color("e8c184")
const RED: Color = Color("9b4e43")

var state: Dictionary = {}
var _words: Dictionary = {}
var _ui: MarginContainer
var _audio: AudioStreamPlayer
var _answer_tokens: Array = []
var _token_order: Array = []
var _typed_answer: String = ""
var _sentence_key: String = ""
var _submitted: bool = false
var _timing_bar: ProgressBar
var _timing_label: Label
var _cue_for: int = -1

func setup(venue_id: String, language: String, level: int, mode: String = "work", inventory: Dictionary = {}, shift_index: int = 0) -> void:
	state = Rules.create_state(venue_id, language, level, mode, inventory, shift_index)
	_submitted = false
	_answer_tokens.clear()
	_token_order.clear()
	_typed_answer = ""
	_sentence_key = ""
	_load_words()
	if is_inside_tree():
		_render()

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	custom_minimum_size = Vector2(980, 620)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	mouse_filter = Control.MOUSE_FILTER_STOP
	_audio = AudioStreamPlayer.new()
	_audio.volume_db = -19.0
	add_child(_audio)
	if not state.is_empty():
		_render()

func get_state() -> Dictionary:
	return state.duplicate(true)

func _load_words() -> void:
	if not _words.is_empty():
		return
	for path in ["res://data/vocabulary.json", "res://data/extra_vocabulary.json"]:
		if not FileAccess.file_exists(path):
			continue
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
		var entries: Array = []
		if parsed is Dictionary:
			entries = parsed.get("words", [])
		elif parsed is Array:
			entries = parsed
		for word in entries:
			if word is Dictionary and word.has("id"):
				_words[str(word.id)] = word

func _translation(id: String) -> Dictionary:
	var word: Dictionary = _words.get(id, {})
	return word.get("translations", {}).get(state.get("language", "de"), {})

func _word_name(id: String) -> String:
	return str(_words.get(id, {}).get("english", id.replace("_", " ")))

func _word_native(id: String) -> String:
	return str(_translation(id).get("text", _word_name(id)))

func _word_tip(id: String) -> String:
	var translation = _translation(id)
	return "%s\n%s\n%s" % [translation.get("text", _word_name(id)), translation.get("reading", ""), _word_name(id)]

func _style(color: Color, border: Color = Color("d8dfcf"), radius: int = 15) -> StyleBoxFlat:
	var box = StyleBoxFlat.new()
	box.bg_color = color
	box.border_color = border
	box.set_border_width_all(1)
	box.set_corner_radius_all(radius)
	box.content_margin_left = 18
	box.content_margin_right = 18
	box.content_margin_top = 15
	box.content_margin_bottom = 15
	return box

func _label(text: String, size: int = 18, color: Color = INK, parent: Node = null) -> Label:
	var label = Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_color_override("font_color", color)
	label.add_theme_font_size_override("font_size", size)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if parent != null:
		parent.add_child(label)
	return label

func _button(text: String, callback: Callable, parent: Node, primary: bool = false, height: int = 54) -> Button:
	var button = Button.new()
	button.custom_minimum_size = Vector2(0, height)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.add_theme_stylebox_override("normal", _style(GREEN if primary else Color("f5f1e4"), GREEN if primary else Color("d2ddcc"), 10))
	button.add_theme_stylebox_override("hover", _style(Color("63886b") if primary else Color("e9eddd"), Color("a4b89d"), 10))
	button.add_theme_stylebox_override("pressed", _style(Color("42674e") if primary else Color("dce6d4"), GREEN, 10))
	button.add_theme_stylebox_override("focus", _style(Color(0, 0, 0, 0), GOLD, 10))
	var label = _label(text, 17, CREAM if primary else INK)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	button.add_child(label)
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	label.offset_left = 12
	label.offset_right = -12
	label.offset_top = 6
	label.offset_bottom = -6
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.pressed.connect(callback)
	parent.add_child(button)
	return button

func _card(parent: Node) -> VBoxContainer:
	var panel = PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.add_theme_stylebox_override("panel", _style(CREAM))
	parent.add_child(panel)
	var column = VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	panel.add_child(column)
	return column

func _scroll(parent: Node) -> VBoxContainer:
	var scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	parent.add_child(scroll)
	var column = VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 10)
	scroll.add_child(column)
	return column

func _render() -> void:
	if _ui != null:
		remove_child(_ui)
		_ui.queue_free()
	_timing_bar = null
	_timing_label = null
	_ui = MarginContainer.new()
	add_child(_ui)
	_ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		_ui.add_theme_constant_override("margin_" + side, 16)
	var backdrop = PanelContainer.new()
	backdrop.add_theme_stylebox_override("panel", _style(Color("eee9db"), Color("c5d2be"), 22))
	_ui.add_child(backdrop)
	var layout = VBoxContainer.new()
	layout.add_theme_constant_override("separation", 13)
	backdrop.add_child(layout)
	var spec = Rules.get_venue_spec(str(state.get("venue", "")))
	var header = HBoxContainer.new()
	header.add_theme_constant_override("separation", 18)
	layout.add_child(header)
	var titles = VBoxContainer.new()
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(titles)
	_label("A LITTLE WORK. A REAL CONVERSATION.", 12, MUTED, titles)
	_label(str(spec.get("title", "Town activity")), 28, INK, titles)
	var close_button = _button("Close", _close, header, false, 44)
	close_button.size_flags_horizontal = Control.SIZE_SHRINK_END
	close_button.custom_minimum_size.x = 90
	if state.get("stage", "") == "unavailable":
		_label(str(state.get("feedback", "")), 20, RED, layout)
		return
	if state.stage == "complete":
		_render_complete(layout)
		return
	var status = HBoxContainer.new()
	layout.add_child(status)
	_label("%s · Level %d · %s" % [str(state.language).to_upper(), int(state.level), "Shopping trip" if state.mode == "customer" else "Work shift"], 14, MUTED, status)
	_label("Request %d / %d     |     Corrections: %d" % [int(state.round) + 1, Rules.round_count(state), int(state.mistakes)], 14, MUTED, status)
	var progress_bar = ProgressBar.new()
	progress_bar.custom_minimum_size.y = 8
	progress_bar.show_percentage = false
	progress_bar.value = float(state.round) / maxf(1.0, float(Rules.round_count(state))) * 100.0
	progress_bar.add_theme_stylebox_override("fill", _style(GREEN, GREEN, 4))
	progress_bar.add_theme_stylebox_override("background", _style(Color("dbe1d0"), Color("dbe1d0"), 4))
	layout.add_child(progress_bar)
	var content = HBoxContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 16)
	layout.add_child(content)
	var notes = _card(content)
	notes.get_parent().custom_minimum_size.x = 280
	notes.get_parent().size_flags_stretch_ratio = 0.8
	var notes_content = _scroll(notes)
	_render_work_card(notes_content)
	var bench = _card(content)
	bench.get_parent().size_flags_stretch_ratio = 1.7
	var body = _scroll(bench)
	if state.stage == "grammar":
		_render_sentence(body)
	elif state.kind == "cafe":
		_render_cafe(body)
	elif state.kind == "market":
		_render_market(body)
	else:
		_render_task(body)
	if not str(state.get("feedback", "")).is_empty():
		var feedback = PanelContainer.new()
		feedback.add_theme_stylebox_override("panel", _style(Color("e2eddb") if state.get("feedback_good", true) else Color("f5e5d8"), Color("c0d4b7") if state.get("feedback_good", true) else Color("dec3ae"), 10))
		layout.add_child(feedback)
		_label(str(state.feedback), 16, GREEN if state.get("feedback_good", true) else RED, feedback)
	var footer = HBoxContainer.new()
	footer.add_theme_constant_override("separation", 10)
	layout.add_child(footer)
	_button("Return to the town", _close, footer, false, 44)
	if state.kind == "market" and state.mode == "customer":
		_button("Take this list into the shop", _request_shopping, footer, true, 44)
	else:
		_label("Names and readings appear when you hover over ingredients and supplies.", 13, MUTED, footer)

func _render_work_card(parent: Node) -> void:
	var order = Rules.current_round(state)
	_label(str(order.get("title", "Your request")), 23, INK, parent)
	_label(str(order.get("request", "")), 16, MUTED, parent)
	if order.has("native_request"):
		_label(str(order.native_request), 21, GREEN, parent)
		_label(str(order.get("reading", "")), 14, MUTED, parent)
	if state.kind == "cafe":
		var recipe: Dictionary = order.recipe
		_label("RECIPE · " + str(recipe.get("category", "drink")).to_upper(), 12, MUTED, parent)
		for id in recipe.ingredients:
			var taken: int = int(state.ingredients.get(id, 0))
			var amount: int = int(recipe.ingredients[id])
			var item = _label("%s  %s × %d  (%d ready)" % ["✓" if taken == amount else "•", _word_native(id), amount, taken], 16, GREEN if taken == amount else INK, parent)
			item.tooltip_text = _word_tip(id)
		_label("PREPARATION CARD", 12, MUTED, parent)
		for i in range(recipe.steps.size()):
			var operation: String = recipe.steps[i]
			var done: bool = state.stage == "serve" or state.stage == "prepare" and i < int(state.sequence_index)
			_label("%s %d. %s" % ["✓" if done else "·", i + 1, Rules.data().operations.get(operation, operation)], 14, GREEN if done else MUTED, parent)
	elif state.kind == "market":
		_label("SHOPPING LIST" if state.mode == "customer" else "BASKET / RECEIPT", 12, MUTED, parent)
		for id in state.basket:
			var quantity: int = int(state.basket[id])
			var scanned: int = int(state.scanned.get(id, 0))
			var cents: int = int(Rules.data().prices.get(id, 0))
			var item = _label("%s × %d\n%s each · %d scanned" % [_word_native(id), quantity, Rules.money(cents), scanned], 17, INK, parent)
			item.tooltip_text = _word_tip(id)
			if state.mode == "customer":
				_label("In your real bag: %d" % int(state.inventory.get(id, 0)), 13, GREEN if int(state.inventory.get(id, 0)) >= quantity else RED, parent)
		_label("Total: " + Rules.money(Rules.total_for(state.basket)), 22, GREEN, parent)
		_label(("Budget: " if state.mode == "customer" else "Cash received: ") + Rules.money(int(state.tender)), 18, INK, parent)
		if state.mode == "customer":
			_label("Products come from the actual shelves. Close this workbench, walk to an item, and use E to collect it.", 14, MUTED, parent)
	else:
		var task = Rules.current_task(state)
		_label("WORK CARD", 12, MUTED, parent)
		_label(str(task.get("prompt", "")), 19, GREEN, parent)
		if task.get("type", "") == "sequence":
			for i in range(task.get("sequence", []).size()):
				var item: String = str(task.sequence[i])
				_label("%s %d. %s" % ["✓" if i < int(state.sequence_index) else "·", i + 1, task.get("labels", {}).get(item, item)], 15, GREEN if i < int(state.sequence_index) else MUTED, parent)
		_label("Task %d / %d" % [int(state.task_index) + 1, order.get("tasks", []).size()], 13, MUTED, parent)

func _render_sentence(parent: Node) -> void:
	var challenge = Rules.get_challenge(state)
	if challenge.is_empty():
		_label("This sentence lesson could not be loaded. Please return to your host.", 18, RED, parent)
		return
	var translation: Dictionary = challenge.get("translations", {}).get(state.language, {})
	var key: String = "%s:%s:%s:%s" % [state.venue, state.round, state.task_index, state.stage]
	if _sentence_key != key:
		_sentence_key = key
		_answer_tokens.clear()
		_token_order.clear()
		_typed_answer = ""
		var tokens: Array = translation.get("tokens", [])
		if tokens.is_empty():
			tokens = str(translation.get("answer", "")).split(" ", false)
		for i in range(tokens.size()):
			_token_order.append({"id": i, "text": str(tokens[i])})
		_token_order.shuffle()
	_label("FIRST, A REAL CONVERSATION", 12, MUTED, parent)
	_label(str(challenge.get("prompt", challenge.get("context", "Respond to your customer using a complete sentence."))), 22, INK, parent)
	_label(str(challenge.get("grammar", "Use the complete sentence, including its polite ending.")), 16, GREEN, parent)
	if int(state.level) == 1:
		_label("Choose the complete response that fits the situation.", 15, MUTED, parent)
		var choices: Array = translation.get("choices", []).duplicate()
		if choices.is_empty():
			choices = [str(translation.get("answer", ""))]
		choices.shuffle()
		for entry in choices:
			var choice_text: String = str(entry.get("text", entry.get("answer", ""))) if entry is Dictionary else str(entry)
			_button(choice_text, func(): _act({"type": "sentence", "answer": choice_text}), parent, false, 78)
	elif int(state.level) == 2:
		_label("Arrange the sentence pieces. Click a chosen piece to undo it.", 15, MUTED, parent)
		var composed = _label(_composed_answer() if not _answer_tokens.is_empty() else "Your sentence will appear here…", 24, GREEN, parent)
		composed.custom_minimum_size.y = 66
		var chosen = HFlowContainer.new()
		chosen.add_theme_constant_override("h_separation", 7)
		parent.add_child(chosen)
		for chosen_index in range(_answer_tokens.size()):
			var token: Dictionary = _answer_tokens[chosen_index]
			var index: int = chosen_index
			var button = _button(str(token.text), func(): _answer_tokens.remove_at(index); _render(), chosen, true, 43)
			button.custom_minimum_size.x = maxi(65, str(token.text).length() * 13)
		var pool = HFlowContainer.new()
		pool.add_theme_constant_override("h_separation", 7)
		pool.add_theme_constant_override("v_separation", 7)
		parent.add_child(pool)
		for token in _token_order:
			var used: bool = _answer_tokens.any(func(chosen_token): return chosen_token.id == token.id)
			if used:
				continue
			var piece: Dictionary = token
			var button = _button(str(piece.text), func(): _answer_tokens.append(piece); _render(), pool, false, 48)
			button.custom_minimum_size.x = maxi(65, str(piece.text).length() * 13)
		_button("Check my sentence", func(): _act({"type": "sentence", "answer": _composed_answer()}), parent, true)
		_button("Start the sentence again", func(): _answer_tokens.clear(); _render(), parent, false, 42)
	else:
		_label("Write the full response. Native script or the provided romanization is accepted.", 15, MUTED, parent)
		var input = TextEdit.new()
		input.custom_minimum_size.y = 110
		input.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
		input.text = _typed_answer
		input.placeholder_text = "Write your complete sentence…"
		input.add_theme_font_size_override("font_size", 21)
		input.add_theme_stylebox_override("normal", _style(Color("fffdf5"), Color("c8d5bd"), 10))
		input.add_theme_stylebox_override("focus", _style(Color("fffdf5"), GREEN, 10))
		input.add_theme_color_override("font_color", INK)
		input.add_theme_color_override("font_placeholder_color", MUTED)
		input.add_theme_color_override("caret_color", GREEN)
		parent.add_child(input)
		input.text_changed.connect(func(): _typed_answer = input.text)
		_button("Check my sentence", func(): _act({"type": "sentence", "answer": input.text}), parent, true)
	var hint = CheckButton.new()
	hint.text = "Show the sentence and reading for study"
	hint.add_theme_color_override("font_color", MUTED)
	parent.add_child(hint)
	var answer_hint = _label("%s\n%s\n%s" % [translation.get("answer", ""), translation.get("reading", ""), translation.get("explanation", "")], 16, MUTED, parent)
	answer_hint.visible = false
	hint.toggled.connect(func(on: bool): answer_hint.visible = on)

func _composed_answer() -> String:
	var pieces: PackedStringArray = []
	for token in _answer_tokens:
		pieces.append(str(token.text))
	return ("" if state.get("language", "de") in ["ja", "zh"] else " ").join(pieces)

func _render_cafe(parent: Node) -> void:
	var recipe: Dictionary = Rules.current_round(state).recipe
	if state.stage == "ingredients":
		_label("Measure the ingredients", 24, INK, parent)
		_label("Each press measures one portion. Read the recipe quantities and hover for pronunciation.", 16, MUTED, parent)
		var pantry: Array = ["coffee", "tea", "milk", "water", "sugar", "honey", "lemon", "chocolate", "cream", "cinnamon", "mint", "ice", "vanilla", "cup", "bread", "egg", "cheese", "butter", "plate", "strawberry", "banana", "lettuce", "tomato", "cucumber", "carrot", "onion", "potato", "pasta", "bowl"]
		var grid = GridContainer.new()
		grid.columns = 3
		grid.add_theme_constant_override("h_separation", 8)
		grid.add_theme_constant_override("v_separation", 8)
		parent.add_child(grid)
		for ingredient in pantry:
			var id: String = ingredient
			var ready: int = int(state.ingredients.get(id, 0))
			var button = _button("%s\n%s  ·  %d measured" % [_word_native(id), _word_name(id), ready], func(): _act({"type": "ingredient", "id": id}), grid, false, 84)
			button.tooltip_text = _word_tip(id)
	elif state.stage == "prepare":
		_label("Use the preparation stations", 24, INK, parent)
		_label("Perform every operation in recipe order. An out-of-order operation gives feedback and lets you retry.", 16, MUTED, parent)
		_label("%d / %d operations complete" % [int(state.sequence_index), recipe.steps.size()], 18, GREEN, parent)
		var operations: Array = recipe.steps.duplicate()
		for extra in ["grind", "brew", "heat_water", "heat_milk", "froth", "pour_coffee", "mix", "garnish_lemon"]:
			if extra not in operations:
				operations.append(extra)
		operations.sort()
		var grid = GridContainer.new()
		grid.columns = 2
		grid.add_theme_constant_override("h_separation", 8)
		grid.add_theme_constant_override("v_separation", 8)
		parent.add_child(grid)
		for operation in operations:
			var id: String = operation
			_button(str(Rules.data().operations.get(id, id)), func(): _act({"type": "step", "id": id}), grid, false, 68)
		_button("Restart this preparation", func(): _act({"type": "restart_preparation"}), parent, false, 42)
	else:
		_label("Ready for the guest", 27, GREEN, parent)
		_label("The ingredients are measured and every preparation step is complete. Present this order and greet the next guest.", 18, INK, parent)
		_button("Serve the complete order", func(): _act({"type": "serve"}), parent, true, 65)

func _render_market(parent: Node) -> void:
	if state.stage == "substitute":
		var shopping: Dictionary = Rules.get_venue_spec(state.venue).shopping[str(state.level)]
		_label("A shelf is out of stock", 24, INK, parent)
		_label("%s is unavailable. Choose a substitute for the same quantity while keeping the full basket within %s." % [_word_native(shopping.unavailable), Rules.money(int(state.budget))], 18, MUTED, parent)
		for option in shopping.alternatives:
			var id: String = option
			var button = _button("%s · %s each" % [_word_native(id), Rules.money(int(Rules.data().prices.get(id, 0)))], func(): _act({"type": "substitute", "id": id}), parent)
			button.tooltip_text = _word_tip(id)
	elif state.stage == "scan":
		_label("Scan the basket", 24, INK, parent)
		_label("Select each product once for every portion on the list. The running receipt tracks quantities.", 16, MUTED, parent)
		if state.mode == "customer" and not Rules.missing_inventory(state).is_empty():
			_label("Your bag is missing listed products. Take the list, walk to the shelves, and collect the items before checkout.", 17, RED, parent)
		var grid = GridContainer.new()
		grid.columns = 3
		grid.add_theme_constant_override("h_separation", 8)
		grid.add_theme_constant_override("v_separation", 8)
		parent.add_child(grid)
		for product in Rules.data().prices:
			var id: String = product
			var count: int = int(state.scanned.get(id, 0))
			var button = _button("%s\n%s · %d scanned" % [_word_native(id), Rules.money(int(Rules.data().prices[id])), count], func(): _act({"type": "scan", "id": id}), grid, false, 82)
			button.tooltip_text = _word_tip(id)
	elif state.stage == "payment":
		_label("Pay the exact total" if state.mode == "customer" else "Count the customer’s change", 24, INK, parent)
		_label("Receipt total: %s. %s: %s." % [Rules.money(Rules.total_for(state.basket)), "Shopping budget" if state.mode == "customer" else "Cash received", Rules.money(int(state.tender))], 18, MUTED, parent)
		_number_input(parent, "Enter the amount to pay in cents." if state.mode == "customer" else "Enter the change to return in cents.", "payment", "amount")

func _number_input(parent: Node, prompt: String, action_type: String = "number", field: String = "value") -> void:
	_label(prompt, 18, INK, parent)
	var input = LineEdit.new()
	input.custom_minimum_size.y = 54
	input.placeholder_text = "Whole number, e.g. 250"
	input.add_theme_font_size_override("font_size", 23)
	input.add_theme_stylebox_override("normal", _style(Color("fffdf5"), Color("c8d5bd"), 10))
	input.add_theme_stylebox_override("focus", _style(Color("fffdf5"), GREEN, 10))
	input.add_theme_color_override("font_color", INK)
	input.add_theme_color_override("font_placeholder_color", MUTED)
	input.add_theme_color_override("caret_color", GREEN)
	parent.add_child(input)
	var submit = func():
		var value = input.text.to_float() if input.text.is_valid_float() else null
		_act({"type": action_type, field: value})
	input.text_submitted.connect(func(_text: String): submit.call())
	_button("Check the amount", submit, parent, true)

func _render_task(parent: Node) -> void:
	var task = Rules.current_task(state)
	if task.get("type", "") == "sentence":
		_render_sentence(parent)
		return
	_label(str(task.get("prompt", "Your next task")), 23, INK, parent)
	match str(task.get("type", "")):
		"choice":
			for option in task.options:
				var value: String = str(option.value)
				_button(str(option.label), func(): _act({"type": "choose", "value": value}), parent, false, 70)
		"number":
			_number_input(parent, "Answer in " + str(task.get("unit", "the requested units")) + ".")
		"sequence":
			_label("%d / %d steps complete" % [int(state.sequence_index), task.sequence.size()], 17, GREEN, parent)
			var grid = GridContainer.new()
			grid.columns = 2
			grid.add_theme_constant_override("h_separation", 8)
			grid.add_theme_constant_override("v_separation", 8)
			parent.add_child(grid)
			var options: Array = task.get("options", task.sequence).duplicate()
			var unique: Array = []
			for option in options:
				if option not in unique:
					unique.append(option)
			for option in unique:
				var value: String = str(option)
				_button(str(task.get("labels", {}).get(value, value)), func():
					if task.get("musical", false): _play_note(value)
					_act({"type": "sequence", "value": value}), grid, false, 63)
		"set":
			_label("Select everything the request needs, then check the complete set.", 16, MUTED, parent)
			for option in task.options:
				var value: String = str(option.value)
				var chosen: bool = value in state.selected
				var button = _button(("✓  " if chosen else "+  ") + _word_native(value) + " · " + _word_name(value), func(): _act({"type": "toggle", "value": value}), parent, chosen)
				button.tooltip_text = _word_tip(value)
			_button("Check this set", func(): _act({"type": "confirm_set"}), parent, true)
		"change":
			_label("Cash tray: " + Rules.money(int(state.change_total)), 27, GREEN, parent)
			var coins = HFlowContainer.new()
			coins.add_theme_constant_override("h_separation", 8)
			parent.add_child(coins)
			for denomination in task.denominations:
				var value: int = int(denomination)
				var button = _button(Rules.money(value), func(): _act({"type": "coin", "value": value}), coins, false, 70)
				button.custom_minimum_size.x = 95
			_button("Confirm the counted cash", func(): _act({"type": "confirm_change"}), parent, true)
			_button("Clear the cash tray", func(): _act({"type": "clear_change"}), parent, false, 42)
		"seats":
			_label("Screen is at the top. Row A is step-free. Dark seats are occupied.", 15, MUTED, parent)
			var grid = GridContainer.new()
			grid.columns = int(task.columns) + 1
			grid.add_theme_constant_override("h_separation", 6)
			grid.add_theme_constant_override("v_separation", 9)
			parent.add_child(grid)
			for row in task.rows:
				_label(str(row), 18, INK, grid)
				for column in range(1, int(task.columns) + 1):
					var seat: String = str(row) + str(column)
					var button = _button(seat, func(): _act({"type": "seat", "value": seat}), grid, seat in state.selected, 58)
					button.custom_minimum_size.x = 52
					button.disabled = seat in task.occupied
			_label("Selected: " + ", ".join(state.selected), 17, GREEN, parent)
			_button("Confirm these seats", func(): _act({"type": "confirm_seats"}), parent, true)
		"rhythm":
			_label("Use the pad or the Space key. A visual pulse and a soft cue mark each target time. A mistake resets only this pattern.", 16, MUTED, parent)
			_timing_label = _label("Tap once to start the pattern.", 21, GREEN, parent)
			_timing_bar = ProgressBar.new()
			_timing_bar.custom_minimum_size.y = 34
			_timing_bar.show_percentage = false
			_timing_bar.max_value = 130
			parent.add_child(_timing_bar)
			_button("TAP  /  SPACE", func(): _act({"type": "tap", "time_ms": Time.get_ticks_msec()}), parent, true, 110)

func _render_complete(parent: Node) -> void:
	var result = Rules.get_result(state)
	var body = _scroll(parent)
	_label("A shift well spent.", 34, GREEN, body)
	_label(str(result.summary), 21, INK, body)
	_label("%d / 100 skill score\n+%d XP    ·    +%d town coins" % [int(result.score), int(result.xp), int(result.coins)], 25, GREEN, body)
	_label("You used complete sentences, handled real requests, and finished every practical stage. Mistakes counted as learning moments and never skipped the work.", 18, MUTED, body)
	for receipt in result.get("receipts", []):
		_label("Receipt: %s total · %s received · %s change" % [Rules.money(int(receipt.total_cents)), Rules.money(int(receipt.tender_cents)), Rules.money(int(receipt.change_cents))], 17, MUTED, body)
	_button("Finish and return to my host", _finish, parent, true, 65)

func _act(action: Dictionary) -> void:
	if _submitted:
		return
	state = Rules.apply_action(state, action)
	_render()

func _request_shopping() -> void:
	var list = Rules.get_shopping_list(state.venue, int(state.level), state.language)
	if state.get("substituted", false):
		list.items = state.basket.duplicate(true)
	shopping_requested.emit(list)
	closed.emit()

func _finish() -> void:
	if _submitted:
		return
	var result = Rules.get_result(state)
	if not result.get("success", false):
		return
	_submitted = true
	finished.emit(result)

func _close() -> void:
	closed.emit()

func _process(_delta: float) -> void:
	if state.is_empty() or state.get("stage", "") != "task" or Rules.current_task(state).get("type", "") != "rhythm":
		return
	if not is_instance_valid(_timing_bar) or not is_instance_valid(_timing_label):
		return
	var task = Rules.current_task(state)
	var index: int = int(state.rhythm_index)
	var target: int = int(task.intervals[index])
	if int(state.last_tap) < 0:
		_timing_label.text = "Tap to start · next gap %d ms" % target
		_timing_bar.value = 0
		return
	var elapsed: int = Time.get_ticks_msec() - int(state.last_tap)
	_timing_bar.value = minf(130.0, float(elapsed) / float(target) * 100.0)
	_timing_label.text = "Beat %d / %d  ·  %d / %d ms" % [index + 1, task.intervals.size(), elapsed, target]
	if elapsed >= target - 45 and _cue_for != int(state.last_tap):
		_cue_for = int(state.last_tap)
		_play_note("G")

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_SPACE:
		if not state.is_empty() and state.get("stage", "") == "task" and Rules.current_task(state).get("type", "") == "rhythm":
			_act({"type": "tap", "time_ms": Time.get_ticks_msec()})
			get_viewport().set_input_as_handled()

func _play_note(note: String) -> void:
	if _audio == null:
		return
	var frequency: float = {"C": 261.63, "D": 293.66, "E": 329.63, "F": 349.23, "G": 392.0, "A": 440.0, "B": 493.88}.get(note, 392.0)
	var samples: int = 4410
	var bytes = PackedByteArray()
	bytes.resize(samples * 2)
	for i in range(samples):
		var envelope: float = sin(PI * float(i) / float(samples))
		var sample: int = int(sin(TAU * frequency * float(i) / 22050.0) * 11000.0 * envelope)
		bytes.encode_s16(i * 2, sample)
	var sound = AudioStreamWAV.new()
	sound.format = AudioStreamWAV.FORMAT_16_BITS
	sound.mix_rate = 22050
	sound.data = bytes
	_audio.stream = sound
	_audio.play()
