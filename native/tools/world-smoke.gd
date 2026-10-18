extends SceneTree
func _initialize() -> void:
	var source = load("res://scripts/world.gd")
	if source == null:quit(1);return
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://data/vocabulary.json"))
	var words: Dictionary = {}
	for word in data.words: words[word.id] = word
	var world = source.new()
	root.add_child(world)
	var map = {"id":"town","width":40,"depth":40,"spawn":[0,8],"objects":[{"id":"cafe","wordId":"house","x":0,"z":0,"solid":true,"size":[12,7,10],"variant":"cafe"},{"id":"a-tree","wordId":"tree","x":10,"z":0,"solid":true}],"npcs":[{"id":"mika","x":4,"z":7,"route":[[4,7],[8,7]]}],"portals":[{"id":"cafe-door","label":"Copper Cafe","x":0,"z":5.6,"target":"kettle-on"}]}
	world.setup(map,words,"de",{"mika":{"id":"mika","name":"Mika","color":"df9b85"}})
	await process_frame
	await process_frame
	world.toggle_first_person()
	assert(world.get_camera_mode()=="first-person")
	assert(not world.player.rig.visible)
	if world._fps_room_shell!=null:assert(world._fps_room_shell.visible)
	assert(world.camera.position.distance_to(world.player.position+Vector3(0,1.48,0))<0.001)
	assert(world.get_interaction_distance("portal","cafe-door")<2.8)
	var position_before=world.get_player_position()
	world.toggle_first_person()
	assert(world.player.rig.visible)
	if world._fps_room_shell!=null:assert(not world._fps_room_shell.visible)
	assert(world.get_player_position()==position_before)
	print(JSON.stringify(world.get_diagnostics()))
	quit()
