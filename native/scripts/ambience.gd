extends Node
## Original authored environmental beds. Two voices crossfade; retired streams stop.
## Effects have a bounded six-voice pool and footstep throttling.

const BUS_NAME = "Thing Ling Original Audio"
const PROFILE_PATH = "res://audio/profiles.json"
var _manifest: Dictionary = {}
var _profiles: Dictionary = {}
var _effects: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _effect_players: Array[AudioStreamPlayer] = []
var _streams: Dictionary = {}
var _last_effect: Dictionary = {}
var _active_index: int = 0
var _effect_index: int = 0
var _requested: String = "town"
var _environment: String = ""
var _enabled: bool = true
var _volume: float = 0.3
var _bus_index: int = -1
var _fade: Tween
var _initialized: bool = false

func setup() -> void:
	if _initialized:
		return
	_initialized = true
	if FileAccess.file_exists(PROFILE_PATH):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(PROFILE_PATH))
		if parsed is Dictionary:
			_manifest = parsed
	_profiles = _manifest.get("profiles", {})
	_effects = _manifest.get("effects", {})
	_bus_index = AudioServer.get_bus_index(BUS_NAME)
	if _bus_index < 0:
		AudioServer.add_bus()
		_bus_index = AudioServer.bus_count - 1
		AudioServer.set_bus_name(_bus_index, BUS_NAME)
		AudioServer.set_bus_send(_bus_index, "Master")
	for index in range(2):
		var player = AudioStreamPlayer.new()
		player.name = "EnvironmentVoice%d" % index
		player.bus = BUS_NAME
		player.volume_db = -70.0
		add_child(player)
		_players.append(player)
	for index in range(6):
		var player = AudioStreamPlayer.new()
		player.name = "EffectVoice%d" % index
		player.bus = BUS_NAME
		player.volume_db = -3.0
		add_child(player)
		_effect_players.append(player)
	set_volume(_volume)

func _get_stream(path: String, looping: bool) -> AudioStream:
	if _streams.has(path):
		return _streams[path]
	if not ResourceLoader.exists(path):
		push_warning("Original audio asset is missing: %s" % path)
		return null
	var stream = load(path)
	if stream is AudioStreamWAV and looping:
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = int(float(_manifest.get("durationSeconds", 24)) * float(_manifest.get("sampleRate", 22050)))
	_streams[path] = stream
	return stream

func _resolve_environment(id: String) -> String:
	if _profiles.has(id):
		return id
	var aliases = {"outdoor":"town", "marketplace":"market", "waves":"cove", "seaside":"cove", "ocean":"cove", "birds":"garden", "forest":"orchard", "indoor":"home", "quiet":"library", "nightlife":"nightclub", "train":"station", "post":"post-office", "tea":"tea-house", "schoolroom":"school", "clinic-quiet":"clinic", "rail":"station"}
	var aliased: String = str(aliases.get(id, "town"))
	return aliased if _profiles.has(aliased) else "town"

func play_environment(id: String) -> void:
	setup()
	_requested = id
	if not _enabled:
		return
	var resolved = _resolve_environment(id)
	if _environment == resolved and _players[_active_index].playing:
		return
	var entry: Dictionary = _profiles.get(resolved, {})
	var stream = _get_stream(str(entry.get("path", "")), true)
	if stream == null:
		return
	if _fade and _fade.is_valid():
		_fade.kill()
	var previous: AudioStreamPlayer = _players[_active_index]
	_active_index = 1 - _active_index
	var next: AudioStreamPlayer = _players[_active_index]
	next.stop()
	next.stream = stream
	next.volume_db = -65.0
	next.play()
	_environment = resolved
	_fade = create_tween().set_parallel(true)
	_fade.tween_property(next, "volume_db", 0.0, 1.35).set_trans(Tween.TRANS_SINE)
	_fade.tween_property(previous, "volume_db", -65.0, 1.35).set_trans(Tween.TRANS_SINE)
	_fade.chain().tween_callback(previous.stop)

func set_enabled(value: bool) -> void:
	setup()
	_enabled = value
	if not value:
		if _fade and _fade.is_valid():
			_fade.kill()
		for player in _players:
			player.stop()
		for player in _effect_players:
			player.stop()
	else:
		play_environment(_requested)

func set_volume(value: float) -> void:
	_volume = clampf(value, 0.0, 1.0)
	if _bus_index >= 0:
		AudioServer.set_bus_volume_db(_bus_index, linear_to_db(_volume) if _volume > 0.0001 else -80.0)

func play_effect(id: String) -> void:
	setup()
	if not _enabled or _volume <= 0.0001:
		return
	var aliases = {"pickup":"collect", "discovery":"collect", "quest":"success", "complete":"success", "error":"failure", "enter":"door", "exit":"door", "step":"footstep", "button":"click", "mission":"success"}
	var resolved: String = str(aliases.get(id, id))
	if not _effects.has(resolved):
		resolved = "interact"
	var now = Time.get_ticks_msec()
	var gap: int = 210 if resolved == "footstep" else 45
	if now - int(_last_effect.get(resolved, -1000)) < gap:
		return
	_last_effect[resolved] = now
	var stream = _get_stream(str(_effects[resolved]), false)
	if stream == null:
		return
	var player: AudioStreamPlayer = _effect_players[_effect_index]
	_effect_index = (_effect_index + 1) % _effect_players.size()
	player.stop()
	player.stream = stream
	player.pitch_scale = randf_range(0.94, 1.06) if resolved == "footstep" else 1.0
	player.volume_db = -9.0 if resolved == "footstep" else -3.0
	player.play()

func get_diagnostics() -> Dictionary:
	var loops: int = 0
	var effects: int = 0
	for player in _players:
		if player.playing:
			loops += 1
	for player in _effect_players:
		if player.playing:
			effects += 1
	return {"environment":_environment, "requested":_requested, "enabled":_enabled, "volume":_volume, "playingLoops":loops, "playingEffects":effects, "profileCount":_profiles.size(), "loopSeconds":_manifest.get("durationSeconds",24), "originalAudio":true}

func _exit_tree() -> void:
	if _fade and _fade.is_valid():
		_fade.kill()
	for player in _players:
		player.stop()
	for player in _effect_players:
		player.stop()
	_streams.clear()
