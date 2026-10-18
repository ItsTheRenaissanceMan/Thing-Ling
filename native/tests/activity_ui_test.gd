extends SceneTree
## Integration tests press the actual native Control handlers, never mutate job state.
const Activity = preload("res://scripts/activities.gd")
const Rules = preload("res://scripts/activity_rules.gd")
var panel: Control
var checks: int = 0
var failures: Array = []
var finished_results: Array = []
var shopping_requests: Array = []
var errors: Array = []

func _init() -> void:
	call_deferred("_run")

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)
		push_error(message)

func nodes_of_type(node: Node, kind: String) -> Array:
	var found: Array = []
	if node.is_class(kind): found.append(node)
	for child in node.get_children(): found.append_array(nodes_of_type(child, kind))
	return found

func button_text(button: Button) -> String:
	if not button.text.is_empty(): return button.text
	for label in nodes_of_type(button, "Label"):
		return str(label.text)
	return ""

func press(text: String, exact: bool = true) -> bool:
	for button in nodes_of_type(panel, "Button"):
		var label: String = button_text(button)
		if (label == text if exact else label.contains(text)) and not button.disabled:
			button.pressed.emit()
			await process_frame
			return true
	check(false, "Actual UI button is available: " + text)
	return false

func open(venue: String, language: String, level: int, mode: String = "work", inventory: Dictionary = {}, shift: int = 0) -> void:
	if is_instance_valid(panel):
		root.remove_child(panel)
		panel.queue_free()
		await process_frame
	panel = Activity.new()
	var theme = Theme.new()
	theme.default_font = load("res://assets/NotoSansCJKsc-Regular.otf")
	theme.default_font_size = 18
	panel.theme = theme
	root.add_child(panel)
	panel.finished.connect(func(result): finished_results.append(result))
	panel.shopping_requested.connect(func(spec): shopping_requests.append(spec))
	panel.setup(venue, language, level, mode, inventory, shift)
	await process_frame
	check(panel.get_state().stage == "grammar", venue + " begins with complete sentence work")

func screenshot(name: String) -> void:
	if DisplayServer.get_name() == "headless": return
	await process_frame
	await RenderingServer.frame_post_draw
	DirAccess.make_dir_recursive_absolute("res://test-output")
	var image = root.get_texture().get_image()
	image.save_png("res://test-output/activity-" + name + ".png")

func solve_sentence(use_reading: bool = false) -> void:
	var state = panel.get_state()
	var challenge = Rules.get_challenge(state)
	var translation: Dictionary = challenge.translations[state.language]
	if state.kind == "cafe":
		var recipe: Dictionary = Rules.current_round(state).recipe
		check(str(challenge.prompt).contains(str(recipe.name)), "Grammar prompt names the actual ordered recipe")
		var lexicon: Dictionary = Rules.recipe_lexicon().recipes[state.recipe_id].translations[state.language]
		check(str(translation.answer).contains(str(lexicon.name)), "Native confirmation matches the actual dish, not an unrelated tea order")
	if int(state.level) == 1:
		await press(str(translation.answer))
	elif int(state.level) == 2:
		for token in translation.tokens:
			await press(str(token))
		await press("Check my sentence")
	else:
		var text_edits = nodes_of_type(panel, "TextEdit")
		check(text_edits.size() == 1, "Advanced sentence entry is present")
		if text_edits.is_empty(): return
		text_edits[0].text = str(translation.get("reading", translation.answer)) if use_reading else str(translation.answer)
		await press("Check my sentence")
	check(panel.get_state().stage != "grammar" or int(panel.get_state().round) > int(state.round), "Actual full-sentence UI advances or finishes its work request: " + str(state.venue))

func solve_cafe(capture_prefix: String, use_reading: bool = false) -> void:
	var first: bool = true
	for iteration in range(250):
		var state = panel.get_state()
		if state.stage == "complete":
			check(state.completed_rounds.size() == 3, "Actual café UI completes all three customer orders")
			await screenshot(capture_prefix + "-complete")
			await press("Finish and return to my host")
			return
		if state.stage == "grammar":
			if first: await screenshot(capture_prefix + "-sentence")
			await solve_sentence(use_reading)
			continue
		var recipe: Dictionary = Rules.current_round(state).recipe
		if state.stage == "ingredients":
			if first:
				var before: int = state.mistakes
				await press("sugar", false)
				check(int(panel.get_state().mistakes) == before + 1 and panel.get_state().ingredients.is_empty(), "A wrong ingredient gives feedback and does not change the recipe")
				await screenshot(capture_prefix + "-ingredients")
			for ingredient in recipe.ingredients:
				for quantity in range(int(recipe.ingredients[ingredient])):
					await press(str(ingredient), false)
		elif state.stage == "prepare":
			if first:
				var mistakes: int = int(state.mistakes)
				await press("Mix everything gently")
				check(int(panel.get_state().mistakes) == mistakes + 1 and panel.get_state().sequence_index == 0, "Out-of-order preparation cannot advance the actual UI")
				await screenshot(capture_prefix + "-preparation")
				first = false
			for operation in recipe.steps:
				await press(str(Rules.data().operations[operation]))
		elif state.stage == "serve":
			await press("Serve the complete order")
	check(false, "Café Control did not finish its three-order shift")

func fill_number(value: int) -> void:
	var inputs = nodes_of_type(panel, "LineEdit")
	check(inputs.size() == 1, "Numeric task exposes one actual input")
	if inputs.is_empty(): return
	inputs[0].text = str(value)
	await press("Check the amount")

func solve_market() -> void:
	var tried_bad_change: bool = false
	for iteration in range(120):
		var state = panel.get_state()
		if state.stage == "complete":
			check(state.receipts.size() == (1 if state.mode == "customer" else 3), "Actual checkout UI issues a receipt for every transaction")
			await screenshot("market-" + str(state.mode) + "-receipt")
			await press("Finish and return to my host")
			return
		if state.stage == "grammar":
			await solve_sentence(state.language == "zh")
		elif state.stage == "substitute":
			var shopping: Dictionary = Rules.get_venue_spec(state.venue).shopping[str(state.level)]
			var bad: String = "juice"
			await press(panel._word_native(bad), false)
			check(panel.get_state().stage == "substitute", "Over-budget substitute is rejected by the actual UI")
			await press(panel._word_native(shopping.replacement), false)
		elif state.stage == "scan":
			await screenshot("market-" + str(state.mode) + "-scan")
			for item in state.basket:
				for quantity in range(int(state.basket[item])):
					await press(panel._word_native(item), false)
		elif state.stage == "payment":
			var correct: int = Rules.total_for(state.basket) if state.mode == "customer" else int(state.tender) - Rules.total_for(state.basket)
			if not tried_bad_change:
				await fill_number(correct + 10)
				check(panel.get_state().stage == "payment", "Wrong payment/change cannot complete the UI transaction")
				tried_bad_change = true
			await fill_number(correct)
	check(false, "Market Control did not finish its transactions")

func solve_job(venue: String) -> void:
	for iteration in range(250):
		var state = panel.get_state()
		if state.stage == "complete":
			check(state.completed_rounds.size() == 3, venue + " completes all three authored work requests through actual controls")
			await press("Finish and return to my host")
			return
		if state.stage == "grammar":
			await solve_sentence()
			continue
		var task = Rules.current_task(state)
		match str(task.type):
			"choice":
				for option in task.options:
					if str(option.value) == str(task.answer):
						await press(str(option.label))
						break
			"number": await fill_number(int(task.answer))
			"sentence": await solve_sentence()
			"sequence":
				var value: String = str(task.sequence[int(state.sequence_index)])
				await press(str(task.get("labels", {}).get(value, value)))
			"set":
				for value in task.answer:
					if value not in state.selected: await press(panel._word_native(value), false)
				await press("Check this set")
			"change":
				var remaining: int = int(task.answer) - int(state.change_total)
				if remaining == 0:
					await press("Confirm the counted cash")
				else:
					for coin in task.denominations:
						if int(coin) <= remaining:
							await press(Rules.money(int(coin)))
							break
			"seats":
				var solution: Array = []
				for row in task.rows:
					if bool(task.get("accessible", false)) and row != "A": continue
					for start in range(1, int(task.columns) - int(task.count) + 2):
						var candidate: Array = []
						for offset in range(int(task.count)):
							var seat: String = str(row) + str(start + offset)
							if seat not in task.occupied: candidate.append(seat)
						if candidate.size() == int(task.count):
							solution = candidate
							break
					if not solution.is_empty(): break
				for seat in solution: await press(seat)
				await screenshot("cinema-seats")
				await press("Confirm these seats")
			"rhythm":
				await press("TAP  /  SPACE")
				for interval in task.intervals:
					var target_time: int = int(panel.get_state().last_tap) + int(interval)
					var remaining: float = float(target_time - Time.get_ticks_msec()) / 1000.0
					if remaining > 0.0: await create_timer(remaining).timeout
					await press("TAP  /  SPACE")
				check(panel.get_state().feedback_good, venue + " follows real elapsed-time rhythm taps: " + str(panel.get_state().feedback))
		if venue in ["school", "post-office", "workshop", "bank", "nightlife", "music-studio"] and int(state.round) == 0 and int(state.task_index) == 0:
			await screenshot("job-" + venue)
	check(false, venue + " Control did not finish its actual authored workflow")

func _run() -> void:
	root.size = Vector2i(1440, 900)
	await open("lantern-cafe", "de", 1)
	await solve_cafe("cafe-de-beginner")
	check(finished_results.size() == 1 and finished_results[-1].success, "Completed café UI emits exactly one earned result")
	panel._finish()
	check(finished_results.size() == 1, "Repeated Finish cannot duplicate the reward signal")
	await open("supermarket", "de", 1)
	await solve_market()
	check(finished_results.size() == 2, "Cashier UI completes three customers")
	var list = Rules.get_shopping_list("supermarket", 2, "ja")
	await open("supermarket", "ja", 2, "customer", list.items)
	await solve_market()
	check(finished_results.size() == 3, "Japanese sentence composer plus physical customer UI completes a purchase")
	await open("lantern-cafe", "zh", 3, "work", {}, 2)
	await solve_cafe("cafe-zh-advanced", true)
	check(finished_results.size() == 4, "Advanced Mandarin full pinyin sentences and layered recipes complete a shift")
	await open("kettle-on", "es", 2, "work", {}, 4)
	await solve_cafe("cafe-es-composer")
	check(finished_results.size() == 5, "Spanish sentence ordering and rotating recipes complete a shift")
	for venue in Rules.data().venues:
		if Rules.get_venue_spec(venue).kind != "tasks": continue
		await open(venue, "de", 1)
		await solve_job(venue)
	for venue in ["breakfast-club", "restaurant"]:
		await open(venue, "de", 1)
		await solve_cafe(venue)
	check(finished_results.size() == 30, "Every one of 28 venues completes an actual Control workflow, with extra language and buyer-role runs")
	await open("supermarket", "de", 1, "customer", {})
	await solve_sentence()
	await press(panel._word_native("apple"), false)
	check(panel.get_state().scanned.is_empty(), "The actual customer UI rejects products not physically collected")
	await press("Take this list into the shop")
	check(shopping_requests.size() == 1 and shopping_requests[0].items == Rules.get_shopping_list().items, "Shopping-list button emits the real collection objective")
	check(finished_results.size() == 30, "An unfinished empty-bag trip emits no completed reward")
	root.remove_child(panel)
	panel.queue_free()
	await process_frame
	print("ACTIVITY UI TEST: %d checks, %d completed real Control shifts, %d failures" % [checks, finished_results.size(), failures.size()])
	quit(0 if failures.is_empty() else 1)
