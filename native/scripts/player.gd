extends CharacterBody3D
const Actors = preload("res://scripts/actors.gd")
var rig: Node3D
var active = true
var camera_yaw = 0.0
var speed = 4.5
var sprinting = false
var moving = false
var animation_clock = 0.0
var map_bounds = Vector2(180,160)
var color = Color("718eaa")
var hat = true

func _ready() -> void:
	collision_layer = 2; collision_mask = 1|4
	var capsule = CapsuleShape3D.new();capsule.radius = 0.30;capsule.height = 1.55
	var collider = CollisionShape3D.new();collider.shape = capsule;collider.position.y = 0.78;add_child(collider)
	rig = Actors.make_rig(self,color,hat)
	floor_snap_length = 0.5

func set_appearance(shirt: Color, wear_hat: bool) -> void:
	color=shirt;hat=wear_hat
	if is_instance_valid(rig):
		rig.queue_free();rig=Actors.make_rig(self,color,hat)

func _physics_process(delta: float) -> void:
	animation_clock += delta
	var direction = Vector2.ZERO
	if active:
		if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT):direction.x -= 1
		if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT):direction.x += 1
		if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP):direction.y -= 1
		if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN):direction.y += 1
		sprinting = Input.is_physical_key_pressed(KEY_SHIFT)
	var world_direction = Vector3(direction.x,0,direction.y).rotated(Vector3.UP,camera_yaw).normalized()
	var target_speed = speed*(1.65 if sprinting else 1.0)
	velocity.x = move_toward(velocity.x,world_direction.x*target_speed,delta*22.0)
	velocity.z = move_toward(velocity.z,world_direction.z*target_speed,delta*22.0)
	velocity.y = -3.0
	moving=Vector2(velocity.x,velocity.z).length()>0.1
	move_and_slide()
	position.x=clampf(position.x,-map_bounds.x*0.5+0.6,map_bounds.x*0.5-0.6)
	position.z=clampf(position.z,-map_bounds.y*0.5+0.6,map_bounds.y*0.5-0.6)
	if moving:rig.rotation.y=lerp_angle(rig.rotation.y,atan2(world_direction.x,world_direction.z),delta*10.0)
	Actors.animate_rig(rig,animation_clock*(1.4 if sprinting else 1.0),clampf(Vector2(velocity.x,velocity.z).length()/speed,0.0,1.0))
