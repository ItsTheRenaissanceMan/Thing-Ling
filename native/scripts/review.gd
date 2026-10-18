extends Control
## Native retrieval practice. Discoveries belong to the walking game; this workbench
## can only review already learned words and never mutates the caller's dictionary.
signal finished(result: Dictionary)
signal closed
signal progress_changed(result: Dictionary)

const INTERVALS: Array[int] = [600, 86400, 259200, 604800, 1209600]
const LANGUAGES: Array[String] = ["de", "ja", "es", "zh"]
const LANGUAGE_NAMES: Dictionary = {"de":"German", "ja":"Japanese", "es":"Spanish", "zh":"Chinese"}
const CREAM: Color = Color("fff9ec")
const INK: Color = Color("344b43")
const GREEN: Color = Color("50795e")
const MUTED: Color = Color("6c7b70")
const RED: Color = Color("994f43")

var _language: String = "de"
var _words: Dictionary = {}
var _learned: Dictionary = {}
var _questions: Array = []
var _index: int = 0
var _correct: int = 0
var _graded_count: int = 0
var _graded: bool = false
var _was_correct: bool = false
var _finished: bool = false
var _cancelled: bool = false
var _typed: String = ""
var _ui: MarginContainer
var _voice: String = ""

func setup(language: String, words: Dictionary, learned: Dictionary, mode: String = "mixed") -> void:
	_language = language if language in LANGUAGES else "de"
	_words = words.duplicate(true)
	_learned = learned.duplicate(true)
	_questions = build_session(_words, _learned, _language, mode)
	_index = 0
	_correct = 0
	_graded_count = 0
	_graded = false
	_finished = false
	_cancelled = false
	_typed = ""
	_voice = ""
	if ProjectSettings.get_setting("audio/general/text_to_speech", false) and DisplayServer.has_feature(DisplayServer.FEATURE_TEXT_TO_SPEECH):
		var voices: PackedStringArray = DisplayServer.tts_get_voices_for_language(_language)
		if not voices.is_empty():
			_voice = voices[0]
	if is_inside_tree():
		_render()

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	custom_minimum_size = Vector2(870, 590)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	mouse_filter = Control.MOUSE_FILTER_STOP
	_render()

func _exit_tree() -> void:
	_stop_voice()

static func normalize_answer(answer: String) -> String:
	# Latin accent tolerance is the same as the original edition. Japanese dakuten
	# are retained: か and が must not become the same answer.
	# Explicit groups avoid relying on Unicode-normalization methods absent from Godot String.
	var groups: Dictionary = {
		"a":"àáâãäåāăąǎǟǡǻȁȃạảấầẩẫậắằẳẵặ", "e":"èéêëēĕėęěȅȇẹẻẽếềểễệ",
		"i":"ìíîïĩīĭįǐȉȋịỉ", "o":"òóôõöøōŏőǒǿȍȏọỏốồổỗộớờởỡợ",
		"u":"ùúûüũūŭůűųǔǖǘǚǜȕȗụủứừửữự", "c":"çćĉċč", "n":"ñńņňǹ",
		"y":"ýÿŷỳỵỷỹ", "s":"śŝşšș", "z":"źżž", "d":"ðđ", "g":"ğĝġģ",
		"h":"ħĥ", "j":"ĵ", "k":"ķ", "l":"ĺļľł", "r":"ŕŗř", "t":"ţťț", "w":"ŵ"
	}
	var result: String = answer.to_lower().replace("ß", "ss").replace("œ", "oe").replace("æ", "ae")
	for replacement: String in groups:
		for character: String in str(groups[replacement]):
			result = result.replace(character, replacement)
	var compatible: String = ""
	var last_latin: bool = false
	for character: String in result:
		var code: int = character.unicode_at(0)
		if code >= 0xff01 and code <= 0xff5e:
			character = String.chr(code - 0xfee0).to_lower()
			code = character.unicode_at(0)
		if code >= 0x300 and code <= 0x36f and last_latin:
			continue
		compatible += character
		last_latin = code >= 97 and code <= 122
	# Canonically decomposed kana use combining marks that carry actual voicing.
	for base: String in "かきくけこさしすせそたちつてとはひふへほカキクケコサシスセソタチツテトハヒフヘホ":
		compatible = compatible.replace(base + "\u3099", String.chr(base.unicode_at(0) + 1))
	for base: String in "はひふへほハヒフヘホ":
		compatible = compatible.replace(base + "\u309a", String.chr(base.unicode_at(0) + 2))
	compatible = compatible.replace("う\u3099", "ゔ").replace("ウ\u3099", "ヴ")
	var punctuation = RegEx.new()
	punctuation.compile("[\\p{P}\\p{S}\\s]+")
	return punctuation.sub(compatible, "", true)

static func check_word_answer(word: Dictionary, answer: String, language: String) -> bool:
	var translation: Dictionary = word.get("translations", {}).get(language, {})
	var normalized: String = normalize_answer(answer)
	if normalized.is_empty() or translation.is_empty():
		return false
	for candidate in [translation.get("text", ""), translation.get("reading", "")]:
		if not str(candidate).is_empty() and normalize_answer(str(candidate)) == normalized:
			return true
	return false

static func grade_record(record: Dictionary, correct: bool, now: int) -> Dictionary:
	var result: Dictionary = record.duplicate(true)
	var previous_mastery: int = clampi(int(record.get("mastery", record.get("level", 0))), 0, 5)
	var due: int = int(record.get("dueAt", 0))
	var advances: bool = correct and due <= now
	var mastery: int = mini(5, previous_mastery + 1) if advances else previous_mastery
	if not correct:
		mastery = maxi(0, previous_mastery - 1)
	result["mastery"] = mastery
	result["correct"] = maxi(0, int(record.get("correct", 0))) + (1 if correct else 0)
	result["wrong"] = maxi(0, int(record.get("wrong", 0))) + (0 if correct else 1)
	if not correct:
		result["dueAt"] = now + 60
	elif advances:
		result["dueAt"] = now + INTERVALS[maxi(0, mastery - 1)]
	# A missing date represents a legacy discovery due now; a correct due review
	# creates its schedule, while successful early practice retains the exact date.
	return result

static func build_session(words: Dictionary, learned: Dictionary, language: String, mode: String = "mixed", now: int = -1) -> Array:
	if now < 0:
		now = int(Time.get_unix_time_from_system())
	var due: Array = []
	var early: Array = []
	for id in learned:
		if not words.has(id) or not learned[id] is Dictionary or not words[id].get("translations", {}).has(language):
			continue
		if int(learned[id].get("dueAt", 0)) <= now:
			due.append(id)
		else:
			early.append(id)
	due.shuffle()
	early.shuffle()
	var pool: Array = due + early
	if pool.is_empty():
		return []
	var questions: Array = []
	var types: Array = ["choice", "listen", "type", "choice", "type"]
	for index in range(5):
		var id: String = str(pool[index % pool.size()])
		var alternatives: Array = []
		var seen: Dictionary = {normalize_answer(str(words[id].translations[language].get("text", ""))):true}
		var candidates: Array = words.keys()
		candidates.shuffle()
		for candidate in candidates:
			if candidate == id:
				continue
			var translated: Dictionary = words[candidate].get("translations", {}).get(language, {})
			var normalized: String = normalize_answer(str(translated.get("text", "")))
			if normalized.is_empty() or seen.has(normalized):
				continue
			seen[normalized] = true
			alternatives.append(candidate)
			if alternatives.size() == 3:
				break
		alternatives.append(id)
		alternatives.shuffle()
		questions.append({"wordId":id,"type":mode if mode in ["listen", "type", "choice"] else types[index],"options":alternatives})
	return questions

func get_session_state() -> Dictionary:
	return {"language":_language,"learned":_learned.duplicate(true),"questions":_questions.duplicate(true),"index":_index,"graded":_graded,"finished":_finished,"correct":_correct,"total":_graded_count}

func answer_current(answer: String, now: int = -1) -> Dictionary:
	if _finished or _cancelled or _graded or _questions.is_empty():
		return {"accepted":false}
	if now < 0:
		now = int(Time.get_unix_time_from_system())
	var question: Dictionary = _questions[_index]
	var id: String = str(question.wordId)
	if question.type == "type" and normalize_answer(answer).is_empty():
		return {"accepted":false}
	var correct: bool = answer == id if question.type != "type" else check_word_answer(_words[id], answer, _language)
	_graded = true
	_was_correct = correct
	_graded_count += 1
	_correct += 1 if correct else 0
	_learned[id] = grade_record(_learned[id], correct, now)
	progress_changed.emit(_result())
	if is_inside_tree():
		_render()
	return {"accepted":true,"correct":correct,"wordId":id}

func next_question() -> void:
	if _finished or _cancelled or not _graded:
		return
	_stop_voice()
	if _index + 1 >= _questions.size():
		_finished = true
		if is_inside_tree():
			_render()
		finished.emit(_result())
		return
	_index += 1
	_graded = false
	_typed = ""
	if is_inside_tree():
		_render()

func _result() -> Dictionary:
	return {"learned":_learned.duplicate(true),"correct":_correct,"total":_graded_count,"xp":_correct*8,"coins":_correct,"summary":"%d of %d retrievals correct. Due words advance their spaced review; early practice keeps its schedule." % [_correct,_graded_count]}

func _stop_voice() -> void:
	if not _voice.is_empty():
		DisplayServer.tts_stop()

func _speak() -> void:
	if _voice.is_empty() or _questions.is_empty() or _graded or _finished:
		return
	var word: Dictionary = _words[_questions[_index].wordId]
	DisplayServer.tts_speak(str(word.translations[_language].text), _voice, 65, 1.0, .85, 0, true)

func _close() -> void:
	if _cancelled:
		return
	_cancelled = true
	_stop_voice()
	closed.emit()

func _style(color: Color, border: Color = Color("d5dfce")) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(14)
	style.set_content_margin_all(16)
	return style

func _label(text: String, parent: Node, font_size: int = 18, color: Color = INK) -> Label:
	var label = Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(label)
	return label

func _button(text: String, callback: Callable, parent: Node, primary: bool = false) -> Button:
	var button = Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 56)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.add_theme_font_size_override("font_size", 18)
	button.add_theme_color_override("font_color", CREAM if primary else INK)
	button.add_theme_stylebox_override("normal", _style(GREEN if primary else Color("f2f0e4")))
	button.add_theme_stylebox_override("hover", _style(Color("64886d") if primary else Color("e2ead9")))
	button.add_theme_stylebox_override("focus", _style(Color(0,0,0,0), Color("d5b878")))
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.pressed.connect(callback)
	parent.add_child(button)
	return button

func _render() -> void:
	if _ui != null:
		remove_child(_ui)
		_ui.queue_free()
	_ui = MarginContainer.new()
	_ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_ui)
	for side in ["left", "right", "top", "bottom"]:
		_ui.add_theme_constant_override("margin_"+side, 16)
	var panel = PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _style(CREAM))
	_ui.add_child(panel)
	var layout = VBoxContainer.new()
	layout.add_theme_constant_override("separation", 14)
	panel.add_child(layout)
	var header = HBoxContainer.new()
	layout.add_child(header)
	var titles = VBoxContainer.new()
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(titles)
	_label("YOUR WORDS, REMEMBERED OVER TIME", titles, 12, MUTED)
	_label("%s · word practice" % LANGUAGE_NAMES[_language], titles, 28)
	var close_button = _button("Close", _close, header)
	close_button.custom_minimum_size.x = 100
	close_button.size_flags_horizontal = Control.SIZE_SHRINK_END
	var scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	layout.add_child(scroll)
	var content = VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 15)
	scroll.add_child(content)
	if _questions.is_empty():
		_label("Your discoveries will become your practice.", content, 26)
		_label("Walk around town and examine a few objects first. This workbench only reviews words you have personally discovered.", content)
		_button("Back to town", _close, layout, true)
		return
	if _finished:
		_label("Practice complete", content, 30, GREEN)
		_label(_result().summary, content, 22)
		_label("+%d XP · +%d coins" % [_correct*8,_correct], content, 20)
		_button("Return to your adventure", _close, layout, true)
		return
	var question: Dictionary = _questions[_index]
	var word: Dictionary = _words[question.wordId]
	var translation: Dictionary = word.translations[_language]
	var progress = ProgressBar.new()
	progress.max_value = _questions.size()
	progress.value = _index + (1 if _graded else 0)
	progress.show_percentage = false
	progress.custom_minimum_size.y = 12
	layout.add_child(progress)
	_label("Question %d of %d · %d correct" % [_index+1,_questions.size(),_correct], content, 15, MUTED)
	if _graded:
		_label("Well remembered." if _was_correct else "Keep this one close.", content, 28, GREEN if _was_correct else RED)
		_label(str(translation.text), content, 34)
		_label(str(translation.get("reading", "")), content, 20, MUTED)
		_label(str(word.english), content, 23)
		var record: Dictionary = _learned[question.wordId]
		_label("Mastery %d / 5 · %s" % [int(record.get("mastery",0)),"A correct due retrieval advances your next review." if _was_correct else "This word returns in one minute. Mistakes are part of learning."], content, 17, MUTED)
		_button("Finish practice" if _index+1==_questions.size() else "Continue", next_question, layout, true)
		return
	if question.type == "listen":
		_label("Listen and choose the English meaning.", content, 27)
		if _voice.is_empty():
			_label("No installed %s voice is available. Written listening fallback:" % LANGUAGE_NAMES[_language], content, 16, MUTED)
			_label(str(translation.text), content, 32)
			_label(str(translation.get("reading", "")), content, 19, MUTED)
		else:
			_button("▶  Hear the word again", _speak, content)
			_speak.call_deferred()
	elif question.type == "type":
		_label("Write the %s word for:" % LANGUAGE_NAMES[_language], content, 24)
		_label(str(word.english), content, 34)
		_label("Native spelling or its reading is accepted. German nouns accept the article or the bare noun.", content, 16, MUTED)
		var input = LineEdit.new()
		input.placeholder_text = "Type your answer…"
		input.text = _typed
		input.custom_minimum_size.y = 62
		input.add_theme_font_size_override("font_size", 24)
		input.text_changed.connect(func(value: String): _typed = value)
		input.text_submitted.connect(func(value: String): answer_current(value))
		content.add_child(input)
		input.grab_focus.call_deferred()
		_button("Check answer", func(): answer_current(_typed), layout, true)
		return
	else:
		_label("Choose the %s word for:" % LANGUAGE_NAMES[_language], content, 24)
		_label(str(word.english), content, 34)
	var options = GridContainer.new()
	options.columns = 2
	options.add_theme_constant_override("h_separation", 12)
	options.add_theme_constant_override("v_separation", 12)
	content.add_child(options)
	for option in question.options:
		var option_id: String = str(option)
		var option_word: Dictionary = _words[option_id]
		var text: String = str(option_word.english) if question.type == "listen" else str(option_word.translations[_language].text)
		var button = _button(text, answer_current.bind(option_id), options)
		button.custom_minimum_size.y = 78
