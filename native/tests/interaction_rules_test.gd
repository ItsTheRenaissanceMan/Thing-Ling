extends SceneTree
func _initialize() -> void:
	var town = JSON.parse_string(FileAccess.get_file_as_string("res://data/town.json"))
	var story = JSON.parse_string(FileAccess.get_file_as_string("res://data/story.json"))
	var vocabulary = JSON.parse_string(FileAccess.get_file_as_string("res://data/vocabulary.json"))
	var controller = load("res://scripts/main.gd").new()
	controller.state.setup(town, story, vocabulary)
	var count = 0
	var failures: Array = []
	for quest in story.quests:
		for index in range(quest.steps.size()):
			var step: Dictionary = quest.steps[index]
			if str(step.type) != "collect":
				continue
			controller.state.progress = controller.state.fresh_progress("de")
			controller.state.progress.mapId = step.mapId
			controller.state.progress.quests[quest.id] = {"stage": index, "complete": false}
			var candidates: Array = controller.state.maps[step.mapId].objects.filter(func(object): return str(object.wordId) == str(step.wordId))
			count += 1
			if candidates.is_empty() or not controller._collectible(str(step.wordId), str(candidates[0].id)):
				failures.append("A required supply has no physical pickup action: " + str(quest.id) + "/" + str(step.wordId))
	controller.free()
	print("NATIVE_INTERACTION_RULES ", JSON.stringify({"passed": failures.is_empty(), "checks": count, "failures": failures}))
	quit(0 if failures.is_empty() else 1)
