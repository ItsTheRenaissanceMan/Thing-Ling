extends RefCounted
## Pure, immutable job simulation. All monetary values are integer cents.
## Opening a job never grants items, progress or rewards.

static var _data: Dictionary = {}
static var _language_script: Script
static var _recipe_lexicon: Dictionary = {}

static func recipe_lexicon() -> Dictionary:
	if _recipe_lexicon.is_empty() and FileAccess.file_exists("res://data/drink_names.json"):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/drink_names.json"))
		if parsed is Dictionary:
			_recipe_lexicon = parsed
	return _recipe_lexicon

static func data() -> Dictionary:
	if _data.is_empty():
		var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/activities.json"))
		if parsed is Dictionary:
			_data = parsed
	return _data

static func get_venue_spec(venue_id: String) -> Dictionary:
	return data().get("venues", {}).get(venue_id, {}).duplicate(true)

static func money(cents: int) -> String:
	return "€%.2f" % (float(cents) / 100.0)

static func get_shopping_list(venue_id: String = "supermarket", level: int = 1, language: String = "de") -> Dictionary:
	var spec = get_venue_spec(venue_id)
	var shopping = spec.get("shopping", {}).get(str(clampi(level, 1, 3)), {})
	var original: Dictionary = shopping.get("items", {}).duplicate(true)
	var items = original.duplicate(true)
	var alternatives: Array = []
	if shopping.has("unavailable"):
		var unavailable: String = shopping.unavailable
		var replacement: String = shopping.replacement
		items.erase(unavailable)
		items[replacement] = int(original.get(unavailable, 1))
		alternatives.append({"unavailable": unavailable, "replacement": replacement, "options": shopping.get("alternatives", [])})
	return {"venue": venue_id, "title": "Your market shopping list", "language": language, "level": clampi(level, 1, 3), "items": items, "original_items": original, "budget_cents": int(shopping.get("budget", 500)), "substitutions": alternatives}

static func total_for(basket: Dictionary) -> int:
	var total: int = 0
	for item in basket:
		total += int(data().get("prices", {}).get(item, 0)) * int(basket[item])
	return total

static func get_shift_queue(venue_id: String, level: int, shift_index: int = 0) -> Array:
	var spec = get_venue_spec(venue_id)
	var tier: int = clampi(level, 1, 3)
	if shift_index <= 0:
		return spec.get("queues", {}).get(str(tier), []).duplicate()
	var pool: Array = []
	for id in spec.get("menu", []):
		if int(data().recipes.get(id, {}).get("tier", 1)) <= tier:
			pool.append(id)
	if pool.is_empty():
		return spec.get("queues", {}).get(str(tier), []).duplicate()
	var queue: Array = []
	for index in range(3):
		queue.append(pool[(shift_index * 3 + index) % pool.size()])
	queue.sort_custom(func(a, b): return int(data().recipes[a].tier) < int(data().recipes[b].tier))
	return queue

static func create_state(venue_id: String, language: String, level: int, mode: String = "work", inventory: Dictionary = {}, shift_index: int = 0) -> Dictionary:
	var spec = get_venue_spec(venue_id)
	if spec.is_empty():
		return {"venue": venue_id, "language": language, "level": 1, "mode": mode, "stage": "unavailable", "feedback": "This venue has no authored activity. Return to the town guide.", "success": false}
	var clean_inventory: Dictionary = {}
	for id in inventory:
		if (inventory[id] is int or inventory[id] is float) and int(inventory[id]) > 0:
			clean_inventory[str(id)] = int(inventory[id])
	var state: Dictionary = {"venue": venue_id, "language": language if language in ["de", "ja", "es", "zh"] else "de", "level": clampi(level, 1, 3), "mode": "customer" if venue_id == "supermarket" and mode == "customer" else "work", "kind": spec.kind, "shift_index": maxi(0, shift_index), "round": 0, "task_index": 0, "sequence_index": 0, "ingredients": {}, "scanned": {}, "selected": [], "change_total": 0, "rhythm_index": 0, "last_tap": -1, "correct": 0, "mistakes": 0, "feedback": "", "feedback_good": true, "inventory": clean_inventory, "stage": "grammar", "completed_rounds": [], "receipts": []}
	_initialise_round(state)
	return state

static func _initialise_round(state: Dictionary) -> void:
	state.stage = "grammar"
	state.task_index = 0
	state.sequence_index = 0
	state.ingredients = {}
	state.scanned = {}
	state.selected = []
	state.change_total = 0
	state.rhythm_index = 0
	state.last_tap = -1
	var spec = get_venue_spec(state.venue)
	if state.kind == "cafe":
		var queue: Array = get_shift_queue(state.venue, int(state.level), int(state.get("shift_index", 0)))
		state.recipe_id = queue[int(state.round)]
	elif state.kind == "market":
		if state.mode == "customer":
			var shopping: Dictionary = spec.shopping[str(state.level)]
			state.basket = shopping["items"].duplicate(true)
			state.budget = int(shopping.budget)
			state.tender = state.budget
			state.substituted = false
		else:
			var customer: Dictionary = spec.customers[int(state.round)]
			state.basket = customer.basket.duplicate(true)
			if int(state.level) >= 2:
				state.basket["carrot"] = int(state.round) + 1
			if int(state.level) >= 3:
				state.basket["rice"] = int(state.basket.get("rice", 0)) + 1
			state.tender = maxi(int(customer.tender), ceili(float(total_for(state.basket)) / 500.0) * 500)

static func round_count(state: Dictionary) -> int:
	if state.get("kind", "") == "market" and state.get("mode", "") == "customer":
		return 1
	if state.get("kind", "") == "tasks":
		return get_venue_spec(state.venue).get("rounds", []).size()
	return 3

static func current_round(state: Dictionary) -> Dictionary:
	var spec = get_venue_spec(str(state.get("venue", "")))
	if spec.is_empty() or state.get("stage", "") == "complete":
		return {}
	if state.kind == "cafe":
		var recipe: Dictionary = data().recipes.get(state.get("recipe_id", ""), {})
		var localized: Dictionary = recipe_lexicon().get("recipes", {}).get(state.get("recipe_id", ""), {}).get("translations", recipe.get("translations", {}))
		var translation: Dictionary = localized.get(state.language, {})
		var template: String = data().get("order_templates", {}).get(state.language, ["{dish}"])[int(state.level) - 1]
		return {"title": recipe.get("name", "Order"), "request": "Prepare " + str(recipe.get("name", "this order")) + " exactly as shown on its recipe card.", "native_request": template.replace("{dish}", str(translation.get("name", recipe.get("name", "")))), "reading": translation.get("reading", ""), "recipe": recipe}
	if state.kind == "market":
		var title: String = "Your shopping trip" if state.mode == "customer" else "Customer: " + str(spec.customers[int(state.round)].name)
		return {"title": title, "request": "Scan the physical items in your basket, stay within the shopping budget, and pay the exact total." if state.mode == "customer" else "Scan each item and its quantity, then count the customer’s change.", "basket": state.get("basket", {}), "tender": state.get("tender", 0), "total": total_for(state.get("basket", {}))}
	var rounds: Array = spec.get("rounds", [])
	return rounds[int(state.round)] if int(state.round) < rounds.size() else {}

static func current_task(state: Dictionary) -> Dictionary:
	if state.get("kind", "") != "tasks":
		return {}
	var tasks: Array = current_round(state).get("tasks", [])
	return tasks[int(state.task_index)] if int(state.get("task_index", 0)) < tasks.size() else {}

static func get_challenge(state: Dictionary) -> Dictionary:
	if _language_script == null and FileAccess.file_exists("res://scripts/language.gd"):
		_language_script = load("res://scripts/language.gd")
	if state.get("kind", "") == "cafe":
		return _recipe_challenge(state)
	var base: String = str(get_venue_spec(str(state.get("venue", ""))).get("challenge", ""))
	if state.get("stage", "") == "task" and current_task(state).get("type", "") == "sentence":
		base = str(current_task(state).get("challenge", base))
	if _language_script == null and FileAccess.file_exists("res://scripts/language.gd"):
		_language_script = load("res://scripts/language.gd")
	if _language_script != null:
		var challenge = _language_script.get_challenge(base, int(state.get("level", 1)))
		if challenge is Dictionary:
			return challenge
	return {}

static func _recipe_challenge(state: Dictionary) -> Dictionary:
	var lexicon = recipe_lexicon()
	if lexicon.is_empty():
		return {}
	var recipe: Dictionary = data().recipes.get(state.get("recipe_id", ""), {})
	var recipe_names: Dictionary = lexicon.get("recipes", {}).get(state.get("recipe_id", ""), {}).get("translations", recipe.get("translations", {}))
	var tier: int = clampi(int(state.get("level", 1)), 1, 3)
	var template: Dictionary = lexicon.get("templates", {}).get(str(tier), {})
	var challenge: Dictionary = {"id": "recipe-" + str(state.get("recipe_id", "")) + "-" + str(tier), "tier": tier, "prompt": "Confirm the actual order: " + str(recipe.get("name", "this order")) + ".", "context": "You are preparing the current guest’s order. Confirm its name and the careful preparation requested.", "grammar": template.get("grammar", "Confirm a complete food or drink order politely."), "translations": {}}
	var ingredient_names: PackedStringArray = []
	for id in recipe.get("ingredients", {}):
		ingredient_names.append("%s × %d" % [str(id), int(recipe.ingredients[id])])
	challenge.prompt += " Recipe: " + ", ".join(ingredient_names) + "."
	for language in ["de", "ja", "es", "zh"]:
		var names: Dictionary = recipe_names.get(language, {})
		var source: Dictionary = template.get("translations", {}).get(language, {})
		var translation: Dictionary = {}
		for key in source:
			var value = source[key]
			if value is String:
				translation[key] = value.replace("{dish}", str(names.get("name", recipe.get("name", "")))).replace("{reading}", str(names.get("reading", names.get("name", ""))))
			elif value is Array:
				var parts: Array = []
				for part in value:
					parts.append(str(part).replace("{dish}", str(names.get("name", recipe.get("name", "")))).replace("{reading}", str(names.get("reading", names.get("name", "")))))
				translation[key] = parts
			else:
				translation[key] = value.duplicate(true) if value is Dictionary else value
		translation["accepted"] = [str(translation.get("answer", "")), str(translation.get("reading", ""))]
		challenge.translations[language] = translation
	return challenge

static func _sentence_correct(answer: String, state: Dictionary) -> bool:
	var challenge = get_challenge(state)
	if challenge.is_empty():
		return false
	if _language_script != null:
		return _language_script.check_answer(answer, challenge, state.language)
	return false

static func missing_inventory(state: Dictionary) -> Dictionary:
	var missing: Dictionary = {}
	if state.get("mode", "") != "customer":
		return missing
	for id in state.get("basket", {}):
		var need: int = int(state.basket[id]) - int(state.inventory.get(id, 0))
		if need > 0:
			missing[id] = need
	return missing

static func _reject(state: Dictionary, message: String) -> Dictionary:
	state.mistakes = int(state.get("mistakes", 0)) + 1
	state.feedback = message
	state.feedback_good = false
	return state

static func _accept(state: Dictionary, message: String = "That’s right. Keep going.") -> void:
	state.correct = int(state.correct) + 1
	state.feedback = message
	state.feedback_good = true

static func _counts_complete(selected: Dictionary, needed: Dictionary) -> bool:
	for id in needed:
		if int(selected.get(id, 0)) != int(needed[id]):
			return false
	return true

static func _after_grammar(state: Dictionary) -> void:
	if state.kind == "cafe":
		state.stage = "ingredients"
	elif state.kind == "market":
		var spec = get_venue_spec(state.venue)
		var shopping: Dictionary = spec.get("shopping", {}).get(str(state.level), {})
		state.stage = "substitute" if state.mode == "customer" and shopping.has("unavailable") else "scan"
	else:
		state.stage = "task"

static func _advance_round(state: Dictionary) -> void:
	state.completed_rounds.append(int(state.round))
	state.round = int(state.round) + 1
	if int(state.round) >= round_count(state):
		state.stage = "complete"
		state.feedback = "Every request is complete. Your careful work made a difference."
		state.feedback_good = true
	else:
		_initialise_round(state)
		state.feedback = "Request completed. Greet the next customer with a full sentence."

static func _advance_task(state: Dictionary) -> void:
	state.task_index = int(state.task_index) + 1
	state.sequence_index = 0
	state.selected = []
	state.change_total = 0
	state.rhythm_index = 0
	state.last_tap = -1
	if int(state.task_index) >= current_round(state).get("tasks", []).size():
		_advance_round(state)

static func _numeric(value) -> bool:
	return (value is int or value is float) and is_finite(float(value))

static func apply_action(previous: Dictionary, action: Dictionary) -> Dictionary:
	var state: Dictionary = previous.duplicate(true)
	var type: String = str(action.get("type", ""))
	if state.get("stage", "") in ["complete", "unavailable"]:
		return state
	if state.stage == "grammar":
		if type != "sentence" or not _sentence_correct(str(action.get("answer", "")), state):
			return _reject(state, "Try the complete sentence again. Read the grammar hint and check the word order.")
		_accept(state, "A useful sentence, clearly said. Now put it into practice.")
		_after_grammar(state)
		return state
	if state.kind == "cafe":
		return _apply_cafe(state, action)
	if state.kind == "market":
		return _apply_market(state, action)
	if state.stage == "task":
		return _apply_task(state, action)
	return _reject(state, "Choose an action for the current stage.")

static func _apply_cafe(state: Dictionary, action: Dictionary) -> Dictionary:
	var recipe: Dictionary = current_round(state).recipe
	var type: String = str(action.get("type", ""))
	if state.stage == "ingredients":
		if type != "ingredient":
			return _reject(state, "Measure the recipe’s ingredients before using the equipment.")
		var id: String = str(action.get("id", ""))
		if not recipe.ingredients.has(id):
			return _reject(state, "That ingredient is not in this recipe. The order has not been changed.")
		if int(state.ingredients.get(id, 0)) >= int(recipe.ingredients[id]):
			return _reject(state, "That ingredient is already measured. Extra portions would change the recipe.")
		state.ingredients[id] = int(state.ingredients.get(id, 0)) + 1
		_accept(state, "Ingredient measured and checked.")
		if _counts_complete(state.ingredients, recipe.ingredients):
			state.stage = "prepare"
			state.sequence_index = 0
		return state
	if state.stage == "prepare":
		if type == "restart_preparation":
			state.sequence_index = 0
			state.feedback = "Preparation reset. Your measured ingredients are ready to use again."
			return state
		if type != "step":
			return _reject(state, "Follow the equipment steps on the recipe card before serving.")
		var expected: String = str(recipe.steps[int(state.sequence_index)])
		if str(action.get("id", "")) != expected:
			return _reject(state, "That operation is out of order. Review the recipe card, then retry this step.")
		state.sequence_index = int(state.sequence_index) + 1
		_accept(state, str(data().operations.get(expected, expected)) + " — done.")
		if int(state.sequence_index) >= recipe.steps.size():
			state.stage = "serve"
		return state
	if state.stage == "serve" and type == "serve":
		_accept(state, "The complete order was served to the right guest.")
		_advance_round(state)
		return state
	return _reject(state, "Complete this order’s preparation before serving it.")

static func _apply_market(state: Dictionary, action: Dictionary) -> Dictionary:
	var type: String = str(action.get("type", ""))
	var spec = get_venue_spec(state.venue)
	if state.stage == "substitute":
		if type != "substitute":
			return _reject(state, "Choose an available substitute that keeps the complete basket within budget.")
		var shopping: Dictionary = spec.shopping[str(state.level)]
		var id: String = str(action.get("id", ""))
		if id not in shopping.alternatives:
			return _reject(state, "That item is not one of the available substitutes.")
		var candidate: Dictionary = state.basket.duplicate(true)
		var amount: int = int(candidate.get(shopping.unavailable, 1))
		candidate.erase(shopping.unavailable)
		candidate[id] = int(candidate.get(id, 0)) + amount
		if total_for(candidate) > int(state.budget):
			return _reject(state, "This substitute puts the basket over budget. Compare unit prices and quantities.")
		state.basket = candidate
		state.substituted = true
		state.stage = "scan"
		_accept(state, "An affordable substitute is on the list. Collect it from a real shelf before checkout.")
		return state
	if state.stage == "scan":
		if type != "scan":
			return _reject(state, "Scan each listed item in its correct quantity before payment.")
		var id: String = str(action.get("id", ""))
		if not state.basket.has(id):
			return _reject(state, "That item is not on this customer’s list.")
		var quantity: int = int(state.scanned.get(id, 0))
		if quantity >= int(state.basket[id]):
			return _reject(state, "That quantity is already scanned. Do not charge for an extra item.")
		if state.mode == "customer" and int(state.inventory.get(id, 0)) <= quantity:
			return _reject(state, "That item is not in your physical shopping bag. Return to the aisles and collect it first.")
		state.scanned[id] = quantity + 1
		_accept(state, "Item scanned. The receipt now matches the basket.")
		if _counts_complete(state.scanned, state.basket):
			state.stage = "payment"
		return state
	if state.stage == "payment":
		var total: int = total_for(state.basket)
		var expected: int = total if state.mode == "customer" else int(state.tender) - total
		if type != "payment" or not _numeric(action.get("amount")) or float(action.amount) != float(expected):
			return _reject(state, "Check the receipt and count again. Enter cents, including both euros and cents.")
		if state.mode == "customer" and total > int(state.budget):
			return _reject(state, "This basket exceeds your budget; it cannot be purchased.")
		state.receipts.append({"basket": state.basket.duplicate(true), "total_cents": total, "tender_cents": int(state.tender), "change_cents": int(state.tender) - total})
		_accept(state, "Payment checked and a clear receipt issued.")
		_advance_round(state)
		return state
	return _reject(state, "Complete the current checkout stage first.")

static func _apply_task(state: Dictionary, action: Dictionary) -> Dictionary:
	var task: Dictionary = current_task(state)
	var type: String = str(action.get("type", ""))
	match str(task.get("type", "")):
		"choice":
			if type != "choose" or str(action.get("value", "")) != str(task.answer):
				return _reject(state, str(task.get("explanation", "")) if not str(task.get("explanation", "")).is_empty() else "Read the request again and choose the option that meets all of its details.")
		"number":
			if type != "number" or not _numeric(action.get("value")) or float(action.value) != float(task.answer):
				return _reject(state, "Check the quantities and units, then calculate again. This request has not advanced.")
		"sentence":
			if type != "sentence" or not _sentence_correct(str(action.get("answer", "")), state):
				return _reject(state, "Build the whole sentence again, using the grammar and reading hints.")
		"sequence":
			if type != "sequence" or str(action.get("value", "")) != str(task.sequence[int(state.sequence_index)]):
				return _reject(state, "That step is out of order. Your earlier correct steps are saved; retry the current one.")
			state.sequence_index = int(state.sequence_index) + 1
			_accept(state, "Step completed in the correct order.")
			if int(state.sequence_index) < task.sequence.size():
				return state
		"set":
			if type == "toggle":
				var id: String = str(action.get("value", ""))
				var available: Array = task.options.map(func(option): return str(option.value))
				if id not in available:
					return _reject(state, "Choose an item from the available rack.")
				if id in state.selected:
					state.selected.erase(id)
				else:
					state.selected.append(id)
				return state
			if type != "confirm_set":
				return _reject(state, "Choose the complete set of supplies, then check it.")
			var selected: Array = state.selected.duplicate()
			var needed: Array = task.answer.duplicate()
			selected.sort()
			needed.sort()
			if selected != needed:
				return _reject(state, "The set is incomplete or contains an unsuitable item. Compare it with the request.")
		"change":
			if type == "clear_change":
				state.change_total = 0
				return state
			if type == "coin":
				var value: int = int(action.get("value", -1))
				var denominations: Array = task.denominations.map(func(coin): return int(coin))
				if value not in denominations or int(state.change_total) + value > int(task.answer):
					return _reject(state, "That denomination would exceed the amount. Choose a smaller coin or clear the tray.")
				state.change_total = int(state.change_total) + value
				return state
			if type != "confirm_change" or int(state.change_total) != int(task.answer):
				return _reject(state, "Count the tray again. It must equal the exact requested amount.")
		"seats":
			if type == "seat":
				var seat: String = str(action.get("value", ""))
				var valid: bool = seat.length() >= 2 and seat.substr(0, 1) in task.rows and seat.substr(1).is_valid_int() and int(seat.substr(1)) >= 1 and int(seat.substr(1)) <= int(task.columns)
				if not valid or seat in task.occupied:
					return _reject(state, "That seat is occupied or outside this auditorium.")
				if seat in state.selected:
					state.selected.erase(seat)
				else:
					state.selected.append(seat)
				return state
			if type != "confirm_seats" or not _valid_seats(state.selected, task):
				return _reject(state, "Choose the requested number of adjacent free seats in one row. Accessible bookings use row A.")
		"rhythm":
			if type != "tap" or not _numeric(action.get("time_ms")) or int(action.time_ms) < 0:
				return _reject(state, "Tap the rhythm pad to start the timing pattern.")
			var now: int = int(action.time_ms)
			if int(state.last_tap) < 0:
				state.last_tap = now
				state.feedback = "Pattern started. Follow the displayed interval for your next tap."
				state.feedback_good = true
				return state
			var interval: int = int(task.intervals[int(state.rhythm_index)])
			var tolerance: int = [240, 180, 130][int(state.level) - 1]
			var elapsed: int = now - int(state.last_tap)
			if absi(elapsed - interval) > tolerance:
				state.rhythm_index = 0
				state.last_tap = -1
				return _reject(state, "Tap spacing was %d ms; aim for %d ms (±%d). Tap once to restart the pattern." % [elapsed, interval, tolerance])
			state.last_tap = now
			state.rhythm_index = int(state.rhythm_index) + 1
			_accept(state, "On the beat. Keep the same careful timing.")
			if int(state.rhythm_index) < task.intervals.size():
				return state
		_:
			return _reject(state, "This task has no valid action. Return to your host.")
	_accept(state, "Request checked and completed.")
	_advance_task(state)
	return state

static func _valid_seats(selected: Array, task: Dictionary) -> bool:
	if selected.size() != int(task.count):
		return false
	var row: String = str(selected[0]).substr(0, 1)
	if bool(task.get("accessible", false)) and row != "A":
		return false
	var columns: Array = []
	for seat in selected:
		if str(seat).substr(0, 1) != row or seat in task.occupied:
			return false
		columns.append(int(str(seat).substr(1)))
	columns.sort()
	for i in range(1, columns.size()):
		if int(columns[i]) != int(columns[i - 1]) + 1:
			return false
	return true

static func get_result(state: Dictionary) -> Dictionary:
	var success: bool = state.get("stage", "") == "complete"
	var spec = get_venue_spec(str(state.get("venue", "")))
	var errors: int = int(state.get("mistakes", 0))
	var score: int = maxi(0, 100 - errors * 3) if success else 0
	return {"venue": str(state.get("venue", "")), "mode": str(state.get("mode", "work")), "success": success, "score": score, "xp": maxi(20, int(spec.get("reward", {}).get("xp", 60)) + int(state.get("level", 1)) * 10 - errors * 2) if success else 0, "coins": maxi(3, int(spec.get("reward", {}).get("coins", 18)) + int(state.get("level", 1)) * 4 - errors) if success else 0, "items": {}, "receipts": state.get("receipts", []).duplicate(true), "completed_rounds": state.get("completed_rounds", []).size(), "mistakes": errors, "summary": "%s: %d complete requests, %d careful actions, %d learning corrections." % [spec.get("title", "Activity"), state.get("completed_rounds", []).size(), int(state.get("correct", 0)), errors] if success else "The activity is not finished. Your town progress and inventory remain safe."}

static func validate_content() -> Array:
	var errors: Array = []
	if data().get("venues", {}).size() != 28:
		errors.append("Exactly 28 venue activities are required.")
	if data().get("recipes", {}).size() < 24:
		errors.append("The kitchen needs at least 24 authored recipes.")
	for id in data().get("recipes", {}):
		var recipe: Dictionary = data().recipes[id]
		if recipe.get("ingredients", {}).is_empty() or recipe.get("steps", []).size() < 3:
			errors.append("Incomplete recipe: " + str(id))
		for operation in recipe.get("steps", []):
			if not data().get("operations", {}).has(operation):
				errors.append("Unknown operation: " + str(operation))
	for id in data().get("venues", {}):
		var spec: Dictionary = data().venues[id]
		if spec.get("challenge", "").is_empty():
			errors.append("Missing sentence curriculum: " + str(id))
		if spec.kind == "tasks" and spec.get("rounds", []).size() < 3:
			errors.append("Venue needs three work rounds: " + str(id))
		if spec.kind == "cafe":
			for level in ["1", "2", "3"]:
				for recipe in spec.get("queues", {}).get(level, []):
					if not data().recipes.has(recipe):
						errors.append("Unknown queued recipe: " + str(recipe))
	return errors
