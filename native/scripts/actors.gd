extends CharacterBody3D
const Models = preload("res://scripts/models.gd")
var npc_id = ""
var display_name = ""
var route: Array = []
var route_index = 0
var wait_time = 0.0
var walk_time = 0.0
var idle_time = 0.0
var speed = 1.25
var rig: Node3D
var awareness: Node3D
var active = true
var _stuck_time = 0.0

static func make_rig(parent: Node3D, shirt: Color = Color("82a6a3"), hat: bool = false) -> Node3D:
	var root = Node3D.new()
	parent.add_child(root)
	root.name = "AnimatedAvatar"
	Models.box(root, Vector3(0,0.87,0), Vector3(0.50,0.61,0.30), shirt)
	Models.box(root, Vector3(0,0.56,0), Vector3(0.43,0.16,0.28), Color("455c69"))
	var head = Node3D.new(); head.name = "Head"; head.position.y = 1.36; root.add_child(head)
	Models.sphere(head, Vector3.ZERO, Vector3(0.47,0.49,0.43), Color("e5bd96"))
	Models.sphere(head, Vector3(0,0.16,-0.04), Vector3(0.49,0.25,0.43), Color("69523e"))
	for side in [-1,1]:
		var eye = Models.box(head, Vector3(side*0.09,0.015,0.207), Vector3(0.045,0.060,0.023), Color("334c49"))
		eye.name = "Eye" + str(side)
		Models.sphere(head, Vector3(side*0.16,-0.065,0.19), Vector3(0.07,0.035,0.02), Color("dc9a8e"))
	Models.box(head, Vector3(0,-0.10,0.216), Vector3(0.07,0.016,0.015), Color("9c6a5c"))
	if hat:
		Models.sphere(head, Vector3(0,0.24,-0.01), Vector3(0.60,0.10,0.57), Color("d4ae6c"))
		Models.sphere(head, Vector3(0,0.32,-0.01), Vector3(0.40,0.22,0.38), Color("e4bf7f"))
	for side in [-1,1]:
		var arm = Node3D.new(); arm.name = "Arm"+str(side); arm.position = Vector3(side*0.33,1.1,0); root.add_child(arm)
		Models.box(arm,Vector3(0,-0.16,0),Vector3(0.19,0.34,0.21),shirt)
		Models.sphere(arm,Vector3(0,-0.38,0),Vector3(0.17,0.18,0.18),Color("e5bd96"))
		var leg = Node3D.new(); leg.name = "Leg"+str(side); leg.position = Vector3(side*0.13,0.54,0);root.add_child(leg)
		Models.box(leg,Vector3(0,-0.20,0),Vector3(0.19,0.38,0.23),Color("455c69"))
		Models.box(leg,Vector3(0,-0.43,0.045),Vector3(0.22,0.13,0.33),Color("665343"))
	return root

static func animate_rig(root: Node3D, clock: float, walking: float, waving: bool = false) -> void:
	root.position.y = abs(sin(clock*8.0))*0.045*walking + sin(clock*1.9)*0.012
	for side in [-1,1]:
		var leg = root.get_node("Leg"+str(side))
		var arm = root.get_node("Arm"+str(side))
		leg.rotation.x = sin(clock*8.0+float(side)*PI*0.5)*0.55*walking
		arm.rotation.x = -leg.rotation.x*0.7
		arm.rotation.z = float(side)*0.08
		if waving and side == 1:
			arm.rotation.z = -2.3+sin(clock*9.0)*0.25
	var head = root.get_node("Head")
	head.rotation.z = sin(clock*1.8)*0.025*(1.0-walking)
	var blink = 0.10 if fmod(clock,4.7)>4.54 else 1.0
	for side in [-1,1]: head.get_node("Eye"+str(side)).scale.y = blink

func setup(definition: Dictionary, placement: Dictionary) -> void:
	npc_id = str(definition.get("id",placement.get("id","neighbor")))
	display_name = str(definition.get("name",npc_id.capitalize()))
	position = Vector3(float(placement.get("x",0)),0,float(placement.get("z",0)))
	route = placement.get("route",[])
	idle_time = float(abs(npc_id.hash())%300)/20.0
	speed = 0.9+float(abs(npc_id.hash())%7)*0.10
	collision_layer = 4; collision_mask = 1|2|4
	var capsule = CapsuleShape3D.new(); capsule.radius = 0.28;capsule.height = 1.5
	var collider = CollisionShape3D.new();collider.shape = capsule;collider.position.y = 0.75;add_child(collider)
	rig = make_rig(self,Color(str(definition.get("color","8cafaa"))),abs(npc_id.hash())%3==0)
	set_meta("interaction_kind","npc");set_meta("interaction_id",npc_id)

func _physics_process(delta: float) -> void:
	if not active: return
	idle_time += delta
	var moving = false
	if wait_time > 0.0:
		wait_time -= delta
	elif route.size()>1:
		var target: Array = route[route_index]
		var direction = Vector3(float(target[0]),0,float(target[1]))-position
		direction.y = 0
		if direction.length()<0.35:
			route_index = (route_index+1)%route.size();wait_time = 1.8+float(abs(npc_id.hash())%4)
		else:
			direction = direction.normalized()
			velocity.x = direction.x*speed;velocity.z = direction.z*speed
			rig.rotation.y = lerp_angle(rig.rotation.y,atan2(direction.x,direction.z),delta*6.0)
			moving = true
	else:
		velocity.x = 0;velocity.z = 0
	if not moving: velocity.x = 0;velocity.z = 0
	velocity.y = -2.0
	var previous = position
	move_and_slide()
	if moving and position.distance_to(previous)<delta*0.1:
		_stuck_time += delta
		if _stuck_time > 2.0: route_index=(route_index+1)%route.size();wait_time=0.8;_stuck_time=0.0
	else: _stuck_time=0.0
	var wave = not moving and awareness != null and position.distance_to(awareness.position)<5.0
	if wave:
		var toward = awareness.position-position
		if toward.length()>0.1: rig.rotation.y = lerp_angle(rig.rotation.y,atan2(toward.x,toward.z),delta*2.5)
	animate_rig(rig,idle_time,1.0 if moving else 0.0,wave and fmod(idle_time,6.0)<2.0)
