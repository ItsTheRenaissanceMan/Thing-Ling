extends SceneTree
const Rules = preload("res://scripts/activity_rules.gd")
var checks: int = 0
var failures: Array = []
var workflows: int = 0

func _init() -> void:
	call_deferred("_run")

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)
		push_error(message)

func sentence_answer(state: Dictionary) -> String:
	return str(Rules.get_challenge(state).get("translations", {}).get(state.language, {}).get("answer", ""))

func next_action(state: Dictionary) -> Dictionary:
	if state.stage == "grammar":
		return {"type": "sentence", "answer": sentence_answer(state)}
	if state.kind == "cafe":
		var recipe: Dictionary = Rules.current_round(state).recipe
		if state.stage == "ingredients":
			for id in recipe.ingredients:
				if int(state.ingredients.get(id, 0)) < int(recipe.ingredients[id]):
					return {"type": "ingredient", "id": id}
		if state.stage == "prepare":
			return {"type": "step", "id": recipe.steps[int(state.sequence_index)]}
		return {"type": "serve"}
	if state.kind == "market":
		if state.stage == "substitute":
			return {"type": "substitute", "id": Rules.get_venue_spec(state.venue).shopping[str(state.level)].replacement}
		if state.stage == "scan":
			for id in state.basket:
				if int(state.scanned.get(id, 0)) < int(state.basket[id]):
					return {"type": "scan", "id": id}
		return {"type": "payment", "amount": Rules.total_for(state.basket) if state.mode == "customer" else int(state.tender) - Rules.total_for(state.basket)}
	var task = Rules.current_task(state)
	match str(task.type):
		"choice": return {"type": "choose", "value": task.answer}
		"number": return {"type": "number", "value": task.answer}
		"sentence": return {"type": "sentence", "answer": sentence_answer(state)}
		"sequence": return {"type": "sequence", "value": task.sequence[int(state.sequence_index)]}
		"set":
			for id in task.answer:
				if id not in state.selected:
					return {"type": "toggle", "value": id}
			return {"type": "confirm_set"}
		"change":
			var remaining: int = int(task.answer) - int(state.change_total)
			for coin in task.denominations:
				if int(coin) <= remaining:
					return {"type": "coin", "value": coin}
			return {"type": "confirm_change"}
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
			for seat in solution:
				if seat not in state.selected: return {"type": "seat", "value": seat}
			return {"type": "confirm_seats"}
		"rhythm":
			return {"type": "tap", "time_ms": 1000 if int(state.last_tap) < 0 else int(state.last_tap) + int(task.intervals[int(state.rhythm_index)])}
	return {"type": "invalid"}

func solve(initial: Dictionary, context: String) -> Dictionary:
	var state: Dictionary = initial
	for iteration in range(600):
		if state.stage == "complete":
			workflows += 1
			check(Rules.get_result(state).success, context + " returns a successful result")
			check(int(Rules.get_result(state).xp) > 0 and int(Rules.get_result(state).coins) > 0, context + " pays only the completed work")
			return state
		var previous: Dictionary = state.duplicate(true)
		var action = next_action(state)
		state = Rules.apply_action(state, action)
		check(initial.get("inventory", {}) == previous.get("inventory", {}), context + " never creates or spends physical inventory")
		if not state.get("feedback_good", true):
			check(false, context + " failed authored workflow at " + str(action) + ": " + str(state.feedback))
			return state
	check(false, context + " did not finish within its expected action count")
	return state

func _run() -> void:
	check(Rules.validate_content().is_empty(), "All authored activities and recipes validate")
	check(Rules.data().venues.size() == 28, "Every one of the 28 interiors has gameplay")
	check(Rules.data().recipes.size() == 30, "There are 24 drinks plus 6 meal recipes")
	var seen: Dictionary = {}
	for venue in ["kettle-on", "lantern-cafe", "breakfast-club", "restaurant"]:
		for shift in range(25):
			var queue = Rules.get_shift_queue(venue, 3, shift)
			check(queue.size() == 3, venue + " has three orders on every rotating shift")
			for recipe in queue: seen[recipe] = true
	check(seen.size() == 30, "All 30 recipes are reachable through ordinary rotating shifts")
	for venue in Rules.data().venues:
		for language in ["de", "ja", "es", "zh"]:
			for level in range(1, 4):
				var state = Rules.create_state(venue, language, level)
				var context: String = "%s/%s/tier%d" % [venue, language, level]
				check(not Rules.get_challenge(state).is_empty(), context + " has full sentence curriculum")
				var wrong = Rules.apply_action(state, {"type": "sentence", "answer": "bread"})
				check(wrong.stage == "grammar" and wrong.mistakes == 1, context + " rejects a noun instead of its full sentence")
				check(state.mistakes == 0, context + " applies actions immutably")
				check(not Rules.get_result(wrong).success and Rules.get_result(wrong).xp == 0, context + " cannot collect rewards before work")
				solve(state, context)
	for language in ["de", "ja", "es", "zh"]:
		for level in range(1, 4):
			var shopping = Rules.get_shopping_list("supermarket", level, language)
			var state = Rules.create_state("supermarket", language, level, "customer", shopping.items)
			var completed = solve(state, "physical customer/" + language + "/tier" + str(level))
			check(completed.receipts.size() == 1, "Customer receives an actual itemized receipt")
			check(int(completed.receipts[0].total_cents) <= int(shopping.budget_cents), "Customer completes within the authored budget")
			var empty = Rules.create_state("supermarket", language, level, "customer", {})
			empty = Rules.apply_action(empty, {"type": "sentence", "answer": sentence_answer(empty)})
			if empty.stage == "substitute": empty = Rules.apply_action(empty, {"type": "substitute", "id": Rules.get_venue_spec("supermarket").shopping[str(level)].replacement})
			var first: String = str(empty.basket.keys()[0])
			var blocked = Rules.apply_action(empty, {"type": "scan", "id": first})
			check(blocked.scanned.is_empty() and blocked.stage == "scan", "No customer can scan or receive items absent from the real bag")
	var cafe = Rules.create_state("lantern-cafe", "de", 1)
	cafe = Rules.apply_action(cafe, {"type": "sentence", "answer": sentence_answer(cafe)})
	var premature = Rules.apply_action(cafe, {"type": "serve"})
	check(premature.stage == "ingredients", "Serving cannot bypass ingredient measurement")
	var recipe: Dictionary = Rules.current_round(cafe).recipe
	for id in recipe.ingredients:
		for quantity in range(int(recipe.ingredients[id])): cafe = Rules.apply_action(cafe, {"type": "ingredient", "id": id})
	var bad_order = Rules.apply_action(cafe, {"type": "step", "id": "pour_milk"})
	check(bad_order.sequence_index == 0 and bad_order.stage == "prepare", "Wrong recipe order requires a real retry")
	var check_state = Rules.create_state("supermarket", "de", 1)
	check_state = Rules.apply_action(check_state, {"type": "sentence", "answer": sentence_answer(check_state)})
	while check_state.stage == "scan": check_state = Rules.apply_action(check_state, next_action(check_state))
	var required_change: int = int(check_state.tender) - Rules.total_for(check_state.basket)
	for value in [required_change + 1, required_change - 1, float(required_change) + 0.5, INF, NAN, -1]:
		var wrong_payment = Rules.apply_action(check_state, {"type": "payment", "amount": value})
		check(wrong_payment.stage == "payment" and wrong_payment.receipts.is_empty(), "Incorrect/fractional/nonfinite change is never accepted")
	check(Rules.create_state("unknown", "de", 1).stage == "unavailable", "Unknown venues do not fabricate a completed game")
	var quote = Rules.create_state("hotel", "de", 1)
	quote = Rules.apply_action(quote, {"type": "sentence", "answer": sentence_answer(quote)})
	quote = Rules.apply_action(quote, {"type": "choose", "value": "family"})
	for value in [16799, 16801, 16800.01, -16800, INF, NAN]:
		var wrong_quote = Rules.apply_action(quote, {"type": "number", "value": value})
		check(wrong_quote.stage == "task" and wrong_quote.task_index == quote.task_index and wrong_quote.mistakes == 1, "Numeric job quotes reject incorrect, fractional, negative, and nonfinite amounts exactly")
	for venue in ["lantern-cafe", "restaurant"]:
		for shift in range(1, 9): solve(Rules.create_state(venue, "ja", 3, "work", {}, shift), venue + " rotating menu " + str(shift))
	print("ACTIVITY TEST: %d checks, %d full workflows, %d failures" % [checks, workflows, failures.size()])
	quit(0 if failures.is_empty() else 1)
