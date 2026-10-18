extends Node3D
# Native town renderer and physical interaction layer. Static props are grouped
# into spatially batched MultiMeshes; logical instances retain their noun identity.
const Models = preload("res://scripts/models.gd")
const Player = preload("res://scripts/player.gd")
const Actor = preload("res://scripts/actors.gd")
signal interaction_requested(kind: String, id: String)
signal player_moved(position: Vector3)
signal district_changed(id: String)
var player: CharacterBody3D
var camera: Camera3D
var map_data: Dictionary = {}
var words: Dictionary = {}
var definitions: Dictionary = {}
var language = "de"
var active = true
var labels_visible = false
var records: Array = []
var actor_nodes: Dictionary = {}
var portal_records: Array = []
var _groups: Dictionary = {}
var _solid_bounds: Array = []
var _labels: Dictionary = {}
var _animated: Array = []
var _traffic: Array = []
var _particles: Array = []
var _elapsed = 0.0
var _label_timer = 0.0
var _last_position = Vector3.INF
var _district = ""
var _yaw = 0.0
var _pitch = 0.86
var _distance = 27.0
var _overview = false
var _first_person = false
var _first_pitch = -0.04
var _focused = ""
var _focus_time = 0.0
var _nearest: Dictionary = {}
var _interaction_label: Label3D
var _ring: MeshInstance3D
var _sun: DirectionalLight3D
var _environment: WorldEnvironment
var _world_font: Font
var _render_vertices = 0
var _draw_groups = 0
var _waypoint: Dictionary = {}
var _waypoint_ring: MeshInstance3D
var _waypoint_label: Label3D
var _building_material: ShaderMaterial
var _avatar_name = "Traveler"
var _fps_room_shell: Node3D

func setup(data: Dictionary, vocabulary: Dictionary, locale: String, npc_definitions: Dictionary, player_spawn: Array = []) -> void:
	map_data = data; words = vocabulary; language = locale; definitions = npc_definitions
	_build_lighting()
	_build_ground()
	for path in map_data.get("paths",[]): _build_path(path)
	_build_props()
	_build_portals()
	_flush_groups()
	player = Player.new()
	player.name = "Player"
	player.map_bounds = Vector2(float(data.get("width",180)),float(data.get("depth",160)))
	var spawn: Array = player_spawn if player_spawn.size()>=2 else data.get("spawn",[0,8])
	player.position = Vector3(float(spawn[0]),0.05,float(spawn[1]))
	add_child(player)
	_build_npcs()
	_build_traffic()
	_build_camera()
	_build_interaction_indicator()
	_build_waypoint_indicator()
	set_time(21.0 if str(data.get("ambience","")).contains("night") else 15.5)
	_update_labels()

func _is_interior() -> bool:
	return str(map_data.get("kind","")) == "interior" or str(map_data.get("id","town")) != "town"

func _build_lighting() -> void:
	_environment = WorldEnvironment.new()
	var env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("b9d5d0")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("dce6e8")
	env.ambient_light_energy = 0.35
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.fog_enabled = not _is_interior()
	env.fog_light_color = Color("b7d1c6")
	env.fog_density = 0.0015
	_environment.environment = env;add_child(_environment)
	_sun = DirectionalLight3D.new()
	_sun.rotation_degrees = Vector3(-55,-25,0)
	_sun.light_color = Color("fff1d4")
	_sun.light_energy = 1.2
	_sun.shadow_enabled = true
	_sun.directional_shadow_max_distance = 48
	_sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	_sun.shadow_bias = 0.035
	add_child(_sun)

func _build_ground() -> void:
	var width = float(map_data.get("width",180));var depth = float(map_data.get("depth",160))
	var palette: Dictionary = map_data.get("palette",{})
	var floor_color = Color(str(palette.get("floor","d8bf98" if _is_interior() else "a9bd83")))
	var floor_mesh = Models.box(self,Vector3(0,-0.20,0),Vector3(width,0.4,depth),floor_color)
	floor_mesh.name="Ground"
	_add_box_collider(Vector3(0,-0.20,0),Vector3(width,0.4,depth),0.0)
	_add_record({"id":"terrain-floor","wordId":"floor" if _is_interior() else "grass","x":0.0,"z":0.0,"interactable":false,"solid":false},Vector3(width,0.05,depth))
	# A shader produces fine floor seams and lawn flecks without thousands of meshes.
	var shader = Shader.new()
	shader.code = "shader_type spatial; render_mode diffuse_burley; uniform vec4 base_color:source_color=vec4(1.0); uniform bool indoor=false; varying vec3 world_pos; void vertex(){world_pos=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;} void fragment(){vec2 cell=fract(world_pos.xz/2.0);float edge=step(0.975,cell.x)+step(0.975,cell.y);float h=fract(sin(dot(floor(world_pos.xz*5.0),vec2(12.9898,78.233)))*43758.5453);ALBEDO=pow(base_color.rgb,vec3(2.2))*(indoor?1.0-min(edge,1.0)*0.07:0.96+h*0.075);ROUGHNESS=1.0;}"
	var shader_mat = ShaderMaterial.new();shader_mat.shader=shader;shader_mat.set_shader_parameter("base_color",floor_color);shader_mat.set_shader_parameter("indoor",_is_interior());floor_mesh.material_override=shader_mat
	if _is_interior():
		_build_first_person_room_shell(width,depth,palette)
		var wall_color = Color(str(palette.get("wall","f2dfc5")))
		_build_room_wall(Vector3(0,1.8,-depth*0.5),Vector3(width,3.6,0.3),wall_color,"back")
		_build_room_wall(Vector3(-width*0.5,1.2,0),Vector3(0.3,2.4,depth),wall_color,"left")
		_build_room_wall(Vector3(width*0.5,1.2,0),Vector3(0.3,2.4,depth),wall_color,"right")
		for side in [-1,1]:
			var half=(width-4.0)*0.5
			_build_room_wall(Vector3(float(side)*(2.0+half*0.5),0.6,depth*0.5),Vector3(half,1.2,0.3),wall_color,"front"+str(side))
		# Painted cornice and skirting run the entire back and side walls.
		_add_raw_box(Vector3(0,0.15,-depth*0.5+0.18),Vector3(width,0.22,0.08),Color("a98969"))
		_add_raw_box(Vector3(0,3.43,-depth*0.5+0.18),Vector3(width,0.16,0.13),Color("fff0d8"))
		for side in [-1,1]:_add_raw_box(Vector3(float(side)*(width*0.5-0.18),0.15,0),Vector3(0.08,0.22,depth),Color("a98969"))

func _build_room_wall(pos: Vector3,size: Vector3,color: Color,suffix: String) -> void:
	_add_raw_box(pos,size,color)
	_add_box_collider(pos,size,0.0)
	_add_record({"id":"room-wall-"+suffix,"wordId":"wall","x":pos.x,"z":pos.z,"interactable":true},size)

func _build_path(path: Dictionary) -> void:
	var points: Array = path.get("points",[])
	var width = float(path.get("width",2.0))
	var road = str(path.get("kind","")) == "road"
	var color = Color("8d9d9b" if road else "d9c79f")
	for i in range(points.size()-1):
		var a=Vector3(float(points[i][0]),0.015,float(points[i][1]));var b=Vector3(float(points[i+1][0]),0.015,float(points[i+1][1]))
		var delta=b-a;var length=delta.length()
		var angle=atan2(delta.x,delta.z)
		_add_raw_box((a+b)*0.5,Vector3(width,0.035,length),color,angle)
		_add_record({"id":"path-"+str(records.size()),"wordId":"path","x":(a.x+b.x)*0.5,"z":(a.z+b.z)*0.5,"interactable":false},Vector3(width,0.04,length))
		if road:
			for d in range(2,int(length)-2,5):
				_add_raw_box(a+delta.normalized()*float(d)+Vector3(0,0.026,0),Vector3(0.13,0.012,1.8),Color("dfd9b6"),angle)
			for side in [-1,1]:
				var offset=Vector3(cos(angle),0,-sin(angle))*float(side)*(width*0.5+0.45)
				_add_raw_box((a+b)*0.5+offset,Vector3(0.8,0.10,length),Color("cfcbc0"),angle)

func _build_props() -> void:
	for item in map_data.get("objects",[]):
		var word_id = str(item.get("wordId","crate"))
		var variant = str(item.get("variant",""))
		if word_id in ["shelf","cabinet"]:
			for child in map_data.get("objects",[]):
				if str(child.get("parentId",""))==str(item.id):variant="open";break
		var original = Models.get_size(word_id,variant)
		var size = original*float(item.get("scale",1.0))
		if item.has("size"):
			var supplied: Array=item.size
			size=Vector3(float(supplied[0]),float(supplied[1]),float(supplied[2]))
		var pos=Vector3(float(item.get("x",0)),float(item.get("y",0)),float(item.get("z",0)))
		var angle=float(item.get("rotation",0))
		# Source rotations use radians. Optional authored degrees are unambiguous.
		if abs(angle)>TAU:angle=deg_to_rad(angle)
		var scale_vector=size/original
		var basis=Basis(Vector3.UP,angle).scaled_local(scale_vector)
		var transform=Transform3D(basis,pos)
		var animated=word_id in ["boat","bird","butterfly","bee","cat","dog","fish","duck","chicken","seagull","rabbit","goat","hen","beacon"]
		if animated:
			var mesh=MeshInstance3D.new();mesh.mesh=Models.get_model(word_id,variant);mesh.transform=transform;add_child(mesh)
			_animated.append({"node":mesh,"base":transform,"id":word_id,"phase":float(abs(str(item.id).hash())%100)*0.1})
		else:_add_model(word_id,variant,transform)
		var record=_add_record(item,size)
		for part in Models.get_parts(word_id,variant):
			var center:Array=part.center;var psize:Array=part.size
			var location=transform*Vector3(float(center[0]),float(center[1]),float(center[2]))
			_add_record({"id":str(item.id)+":"+str(part.wordId),"wordId":str(part.wordId),"x":location.x,"z":location.z,"y":location.y,"parentId":str(item.id),"solid":false,"interactable":true},Vector3(float(psize[0]),float(psize[1]),float(psize[2]))*scale_vector)
		if bool(item.get("solid",false)) and not item.has("parentId"):
			var collision_size=size
			# Tree crowns and lamp tops are not impassable boxes; their trunks/posts are.
			if word_id == "tree":collision_size=Vector3(0.6,size.y,0.6)
			if word_id in ["lamp","sign","mailbox","flag"]:collision_size=Vector3(0.28,size.y,0.28)
			_add_box_collider(pos+Vector3(0,collision_size.y*0.5,0),collision_size,angle)
			_solid_bounds.append({"id":str(item.id),"wordId":word_id,"position":pos,"size":collision_size,"angle":angle})
		if word_id in ["fountain","well"]:
			_add_fountain(pos,size,word_id)
			_add_record({"id":str(item.id)+":water","wordId":"water","x":pos.x,"y":size.y*0.25,"z":pos.z,"parentId":str(item.id),"solid":false},Vector3(size.x*0.8,0.1,size.z*0.8))
		if word_id=="house" and not _is_interior():
			if not variant in ["garden","conservatory"]:_add_smoke(pos+Vector3(-size.x*0.28,size.y*0.96,-size.z*0.15),str(item.id))
			var sign=_make_label(str(item.get("name","Lantern Town")).replace(" ","\n") if str(item.get("name","")).length()<9 else str(item.get("name","Lantern Town")),pos+Vector3(0,size.y*0.63,size.z*0.48+0.03),Color("493f35"))
			sign.billboard=BaseMaterial3D.BILLBOARD_DISABLED;sign.pixel_size=0.005;sign.font_size=30;sign.outline_size=0
		if word_id in ["lamp","lantern","candle","beacon"] and (_is_interior() or str(map_data.get("ambience","")).contains("night")):
			var light=OmniLight3D.new();light.position=pos+Vector3(0,size.y*0.8,0);light.light_color=Color("ffdba2");light.light_energy=0.35;light.omni_range=4.0;add_child(light)

func _add_record(item: Dictionary,size: Vector3) -> Dictionary:
	var word_id=str(item.get("wordId",""))
	var record={"instanceId":str(item.get("id","object-"+str(records.size()))),"wordId":word_id,"name":str(words.get(word_id,{}).get("english",word_id)),"x":float(item.get("x",0)),"z":float(item.get("z",0)),"y":float(item.get("y",0)),"size":size,"rotation":float(item.get("rotation",0)),"interactable":bool(item.get("interactable",true)),"solid":bool(item.get("solid",false)),"collectible":bool(item.get("collectible",true)),"parentId":str(item.get("parentId",""))}
	records.append(record)
	return record

func _add_model(word_id: String,variant: String,transform: Transform3D) -> void:
	var key=Models.model_key(word_id,variant)+":"+str(int(floor(transform.origin.x/32.0)))+":"+str(int(floor(transform.origin.z/32.0)))
	if not _groups.has(key):_groups[key]={"mesh":Models.get_model(word_id,variant),"transforms":[]}
	_groups[key].transforms.append(transform)

func _add_raw_box(pos: Vector3,size: Vector3,color: Color,angle: float=0.0) -> void:
	var key="box:"+color.to_html()
	if not _groups.has(key):
		var mesh=BoxMesh.new();mesh.size=Vector3.ONE;mesh.material=Models.material(color)
		_groups[key]={"mesh":mesh,"transforms":[]}
	_groups[key].transforms.append(Transform3D(Basis(Vector3.UP,angle).scaled_local(size),pos))

func _flush_groups() -> void:
	for group in _groups.values():
		var multimesh=MultiMesh.new();multimesh.transform_format=MultiMesh.TRANSFORM_3D;multimesh.mesh=group.mesh
		multimesh.instance_count=group.transforms.size()
		for i in range(group.transforms.size()):multimesh.set_instance_transform(i,group.transforms[i])
		var node=MultiMeshInstance3D.new();node.multimesh=multimesh
		if str(_groups.find_key(group)).begins_with("house:") or str(_groups.find_key(group)).begins_with("house@"):
			node.material_override=_get_building_material()
		add_child(node);_draw_groups+=1
		if group.mesh is ArrayMesh:_render_vertices+=group.mesh.get_surface_count()*group.transforms.size()
	_groups.clear()

func _add_box_collider(pos: Vector3,size: Vector3,angle: float) -> void:
	var body=StaticBody3D.new();body.position=pos;body.rotation.y=angle
	var shape=BoxShape3D.new();shape.size=size
	var collision=CollisionShape3D.new();collision.shape=shape;body.add_child(collision);add_child(body)

func _build_portals() -> void:
	for portal in map_data.get("portals",[]):
		portal_records.append(portal)
		var pos=Vector3(float(portal.get("x",0)),0.035,float(portal.get("z",0)))
		var ring=MeshInstance3D.new();var torus=TorusMesh.new();torus.inner_radius=0.52;torus.outer_radius=0.60;torus.rings=16;torus.ring_segments=6;ring.mesh=torus;ring.material_override=Models.material(Color("d8b56f"),true);ring.position=pos;add_child(ring)
		var label=_make_label(str(portal.get("label","Enter")),pos+Vector3(0,2.3,0),Color("fff2d3"));label.font_size=36;label.visible=false
		_labels["portal:"+str(portal.id)]={"node":label,"position":pos,"kind":"portal","id":str(portal.id)}

func _build_npcs() -> void:
	for placement in map_data.get("npcs",[]):
		var id=str(placement.get("id","neighbor"))
		var definition:Dictionary=definitions.get(id,{"id":id,"name":id.capitalize()})
		var actor=Actor.new();actor.setup(definition,placement);actor.awareness=player;add_child(actor);actor_nodes[id]=actor
		var label=_make_label(str(definition.get("name",id.capitalize())),Vector3(0,2.0,0),Color("fff2d3"),actor)
		label.font_size=32
		_labels["npc:"+id]={"node":label,"position":actor.position,"kind":"npc","id":id}

func _build_traffic() -> void:
	for vehicle in map_data.get("traffic",[]):
		var route:Array=vehicle.get("route",[])
		if route.size()<2:continue
		var mesh=MeshInstance3D.new();mesh.mesh=Models.get_model(str(vehicle.get("wordId","car")));mesh.scale=Vector3.ONE*1.8;add_child(mesh)
		mesh.position=Vector3(float(route[0][0]),0.05,float(route[0][1]))
		var record=_add_record({"id":str(vehicle.get("id","traffic-"+str(_traffic.size()))),"wordId":str(vehicle.get("wordId","car")),"x":mesh.position.x,"z":mesh.position.z,"interactable":true},Vector3(3.4,1.6,1.8))
		_traffic.append({"node":mesh,"record":record,"route":route,"index":1,"speed":float(vehicle.get("speed",5.0)),"id":str(vehicle.get("id","traffic-"+str(_traffic.size())))})

func _build_camera() -> void:
	camera=Camera3D.new();camera.name="FollowCamera";camera.fov=48;camera.near=0.15;camera.far=320;add_child(camera)
	if _is_interior():_distance=27.0;_pitch=0.74
	_update_camera(1.0,true)
	camera.make_current()

func _build_interaction_indicator() -> void:
	_ring=MeshInstance3D.new();var torus=TorusMesh.new();torus.inner_radius=0.43;torus.outer_radius=0.49;torus.rings=16;torus.ring_segments=6;_ring.mesh=torus;_ring.material_override=Models.material(Color("f1cd82"),true);add_child(_ring);_ring.visible=false
	_interaction_label=_make_label("",Vector3.ZERO,Color("fff3d3"));_interaction_label.font_size=34;_interaction_label.outline_size=9

func _make_label(text: String,pos: Vector3,color: Color,parent: Node3D=self) -> Label3D:
	var label=Label3D.new();label.text=text;label.position=pos;label.modulate=color;label.font_size=30;label.outline_size=8;label.pixel_size=0.008;label.billboard=BaseMaterial3D.BILLBOARD_ENABLED;label.no_depth_test=false
	if _world_font!=null:label.font=_world_font
	parent.add_child(label)
	return label

func _add_fountain(pos: Vector3,size: Vector3,id: String) -> void:
	if id!="fountain":return
	for i in range(12):
		var drop=Models.sphere(self,pos+Vector3(0,size.y,0),Vector3(0.055,0.13,0.055),Color("badbd7"))
		_particles.append({"node":drop,"origin":pos,"height":size.y,"phase":float(i)/12.0,"angle":float(i)*TAU/12.0,"kind":"fountain"})

func _add_smoke(pos: Vector3,parent_id: String) -> void:
	_add_record({"id":parent_id+":smoke","wordId":"cloud","x":pos.x,"z":pos.z,"y":pos.y,"parentId":parent_id,"interactable":false},Vector3(0.6,2.5,0.6))
	for i in range(3):
		var puff=Models.sphere(self,pos,Vector3.ONE*0.32,Color("dbe0ce"))
		puff.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_particles.append({"node":puff,"origin":pos,"phase":float(i)/3.0,"kind":"smoke"})

func _process(delta: float) -> void:
	if player==null:return
	_elapsed+=delta
	_update_camera(delta)
	if active:
		_animate_environment(delta)
		_nearest=_find_nearest()
		_update_interaction_indicator()
		_update_waypoint()
		if player.position.distance_to(_last_position)>0.15:
			_last_position=player.position;player_moved.emit(player.position);_check_district()
	_label_timer+=delta
	if _label_timer>0.25:_label_timer=0;_update_labels()
	if _focus_time>0:_focus_time-=delta

func _animate_environment(delta: float) -> void:
	for item in _animated:
		var node:MeshInstance3D=item.node;var base:Transform3D=item.base;var t=_elapsed+float(item.phase);var id=str(item.id)
		node.transform=base
		if id in ["boat","fish"]:
			node.position.y+=sin(t*1.3)*0.06;node.rotation.z+=sin(t*0.8)*0.035
		elif id in ["butterfly","bee","bird","seagull"]:
			node.position+=Vector3(sin(t*0.7)*0.25,sin(t*3.0)*0.16,cos(t*0.7)*0.2);node.rotation.z+=sin(t*10.0)*0.12
		elif id=="beacon":node.rotation.y+=t*0.65
		else:
			node.position.y+=sin(t*2.2)*0.012;node.rotation.y+=sin(t*0.35)*0.12
	for traffic in _traffic:
		var node:MeshInstance3D=traffic.node;var route:Array=traffic.route;var index=int(traffic.index)
		var target=Vector3(float(route[index][0]),0.05,float(route[index][1]));var direction=target-node.position
		if direction.length()<0.3:traffic.index=(index+1)%route.size()
		else:node.position+=direction.normalized()*minf(delta*float(traffic.speed),direction.length());node.rotation.y=atan2(-direction.z,direction.x)
		traffic.record.x=node.position.x;traffic.record.z=node.position.z
	for particle in _particles:
		var node:MeshInstance3D=particle.node;var origin:Vector3=particle.origin
		if particle.kind=="smoke":
			var cycle=fmod(_elapsed*0.2+float(particle.phase),1.0);node.position=origin+Vector3(cycle*0.6,cycle*2.5,sin(cycle*4.0)*0.15);node.scale=Vector3.ONE*(0.3+cycle*0.5);node.visible=cycle<0.94
		else:
			var cycle=fmod(_elapsed*0.65+float(particle.phase),1.0);var radius=cycle*0.55;var angle=float(particle.angle)
			node.position=origin+Vector3(cos(angle)*radius,float(particle.height)*0.75+sin(cycle*PI)*0.75-cycle*0.65,sin(angle)*radius)

func _update_camera(delta: float,snap: bool=false) -> void:
	if camera==null or player==null:return
	if _first_person:
		var eye=player.position+Vector3(0,1.48,0)
		var direction=Vector3(-sin(_yaw)*cos(_first_pitch),sin(_first_pitch),-cos(_yaw)*cos(_first_pitch))
		camera.position=eye
		camera.look_at_from_position(eye,eye+direction)
		camera.fov=70.0
		player.camera_yaw=_yaw
		return
	camera.fov=48.0
	var target=player.position+Vector3(0,0.85,0)
	if _is_interior():
		# Look into the room from the entrance, rather than spending half the
		# first frame outside its front wall. This also reveals stocked aisles.
		target+=Vector3(-sin(_yaw),0,-cos(_yaw))*5.5
		var width=float(map_data.get("width",36));var depth=float(map_data.get("depth",32))
		target.x=clampf(target.x,-width*0.5+8.0,width*0.5-8.0)
		target.z=clampf(target.z,-depth*0.5+10.0,depth*0.5-12.0)
	var distance=_distance
	if _overview:
		target=Vector3(0,0,0);distance=maxf(float(map_data.get("width",180)),float(map_data.get("depth",160)))*1.05
	var offset=Vector3(sin(_yaw)*cos(_pitch),sin(_pitch),cos(_yaw)*cos(_pitch))*distance
	var desired=target+offset
	camera.position=desired if snap else camera.position.lerp(desired,1.0-exp(-delta*8.0))
	camera.look_at_from_position(camera.position,target)
	player.camera_yaw=_yaw
	if _building_material!=null:
		_building_material.set_shader_parameter("avatar_pos",player.position+Vector3(0,0.8,0))
		_building_material.set_shader_parameter("camera_pos",camera.position)

func _unhandled_input(event: InputEvent) -> void:
	if not active:return
	if event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		_yaw-=event.relative.x*0.006
		if _first_person:_first_pitch=clampf(_first_pitch-event.relative.y*0.004,-1.2,1.15)
		else:_pitch=clampf(_pitch+event.relative.y*0.004,0.45,1.35)
	if event is InputEventMouseButton and event.pressed:
		if event.button_index==MOUSE_BUTTON_WHEEL_UP:_distance=clampf(_distance-1.4,7.0,45.0)
		if event.button_index==MOUSE_BUTTON_WHEEL_DOWN:_distance=clampf(_distance+1.4,7.0,45.0)
		if event.button_index==MOUSE_BUTTON_LEFT:_select_at_screen(event.position)
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode==KEY_E and not _nearest.is_empty():interaction_requested.emit(str(_nearest.kind),str(_nearest.id));get_viewport().set_input_as_handled()
		if event.physical_keycode==KEY_F:toggle_first_person()
		if event.physical_keycode==KEY_M:
			if _first_person:toggle_first_person()
			_overview=not _overview
		if event.physical_keycode==KEY_HOME:
			if _first_person:toggle_first_person()
			_yaw=0.0;_pitch=0.74 if _is_interior() else 0.86;_distance=27.0;_overview=false

func _select_at_screen(point: Vector2) -> void:
	var origin=camera.project_ray_origin(point);var ray=camera.project_ray_normal(point)
	if abs(ray.y)<0.01:return
	var at=origin+ray*(-origin.y/ray.y)
	var closest:Dictionary={};var distance=2.0
	for record in records:
		if not bool(record.interactable):continue
		var d=Vector2(float(record.x)-at.x,float(record.z)-at.z).length()
		if d<distance:distance=d;closest=record
	if not closest.is_empty():focus_object(str(closest.instanceId))

func _record_distance(record: Dictionary) -> float:
	var delta=Vector3(player.position.x-float(record.x),0,player.position.z-float(record.z)).rotated(Vector3.UP,-float(record.get("rotation",0)))
	var size:Vector3=record.size
	var dx=maxf(abs(delta.x)-size.x*0.5,0.0);var dz=maxf(abs(delta.z)-size.z*0.5,0.0)
	return Vector2(dx,dz).length()

func _find_nearest() -> Dictionary:
	var best:Dictionary={};var score=1000.0
	for portal in portal_records:
		var pos=Vector3(float(portal.x),0,float(portal.z));var distance=player.position.distance_to(pos)
		if distance<float(portal.get("interactionRadius",2.8)) and distance-0.7<score:
			score=distance-0.7;best={"kind":"portal","id":str(portal.id),"position":pos,"label":str(portal.get("label","Enter")),"distance":distance}
	for id in actor_nodes:
		var actor:Node3D=actor_nodes[id];var distance=player.position.distance_to(actor.position)
		if distance<3.0 and distance-0.5<score:
			score=distance-0.5;best={"kind":"npc","id":id,"position":actor.position,"label":actor.display_name,"distance":distance}
	for record in records:
		if not bool(record.interactable):continue
		# Structural labels are discoverable nearby, while loose objects take E priority.
		var distance=_record_distance(record)
		var penalty=1.6 if str(record.wordId) in ["wall","roof","floor","grass","house","leaf","trunk"] else 0.0
		var selected=-1.0 if str(record.instanceId)==_focused and _focus_time>0 else 0.0
		if distance<2.4 and distance+penalty+selected<score:
			score=distance+penalty+selected;best={"kind":"object","id":str(record.instanceId),"wordId":str(record.wordId),"position":Vector3(float(record.x),float(record.y),float(record.z)),"label":_word_text(str(record.wordId)),"distance":distance}
	return best

func _update_interaction_indicator() -> void:
	var visible=not _nearest.is_empty() and not _overview
	_ring.visible=visible;_interaction_label.visible=visible
	if not visible:return
	var pos:Vector3=_nearest.position
	# Large structural item center might be far away: keep its prompt near the avatar.
	if pos.distance_to(player.position)>5.0:pos=player.position
	_ring.position=Vector3(pos.x,0.08,pos.z)
	_ring.rotation.y=_elapsed*0.8
	_interaction_label.position=pos+Vector3(0,2.0 if str(_nearest.kind)!="object" else 1.5,0)
	_interaction_label.text="[E]  "+str(_nearest.label)

func _word_text(word_id: String) -> String:
	var word:Dictionary=words.get(word_id,{})
	var translation:Dictionary=word.get("translations",{}).get(language,{})
	return str(translation.get("text",word.get("english",word_id)))

func _update_labels() -> void:
	if player==null:return
	var nearby:Array=[]
	if labels_visible or _focus_time>0:
		for record in records:
			if not bool(record.interactable):continue
			var distance=Vector2(float(record.x)-player.position.x,float(record.z)-player.position.z).length()
			if (labels_visible and distance<8.0) or (str(record.instanceId)==_focused and _focus_time>0):nearby.append({"record":record,"distance":distance})
	nearby.sort_custom(func(a,b):return a.distance<b.distance)
	var shown:Dictionary={}
	for index in range(mini(nearby.size(),22)):
		var record:Dictionary=nearby[index].record;var key="object:"+str(record.instanceId);shown[key]=true
		if not _labels.has(key):
			var label=_make_label("",Vector3.ZERO,Color("fff2dc"));_labels[key]={"node":label,"kind":"object","id":str(record.instanceId)}
		var label:Label3D=_labels[key].node;var size:Vector3=record.size
		label.text=_word_text(str(record.wordId))+"\n"+str(record.name)
		label.position=Vector3(float(record.x),float(record.y)+minf(size.y,3.0)+0.35,float(record.z));label.visible=true
	for key in _labels:
		var item:Dictionary=_labels[key];var label:Label3D=item.node
		if item.kind=="object":label.visible=shown.has(key)
		elif item.kind=="npc":label.visible=actor_nodes[item.id].position.distance_to(player.position)<13.0 and not _overview
		elif item.kind=="portal":label.visible=(item.position as Vector3).distance_to(player.position)<11.0 and not _overview

func _check_district() -> void:
	var best="";var nearest=INF
	for district in map_data.get("districts",[]):
		var distance=Vector2(player.position.x-float(district.x),player.position.z-float(district.z)).length()
		if distance<nearest:nearest=distance;best=str(district.id)
	if best!=_district:_district=best;district_changed.emit(best)

func set_active(value: bool) -> void:
	active=value
	if player!=null:player.active=value
	for actor in actor_nodes.values():actor.active=value

func set_language(id: String) -> void:
	language=id;_update_labels()

func set_labels(value: bool) -> void:
	labels_visible=value;_update_labels()

func set_font(font: Font) -> void:
	_world_font=font
	for item in _labels.values():item.node.font=font
	if _interaction_label!=null:_interaction_label.font=font

func get_objects() -> Array:return records
func get_player_position() -> Vector3:return player.position if player!=null else Vector3.ZERO
func set_player_position(pos: Vector3) -> void:
	if player!=null:player.position=pos;player.velocity=Vector3.ZERO;_update_camera(1.0,true)

func focus_object(instance_id: String) -> void:
	# Selection is visual only; it cannot move the avatar or grant discovery/progress.
	_focused=instance_id;_focus_time=7.0;_update_labels()

func move_to_district(id: String) -> void:
	# A guide points to a district and opens the overview. Walking remains required.
	for district in map_data.get("districts",[]):
		if str(district.id)==id:
			_district=id;district_changed.emit(id);_overview=true
			set_waypoint(Vector3(float(district.x),0,float(district.z)),str(district.get("name",id.capitalize())))
			return

func get_nearest_interaction() -> Dictionary:return _nearest.duplicate()

func get_interaction_distance(kind: String,id: String) -> float:
	if player==null:return INF
	if kind=="npc" and actor_nodes.has(id):return player.position.distance_to(actor_nodes[id].position)
	if kind=="portal":
		for portal in portal_records:
			if str(portal.id)==id:return player.position.distance_to(Vector3(float(portal.x),0,float(portal.z)))
	if kind=="object":
		for record in records:
			if str(record.instanceId)==id:return _record_distance(record)
	return INF

func set_time(hours: float) -> void:
	var night=hours<6.0 or hours>19.0
	_sun.light_energy=0.20 if night else (0.42 if _is_interior() else 0.60)
	_sun.light_color=Color("b9c4de") if night else Color("fffbf5")
	_environment.environment.ambient_light_energy=0.32 if night else 0.40
	_environment.environment.background_color=Color("495d78") if night else Color("b9d5d0")
	_environment.environment.fog_light_color=Color("61758a") if night else Color("b7d1c6")

func get_diagnostics() -> Dictionary:
	var unknown:Array=[]
	var missing_models:Array=[]
	var oversized_models:Array=[]
	var spawn_inside:Array=[]
	for item in map_data.get("objects",[]):
		if not Models.has_model(str(item.get("wordId","")),str(item.get("variant",""))):missing_models.append(str(item.get("wordId","")))
		else:
			var size=Models.get_size(str(item.wordId),str(item.get("variant","")))
			var bounds=Models.get_model(str(item.wordId),str(item.get("variant",""))).get_aabb()
			if bounds.size.x>size.x+0.002 or bounds.size.y>size.y+0.002 or bounds.size.z>size.z+0.002:oversized_models.append(str(item.wordId))
	for bound in _solid_bounds:
		var delta=(player.position-bound.position).rotated(Vector3.UP,-float(bound.angle))
		var size:Vector3=bound.size
		if abs(delta.x)<size.x*0.5+0.26 and abs(delta.z)<size.z*0.5+0.26 and player.position.y<float(bound.position.y)+size.y:spawn_inside.append(str(bound.id))
	for record in records:
		if not words.has(str(record.wordId)):unknown.append(str(record.wordId))
	return {"mapId":str(map_data.get("id","")),"objects":records.size(),"authoredObjects":map_data.get("objects",[]).size(),"solidObjects":_solid_bounds.size(),"npcs":actor_nodes.size(),"portals":portal_records.size(),"traffic":_traffic.size(),"animatedObjects":_animated.size(),"particles":_particles.size(),"renderBatches":_draw_groups,"unknownWords":unknown,"missingModels":missing_models,"oversizedModels":oversized_models,"playerInsideSolid":spawn_inside,"unlabelledObjectTypes":unknown.size(),"player":get_player_position(),"collisionsEnabled":true,"native":true}


func set_avatar(options: Dictionary) -> void:
	_avatar_name=str(options.get("name","Traveler"))
	var palette={"sage":"8ca78a","coral":"d18e7c","ocean":"718eaa","gold":"d0ae6e","lavender":"ac9cb9"}
	var color_name=str(options.get("color",options.get("shirt","ocean")))
	var shirt=Color(str(palette.get(color_name,"718eaa")))
	if player!=null:player.set_appearance(shirt,bool(options.get("hat",true)))

func _build_waypoint_indicator() -> void:
	_waypoint_ring=MeshInstance3D.new()
	var torus=TorusMesh.new();torus.inner_radius=0.8;torus.outer_radius=0.90;torus.rings=24;torus.ring_segments=6
	_waypoint_ring.mesh=torus;_waypoint_ring.material_override=Models.material(Color("efc778"),true);add_child(_waypoint_ring)
	_waypoint_label=_make_label("",Vector3.ZERO,Color("ffe2a0"));_waypoint_label.font_size=36
	_waypoint_ring.visible=false;_waypoint_label.visible=false

func set_waypoint(pos: Vector3,title: String="Destination") -> void:
	_waypoint={"position":pos,"title":title}
	_update_waypoint()

func clear_waypoint() -> void:
	_waypoint.clear()
	if _waypoint_ring!=null:_waypoint_ring.visible=false;_waypoint_label.visible=false

func _update_waypoint() -> void:
	if _waypoint.is_empty() or _waypoint_ring==null:return
	var destination:Vector3=_waypoint.position
	var delta=destination-player.position;delta.y=0
	var distance=delta.length()
	# The trail marker stays ahead of the avatar, so a far destination remains
	# useful at walking camera scale. The final ring marks the actual doorstep.
	var position=destination if distance<5.0 or _overview else player.position+delta.normalized()*5.0
	_waypoint_ring.position=position+Vector3(0,0.07,0);_waypoint_ring.visible=true
	_waypoint_ring.rotation.y=_elapsed*0.4
	_waypoint_label.position=position+Vector3(0,1.0,0);_waypoint_label.visible=true
	_waypoint_label.text=str(_waypoint.title)+" · "+str(int(distance))+"m"

func _get_building_material() -> ShaderMaterial:
	if _building_material!=null:return _building_material
	var shader=Shader.new()
	shader.code="shader_type spatial; render_mode cull_disabled; uniform vec3 avatar_pos; uniform vec3 camera_pos; varying vec3 world_pos; void vertex(){world_pos=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;} void fragment(){vec3 line=camera_pos-avatar_pos;float progress=dot(world_pos-avatar_pos,line)/max(dot(line,line),0.001);float radius=length(world_pos-(avatar_pos+line*clamp(progress,0.0,1.0)));if(progress>0.07&&progress<0.96&&radius<2.2){if(mod(floor(FRAGCOORD.x)+floor(FRAGCOORD.y),4.0)<3.0)discard;}ALBEDO=pow(COLOR.rgb,vec3(2.2));ROUGHNESS=0.94;}"
	_building_material=ShaderMaterial.new();_building_material.shader=shader
	return _building_material


func toggle_first_person() -> void:
	_first_person=not _first_person
	_overview=false
	if player!=null and player.rig!=null:player.rig.visible=not _first_person
	if _fps_room_shell!=null:_fps_room_shell.visible=_first_person
	if camera!=null:camera.near=0.06 if _first_person else 0.15
	_update_camera(1.0,true)

func get_camera_mode() -> String:
	return "first-person" if _first_person else "overview" if _overview else "follow"


func _build_first_person_room_shell(width: float,depth: float,palette: Dictionary) -> void:
	# Follow camera uses a cutaway dollhouse. The same interior gains its full
	# upper walls and a tiled ceiling at eye level, without changing floor space.
	_fps_room_shell=Node3D.new();_fps_room_shell.name="FirstPersonRoomShell";add_child(_fps_room_shell)
	_fps_room_shell.set_meta("wordId","roof")
	var wall_color=Color(str(palette.get("wall","f0e6d0")))
	var ceiling=Models.box(_fps_room_shell,Vector3(0,5.12,0),Vector3(width,0.12,depth),Color("d4dccf"))
	ceiling.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_add_record({"id":"room-ceiling","wordId":"roof","x":0,"z":0,"y":5.06,"interactable":false},Vector3(width,0.12,depth))
	var upper_walls=[
		[Vector3(0,4.35,-depth*0.5),Vector3(width,1.5,0.3)],
		[Vector3(-width*0.5,3.75,0),Vector3(0.3,2.7,depth)],
		[Vector3(width*0.5,3.75,0),Vector3(0.3,2.7,depth)],
		[Vector3(-(width+4.0)*0.25,3.15,depth*0.5),Vector3((width-4.0)*0.5,3.9,0.3)],
		[Vector3((width+4.0)*0.25,3.15,depth*0.5),Vector3((width-4.0)*0.5,3.9,0.3)],
		[Vector3(0,4.15,depth*0.5),Vector3(4.0,1.9,0.3)]
	]
	for descriptor in upper_walls:
		var wall=Models.box(_fps_room_shell,descriptor[0],descriptor[1],wall_color)
		wall.set_meta("wordId","wall");wall.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for x in range(-int(width*0.5)+4,int(width*0.5),4):
		var seam=Models.box(_fps_room_shell,Vector3(float(x),5.045,0),Vector3(0.025,0.025,depth),Color("abb8aa"));seam.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for z in range(-int(depth*0.5)+4,int(depth*0.5),4):
		var seam=Models.box(_fps_room_shell,Vector3(0,5.045,float(z)),Vector3(width,0.025,0.025),Color("abb8aa"));seam.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for x in [-width*0.25,width*0.25]:
		for z in [-depth*0.25,0.0,depth*0.25]:
			var light_panel=Models.box(_fps_room_shell,Vector3(x,5.01,z),Vector3(1.2,0.08,0.65),Color("f8efd7"))
			light_panel.material_override=Models.material(Color("f8efd7"),true)
			light_panel.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			light_panel.set_meta("wordId","lamp")
			_add_record({"id":"ceiling-lamp-"+str(x)+"-"+str(z),"wordId":"lamp","x":x,"z":z,"y":4.97,"interactable":false},Vector3(1.2,0.08,0.65))
	_fps_room_shell.visible=false
