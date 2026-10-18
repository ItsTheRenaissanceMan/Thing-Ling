#!/usr/bin/env python3
"""Audit the shipped native content, including physical reachability at doors.

No independent fixtures replace the actual town, sentence curriculum, jobs, or
audio. This script is intentionally separate from Godot's scene/physics tests.
"""
from __future__ import annotations

import json
import math
import struct
import sys
import unicodedata
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NATIVE = ROOT / "native"
failures: list[str] = []
checks = 0


def check(condition: bool, message: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(message)


def read(relative: str) -> dict:
    path = NATIVE / relative
    check(path.is_file(), f"Required native content exists: {relative}")
    if not path.is_file():
        return {}
    try:
        result = json.loads(path.read_text())
        check(isinstance(result, dict), f"Native content is a JSON object: {relative}")
        return result if isinstance(result, dict) else {}
    except (ValueError, OSError) as error:
        check(False, f"Readable native JSON {relative}: {error}")
        return {}


town = read("data/town.json")
vocabulary = read("data/vocabulary.json")
extra = read("data/extra_vocabulary.json")
story = read("data/story.json")
venues = read("data/activities.json")
models = read("data/models.json").get("models", {})
audio = read("audio/profiles.json")
venue_challenges = read("data/venue_challenges.json")
maps = {m["id"]: m for m in town.get("maps", [])}
words = {w["id"]: w for w in vocabulary.get("words", []) + extra.get("words", [])}
npcs = {n["id"]: n for n in town.get("npcs", [])}
challenges = {**story.get("challenges", {}), **venue_challenges.get("challenges", {})}
old_ids = {"little-hello", "kettle-on", "breakfast-club", "lantern-cafe", "first-seedlings", "orchard-colors", "small-neighbors", "garden-in-bloom", "water-edge", "lost-and-found", "homecoming-parcel", "harbor-lanterns"}
new_ids = {"supermarket", "restaurant", "post-office", "nightlife", "school", "clinic", "workshop", "library", "hotel", "tailor", "station", "museum", "bank", "cinema", "music-studio", "sports-center"}
expected = old_ids | new_ids


def size(item: dict) -> tuple[float, float, float]:
    if "size" in item:
        return tuple(item["size"])
    key = item["wordId"] + ("@" + item["variant"] if item.get("variant") else "")
    source = models.get(key, models.get(item["wordId"], {"size": [.7, .7, .7]}))
    return tuple(component * item.get("scale", 1) for component in source["size"])


def bounds(item: dict, physical: bool = False) -> tuple[float, ...]:
    width, height, depth = size(item)
    if physical and item["wordId"] == "tree":
        width = depth = .6
    if physical and item["wordId"] in {"lamp", "sign", "mailbox", "flag"}:
        width = depth = .28
    angle = item.get("rotation", 0)
    if abs(angle) > math.tau:
        angle = math.radians(angle)
    cosine, sine = abs(math.cos(angle)), abs(math.sin(angle))
    width, depth = cosine * width + sine * depth, sine * width + cosine * depth
    return item["x"] - width / 2, item["x"] + width / 2, item["z"] - depth / 2, item["z"] + depth / 2, item.get("y", 0), item.get("y", 0) + height


def point_blocked(x: float, z: float, obstacles: list, radius: float = .32) -> list[str]:
    return [o["id"] for o in obstacles if (lambda b: b[0] - radius < x < b[1] + radius and b[2] - radius < z < b[3] + radius)(bounds(o, True))]


check(set(maps) == expected | {"town"}, "Town and every one of the 28 venues have authored maps")
check(len(maps) == len(town.get("maps", [])), "Map IDs are unique")
check({l["id"] for l in vocabulary.get("languages", [])} == {"de", "ja", "es", "zh"}, "All four requested languages are present")
check(len(npcs) >= 30, "The town has a substantial cast of authored NPCs")
check(expected <= set(venues.get("venues", {})), "Every interior has a designed playable venue activity")
check(len(venues.get("recipes", {})) >= 20, "The café offers a substantial authored recipe collection")
for word_id, word in words.items():
    for language in ("de", "ja", "es", "zh"):
        check(bool(word.get("translations", {}).get(language, {}).get("text")), f"Four-language noun label: {word_id}/{language}")
    check(word_id in models, f"A real native noun model exists: {word_id}")

total_objects = 0
for map_id, place in maps.items():
    objects = place.get("objects", [])
    total_objects += len(objects)
    by_id = {o["id"]: o for o in objects}
    obstacles = [o for o in objects if o.get("solid") and not o.get("parentId")]
    check(len(by_id) == len(objects), f"Unique object IDs: {map_id}")
    check(len(objects) >= (1000 if map_id == "town" else 90), f"Detailed populated environment: {map_id}")
    check(place.get("width", 0) >= (160 if map_id == "town" else 38) and place.get("depth", 0) >= (140 if map_id == "town" else 34), f"Large playable environment: {map_id}")
    check(bool(place.get("npcs")), f"Each environment has NPCs: {map_id}")
    for item in objects:
        check(item["wordId"] in words, f"Known label for object: {map_id}/{item['id']}")
        check(item["wordId"] in models, f"No fallback crate model: {map_id}/{item['id']}")
        b = bounds(item)
        check(b[0] >= -place["width"] / 2 - .05 and b[1] <= place["width"] / 2 + .05 and b[2] >= -place["depth"] / 2 - .05 and b[3] <= place["depth"] / 2 + .05, f"Object fits map bounds: {map_id}/{item['id']}")
        if item.get("parentId"):
            check(item["parentId"] in by_id, f"Supported item has a real parent: {map_id}/{item['id']}")
    # The parent exception only permits a supported item against its own support;
    # sibling products and independent props are still checked in full 3D.
    boxes = [bounds(item) for item in objects]
    for i, item in enumerate(objects):
        a = boxes[i]
        for j in range(i + 1, len(objects)):
            other = objects[j]
            if item.get("parentId") == other["id"] or other.get("parentId") == item["id"]:
                continue
            b = boxes[j]
            intersects = a[0] < b[1] - .015 and a[1] > b[0] + .015 and a[2] < b[3] - .015 and a[3] > b[2] + .015 and a[4] < b[5] - .025 and a[5] > b[4] + .025
            check(not intersects, f"No independent object overlap: {map_id}/{item['id']} / {other['id']}")
    spawn = place.get("spawn", [])
    check(len(spawn) == 2 and not point_blocked(*spawn, obstacles), f"Clear avatar spawn: {map_id}")
    for portal in place.get("portals", []):
        target = maps.get(portal.get("target"))
        check(target is not None, f"Portal has a real destination: {map_id}/{portal['id']}")
        check(not point_blocked(portal["x"], portal["z"], obstacles), f"Door is physically accessible: {map_id}/{portal['id']}")
        if target:
            target_obstacles = [o for o in target.get("objects", []) if o.get("solid") and not o.get("parentId")]
            target_spawn = portal.get("spawn", [])
            check(len(target_spawn) == 2 and not point_blocked(*target_spawn, target_obstacles), f"Door arrives in clear walkable space: {map_id}/{portal['id']}")
    for npc in place.get("npcs", []):
        check(npc["id"] in npcs, f"NPC placement has a written character: {map_id}/{npc['id']}")
        check(not point_blocked(npc["x"], npc["z"], obstacles, .29), f"NPC starts outside solid props: {map_id}/{npc['id']}")
        route = npc.get("route", [])
        check(len(route) >= 2, f"NPC has an authored movement route: {map_id}/{npc['id']}")
        for index, point in enumerate(route):
            check(not point_blocked(*point, obstacles, .29), f"NPC route stop is clear: {map_id}/{npc['id']}/{index}")
    profile = audio.get("profiles", {}).get(place.get("ambience"), {})
    check(bool(profile), f"An environment-specific audio profile exists: {map_id}")
    audio_path = NATIVE / str(profile.get("path", "")).removeprefix("res://")
    check(audio_path.is_file(), f"Matching environment audio is packaged: {map_id}")

hub = maps.get("town", {})
buildings = [o for o in hub.get("objects", []) if o.get("buildingMap")]
check(len(buildings) == 28 and {b["buildingMap"] for b in buildings} == expected, "Every authored town building has its own interior")
check({"village", "garden", "harbor", "market", "nightlife"} <= {d["id"] for d in hub.get("districts", [])}, "Village, garden, harbor, market, and nightlife districts remain usable")
check(len(hub.get("traffic", [])) >= 2, "Several vehicles have street routes")
for building in buildings:
    portals = [p for p in hub.get("portals", []) if p.get("buildingId") == building["id"]]
    check(len(portals) == 1 and portals[0]["target"] == building["buildingMap"], f"Building door enters the right venue: {building['id']}")
    check(any(p.get("target") == "town" for p in maps[building["buildingMap"]].get("portals", [])), f"Every interior has a town exit: {building['buildingMap']}")

check(old_ids <= {q["id"] for q in story.get("quests", [])}, "Every original mission has a native story implementation")
seen = set()
for quest in story.get("quests", []):
    check(set(quest.get("requires", [])) <= seen, f"Mission prerequisites are complete and acyclic: {quest['id']}")
    seen.add(quest["id"])
    check(quest.get("npcId") in npcs, f"A written NPC assigns the mission: {quest['id']}")
    steps = quest.get("steps", [])
    check(len(steps) >= 5, f"Mission has an actual multi-stage narrative: {quest['id']}")
    check(any(s["type"] == "challenge" for s in steps), f"Mission requires full-sentence grammar: {quest['id']}")
    check(any(s["type"] in {"collect", "use", "deliver", "activity"} for s in steps), f"Mission requires gameplay beyond naming: {quest['id']}")
    for step in steps:
        place = maps.get(step.get("mapId", quest.get("mapId")))
        check(place is not None, f"Mission step has a built map: {quest['id']}/{step['type']}")
        if place and step.get("wordId") and step["type"] in {"collect", "use"}:
            check(any(o["wordId"] == step["wordId"] for o in place.get("objects", [])), f"Physical mission noun exists on its required map: {quest['id']}/{step['wordId']}/{place['id']}")
        if place and step.get("npcId"):
            check(any(n["id"] == step["npcId"] for n in place.get("npcs", [])), f"Mission speaker is physically present: {quest['id']}/{step['npcId']}/{place['id']}")
        if step.get("challengeId"):
            check(step["challengeId"] in challenges, f"Mission sentence challenge is authored: {quest['id']}/{step['challengeId']}")

for challenge_id, challenge in challenges.items():
    for language in ("de", "ja", "es", "zh"):
        translation = challenge.get("translations", {}).get(language, {})
        answer = translation.get("answer", "")
        choices = translation.get("choices", [])
        check(bool(answer) and len(answer) >= (4 if language in {"ja", "zh"} else 8), f"Full localized sentence: {challenge_id}/{language}")
        check(len(choices) == 3 and len(set(choices)) == 3 and choices.count(answer) == 1, f"Three distinct meaningful choices with one matching answer: {challenge_id}/{language}")
        check(bool(translation.get("explanation")), f"Specific grammar explanation: {challenge_id}/{language}")
        if language in ("ja", "zh"):
            check(bool(translation.get("reading")), f"Romanized reading is available: {challenge_id}/{language}")
        tokens = translation.get("tokens", [])
        normalize = lambda text: "".join(char for char in text.casefold() if not char.isspace() and unicodedata.category(char)[0] not in {"P", "S"})
        check(len(tokens) >= 2 and normalize("".join(tokens)) == normalize(answer), f"Native sentence composer reconstructs its answer: {challenge_id}/{language}")
for venue in expected:
    for tier in (1, 2, 3):
        challenge_id = "venue-" + venue + (f"-{tier}" if tier > 1 else "")
        # Original island venues may intentionally share their authored story
        # dialogue group; the activity's declared base is authoritative.
        base = venues.get("venues", {}).get(venue, {}).get("challenge", "")
        challenge_id = base + (f"-{tier}" if tier > 1 else "")
        check(challenge_id in challenges, f"Each venue has three grammar difficulty tiers: {venue}/{tier}")

audio_fingerprints = set()
environment_ids = {place.get("ambience") for place in maps.values()}
for profile_id in environment_ids:
    profile = audio.get("profiles", {}).get(profile_id, {})
    if not profile:
        continue
    path = NATIVE / profile["path"].removeprefix("res://")
    if not path.is_file():
        continue
    with wave.open(str(path)) as sound:
        check(sound.getnframes() / sound.getframerate() >= 20, f"Sustained original environment ambience: {profile_id}")
        data = sound.readframes(sound.getnframes())
        samples = struct.unpack("<" + "h" * (len(data) // 2), data)
        rms = math.sqrt(sum(s * s for s in samples) / max(len(samples), 1)) / 32768
        check(.0001 < rms < .2, f"Audio is audible and has safe headroom: {profile_id}")
        audio_fingerprints.add(hash(data))
check(len(audio_fingerprints) == len(environment_ids), "Each actual environment has a distinct authored audio bed; aliases may share files")

report = {"passed": not failures, "checks": checks, "maps": len(maps), "interiors": len(buildings), "objects": total_objects, "characters": len(npcs), "vocabulary": len(words), "sentenceChallenges": len(challenges), "ambienceProfiles": len(audio.get("profiles", {})), "failures": failures}
print("NATIVE_CONTENT " + json.dumps(report, ensure_ascii=False))
sys.exit(0 if not failures else 1)
