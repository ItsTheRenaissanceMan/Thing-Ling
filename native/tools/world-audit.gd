extends SceneTree
var failures: Array=[]
func _initialize() -> void:
	await process_frame
	var data=JSON.parse_string(FileAccess.get_file_as_string("res://data/town.json"))
	var vocabulary=JSON.parse_string(FileAccess.get_file_as_string("res://data/vocabulary.json"))
	var words:Dictionary={};var npcs:Dictionary={}
	for word in vocabulary.words:words[word.id]=word
	for npc in data.npcs:npcs[npc.id]=npc
	var total_objects=0;var total_npcs=0
	for map in data.maps:
		var world=load("res://scripts/world.gd").new();root.add_child(world);world.setup(map,words,"de",npcs)
		world.set_active(false)
		var position_before=world.get_player_position()
		world.toggle_first_person()
		assert(world.get_camera_mode()=="first-person")
		assert(not world.player.rig.visible)
		if world._fps_room_shell!=null:assert(world._fps_room_shell.visible)
		assert(world.get_player_position()==position_before)
		world.toggle_first_person()
		assert(world.player.rig.visible)
		if world._fps_room_shell!=null:assert(not world._fps_room_shell.visible)
		assert(world.get_player_position()==position_before)
		await physics_frame
		await physics_frame
		var info=world.get_diagnostics()
		if not info.unknownWords.is_empty() or not info.missingModels.is_empty() or not info.oversizedModels.is_empty() or not info.playerInsideSolid.is_empty():failures.append(info)
		total_objects+=int(info.objects);total_npcs+=int(info.npcs)
		print(str(map.id)+": "+str(info.authoredObjects)+" props, "+str(info.objects)+" labelled instances, "+str(info.npcs)+" NPCs; clear spawn="+str(info.playerInsideSolid.is_empty()))
		world.queue_free();await process_frame
	print(JSON.stringify({"maps":data.maps.size(),"objects":total_objects,"npcs":total_npcs,"failures":failures}))
	quit(0 if failures.is_empty() else 1)
