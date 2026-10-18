extends RefCounted
# Vertex-colored, handcrafted model library. One native ArrayMesh per object type,
# then batched by MultiMesh in world.gd. No web renderer or browser dependency.
static var _metadata: Dictionary = {}
static var _vertices = PackedFloat32Array()
static var _meshes: Dictionary = {}
static var _material: StandardMaterial3D

static func _load_library() -> void:
	if not _metadata.is_empty(): return
	var source = FileAccess.open("res://data/models.json", FileAccess.READ)
	_metadata = JSON.parse_string(source.get_as_text()).get("models", {})
	var binary = FileAccess.open("res://data/models.bin", FileAccess.READ)
	_vertices = binary.get_buffer(binary.get_length()).to_float32_array()
	_material = StandardMaterial3D.new()
	_material.vertex_color_use_as_albedo = true
	_material.vertex_color_is_srgb = true
	_material.roughness = 0.94
	_material.cull_mode = BaseMaterial3D.CULL_DISABLED

static func model_key(id: String, variant: String = "") -> String:
	_load_library()
	var key = id + ("@" + variant if variant != "" else "")
	return key if _metadata.has(key) else id

static func get_model(id: String, variant: String = "") -> ArrayMesh:
	_load_library()
	var key = model_key(id, variant)
	if _meshes.has(key): return _meshes[key]
	if not _metadata.has(key): key = "crate"
	var info: Dictionary = _metadata[key]
	var count = int(info.count)
	var offset = int(info.offset)
	var positions = PackedVector3Array()
	var normals = PackedVector3Array()
	var colors = PackedColorArray()
	positions.resize(count); normals.resize(count); colors.resize(count)
	for i in range(count):
		var j = offset + i * 10
		positions[i] = Vector3(_vertices[j], _vertices[j+1], _vertices[j+2])
		normals[i] = Vector3(_vertices[j+3], _vertices[j+4], _vertices[j+5])
		colors[i] = Color(_vertices[j+6], _vertices[j+7], _vertices[j+8], _vertices[j+9])
	var arrays = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = positions
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_COLOR] = colors
	var mesh = ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(0, _material)
	_meshes[key] = mesh
	return mesh

static func get_size(id: String, variant: String = "") -> Vector3:
	_load_library()
	var info: Dictionary = _metadata.get(model_key(id, variant), {"size":[0.7,0.7,0.7]})
	var v: Array = info.size
	return Vector3(float(v[0]), float(v[1]), float(v[2]))

static func get_parts(id: String, variant: String = "") -> Array:
	_load_library()
	return _metadata.get(model_key(id, variant), {}).get("parts", [])

static func material(color: Color, emission: bool = false) -> StandardMaterial3D:
	var mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.9
	if emission:
		mat.emission_enabled = true
		mat.emission = color
		mat.emission_energy_multiplier = 0.5
	return mat

static func box(parent: Node3D, position: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
	var mesh = MeshInstance3D.new()
	var shape = BoxMesh.new()
	shape.size = size
	mesh.mesh = shape
	mesh.material_override = material(color)
	mesh.position = position
	parent.add_child(mesh)
	return mesh

static func sphere(parent: Node3D, position: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
	var mesh = MeshInstance3D.new()
	var shape = SphereMesh.new()
	shape.radial_segments = 8
	shape.rings = 4
	shape.radius = 0.5
	shape.height = 1.0
	mesh.mesh = shape
	mesh.scale = size
	mesh.material_override = material(color)
	mesh.position = position
	parent.add_child(mesh)
	return mesh

static func has_model(id: String, variant: String = "") -> bool:
	_load_library()
	return _metadata.has(model_key(id,variant))
