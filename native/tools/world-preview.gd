extends SceneTree
func _initialize() -> void:
	await process_frame
	var args=OS.get_cmdline_user_args()
	var map_id=str(args[0]) if args.size()>0 else "town"
	var destination=str(args[1]) if args.size()>1 else "/tmp/thing-ling-native-world.png"
	var town=JSON.parse_string(FileAccess.get_file_as_string("res://data/town.json"))
	var source=JSON.parse_string(FileAccess.get_file_as_string("res://data/vocabulary.json"))
	var words:Dictionary={};var npcs:Dictionary={};var selected:Dictionary={}
	for word in source.words:words[word.id]=word
	for npc in town.npcs:npcs[npc.id]=npc
	for map in town.maps:
		if map.id==map_id:selected=map
	if selected.is_empty():push_error("Unknown map "+map_id);quit(1);return
	var start=Time.get_ticks_msec()
	var world=load("res://scripts/world.gd").new()
	root.add_child(world)
	world.setup(selected,words,"de",npcs)
	world.set_font(load("res://assets/NotoSansCJKsc-Regular.otf"))
	if args.size()>3:world.set_player_position(Vector3(float(args[2]),0.1,float(args[3])))
	if args.size()>4 and str(args[4])=="first":world.toggle_first_person()
	world.set_active(false)
	var ready_time=Time.get_ticks_msec()
	for frame in range(8):await process_frame
	print("Native scene load milliseconds: "+str(ready_time-start)+"; eight rendered frames milliseconds: "+str(Time.get_ticks_msec()-ready_time))
	if DisplayServer.get_name()!="headless":
		root.get_texture().get_image().save_png(destination)
		print("Screenshot: "+destination)
	print(JSON.stringify(world.get_diagnostics()))
	quit()
