extends SceneTree

const Review = preload("res://scripts/review.gd")
var failures: Array[String] = []
var checks: int = 0
var finish_events: int = 0
var progress_events: int = 0

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var vocabulary: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/vocabulary.json"))
	var words: Dictionary = {}
	for word: Dictionary in vocabulary.words:
		words[word.id] = word
	var original: Dictionary = {"discovered":100,"correct":2,"wrong":1,"mastery":0}
	var source: Dictionary = original.duplicate(true)
	var updated: Dictionary = Review.grade_record(original, true, 1000)
	check(original==source, "Grading must not mutate a source discovery")
	check(updated.mastery==1 and updated.dueAt==1600, "Legacy missing dueAt must schedule a ten-minute first retrieval")
	check(updated.correct==3 and updated.wrong==1 and updated.discovered==100, "Grading must retain discovery data and counters")
	var early: Dictionary = Review.grade_record(updated, true, 1001)
	check(early.mastery==1 and early.dueAt==1600 and early.correct==4, "Early success earns effort without postponing the scheduled review")
	for level in range(5):
		var record: Dictionary = {"mastery":level,"dueAt":1000,"correct":0,"wrong":0}
		var result: Dictionary = Review.grade_record(record,true,1000)
		check(result.mastery==level+1, "A due success advances mastery")
		check(result.dueAt==1000+Review.INTERVALS[level], "Every mastery level uses its expected spaced interval")
	var capped: Dictionary = Review.grade_record({"mastery":5,"dueAt":1000},true,1000)
	check(capped.mastery==5 and capped.dueAt==1210600,"Mastery five stays capped and schedules fourteen days")
	var wrong: Dictionary = Review.grade_record({"mastery":3,"dueAt":2000,"wrong":4},false,1000)
	check(wrong.mastery==2 and wrong.wrong==5 and wrong.dueAt==1060,"Wrong answers lower mastery and return in sixty seconds even during early practice")
	check(Review.grade_record({"mastery":0},false,1000).mastery==0,"Failure cannot lower mastery below zero")
	check(Review.normalize_answer("  DIE Äpfel! ")=="dieapfel","Latin normalization ignores punctuation, spaces and accents")
	check(Review.normalize_answer("グラス")!=Review.normalize_answer("クラス"),"Japanese dakuten must preserve a meaningful distinction")
	check(Review.normalize_answer("か\u3099く")==Review.normalize_answer("がく"),"Canonical decomposed Japanese voicing is accepted")
	check(Review.normalize_answer("ＷＡＳＳＥＲ！")=="wasser","Fullwidth Latin input normalizes safely")
	check(Review.check_word_answer(words.apple,"DER APFEL!","de"),"German article answer accepted")
	check(Review.check_word_answer(words.apple,"Apfel","de"),"German bare noun accepted")
	check(Review.check_word_answer(words.apple,"ringo","ja"),"Japanese reading accepted")
	check(Review.check_word_answer(words.apple,"りんご","ja"),"Japanese native writing accepted")
	check(Review.check_word_answer(words.apple,"ping guo","zh"),"Chinese pinyin accepts tone-free input")
	check(Review.check_word_answer(words.apple,"苹果","zh"),"Chinese native writing accepted")
	check(not Review.check_word_answer(words.apple,"pear","de"),"Wrong translations remain wrong")
	check(not Review.check_word_answer(words.apple,"","de"),"Blank answers are not correct")
	check(Review.build_session(words,{},"de").is_empty(),"No review may invent an undiscovered word")
	check(Review.build_session(words,{"unknown":{"mastery":0}},"de").is_empty(),"Unknown legacy word IDs cannot enter a session")
	for language: String in ["de","ja","es","zh"]:
		var session: Array = Review.build_session(words,{"apple":{"dueAt":0},"book":{"dueAt":0},"bread":{"dueAt":9999}},language,"mixed",1000)
		check(session.size()==5,"Each language receives a five-question session")
		check(session[0].wordId!="bread" and session[1].wordId!="bread","Due discoveries are reviewed before early words")
		for question: Dictionary in session:
			check(question.wordId in ["apple","book","bread"],"Only personal discoveries may become questions")
			check(question.options.has(question.wordId),"Every choice includes its correct answer")
			var seen: Dictionary = {}
			for id in question.options:
				var native: String = Review.normalize_answer(str(words[id].translations[language].text))
				check(not seen.has(native),"A choice must not duplicate a normalized translation")
				seen[native]=true
			check(seen.size()==4,"Normal vocabulary produces four distinct choice cards")
	# Exercise the actual Control API, duplicate-submit protection and cumulative reward contract.
	var learned: Dictionary = {"apple":{"discovered":100,"correct":0,"wrong":0,"mastery":0}}
	var learner_source: Dictionary = learned.duplicate(true)
	var ui = Review.new()
	ui.setup("de",words,learned,"choice")
	ui.progress_changed.connect(func(_result: Dictionary):progress_events+=1)
	ui.finished.connect(func(_result: Dictionary):finish_events+=1)
	for index in range(5):
		check(ui.answer_current("apple",1000+index).get("accepted",false),"First submission is graded")
		check(not ui.answer_current("apple",1000+index).get("accepted",true),"Repeated grading cannot farm rewards")
		ui.next_question()
	ui.next_question()
	var final: Dictionary = ui._result()
	check(final.correct==5 and final.total==5 and final.xp==40 and final.coins==5,"Session effort rewards are counted once per question")
	check(final.learned.apple.mastery==1 and final.learned.apple.dueAt==1600,"Repeated small-pool questions only advance the first due retrieval")
	check(finish_events==1 and progress_events==5,"Finished emits once and each graded question has one persistence update")
	check(learned==learner_source,"Setup and a full UI session preserve the caller's learned dictionary")
	ui.free()
	var empty_ui = Review.new()
	empty_ui.setup("de",words,{})
	check(not empty_ui.answer_current("apple").get("accepted",true),"Empty session is safely ungradable")
	empty_ui.free()
	# Build the actual native widgets, including written audio fallback and typing.
	for mode: String in ["choice","listen","type"]:
		var rendered = Review.new()
		rendered.setup("ja",words,learned,mode)
		root.add_child(rendered)
		await process_frame
		check(rendered.get_child_count()>0,"Review UI builds for mode "+mode)
		if mode=="type":
			var inputs: Array[Node] = rendered.find_children("*","LineEdit",true,false)
			check(inputs.size()==1,"Typed mode provides a native text input")
			inputs[0].text_submitted.emit("ringo")
		else:
			rendered.answer_current("apple",1000)
		await process_frame
		check(rendered.get_session_state().graded,"Rendered answers reach the same protected grading path")
		rendered._close()
		rendered.queue_free()
		await process_frame
	print("Native review: %d checks, %d failures" % [checks,failures.size()])
	for failure: String in failures:
		push_error(failure)
	quit(0 if failures.is_empty() else 1)
