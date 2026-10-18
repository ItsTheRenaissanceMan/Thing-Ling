# Native 2.0 validation

The native project is `native/`, pinned to Godot 4.6.3. These checks exercise its actual scripts, Controls, physics scenes and assets. The earlier browser edition has its own historical [validation record](VALIDATION.md).

## Reproducing the checks

From the repository root on Linux, with Godot 4.6.3, Python 3.11+ and Node.js installed:

```sh
node scripts/generate-native-town.mjs --check
bash scripts/test-native.sh
bash scripts/test-native-ui.sh
```

The data generator uses the repository's JavaScript dependencies; use `npm ci` first when regenerating or checking authored placements. Running the native game itself does not require Node.js.

The headless runner uses isolated writable XDG directories under `/tmp/thing-ling-native-tests`, preserving player saves. The graphical runner uses `/tmp/thing-ling-native-ui`, a 1440×900 Xorg framebuffer and Mesa software OpenGL. It can reuse a working `DISPLAY`, or start the bundled dummy-screen configuration when the Xorg dummy driver and `xdpyinfo` are installed. It stops only a display server it started. Screenshots go to ignored `native/test-output/`.

`GODOT_BIN`, `THING_LING_TEST_ROOT` and `THING_LING_UI_TEST_ROOT` can override the executable and test directories. The cloud's audio driver has no speakers, so graphical tests select Godot's Dummy audio driver. Environmental stream contents, playback transitions and selection are checked separately; listening on a physical Windows PC remains unverified.

## Recorded checks

| Check | Verified behavior |
| --- | --- |
| Deterministic town and spatial audit | 29 maps, 28 entrances/interiors, 5,030 authored props, support relationships, bounds, clear spawns/doors, NPC routes, traffic routes and connected walking access |
| Native engine integration — 8,370 checks | All 12 ordered mission chains in all four languages; correct map/object/NPC requirements, physical inventory, handovers, reward idempotence, actual WASD/E movement and collision, moving residents/traffic, all 29 world scenes, disk saves and malformed backup rejection |
| Language content — 7,161 checks | 120 authored sentence challenges, native spellings/readings, distractors, three-tier grammar, dialogue branches, 100 physical mission stages and recipe-specific confirmations |
| Town data — 6,446 checks | All authored destinations, labels, supported placements, clear routes and mission targets |
| Review — 201 checks | Due-first five-question sessions, matching/listening fallback/typing Controls, all four languages, exact review intervals, early-practice behavior, mistakes and duplicate grading protection |
| Physical interaction rules — 26 checks | Every required campaign collection stage has a real pickup action, including the harbor lantern supply |
| Activity rules — 9,972 checks / 364 complete workflows | Every venue in four languages and three difficulties; all 30 recipes reachable through rotating shifts, exact ingredients and step order, scans/change/budgets/substitutions, quantities, numerical/sequence/set/seat/cash/rhythm tasks and incorrect-action retries |
| Actual venue Controls — 256 checks / 30 completed shifts | All 28 venues, three-order café and three-customer cashier shifts, Japanese customer shopping, Spanish sentence composition, Chinese advanced written/pinyin answers, bank/cinema and real elapsed-time rhythm work; passed headlessly and graphically |
| Production graphical UI — 229 checks | Real scene/menu, unique noun directory, no remote pickup/XP, physical E door entry/exit, NPC assignment, three collected supplies, full-sentence answer, all three Almanac job requests, physical return/handover, five saved review answers, first-person F toggle, shelf quantities, pinned shopping list, completed physical shopping/checkout and exact save reload |
| Exact embedded Windows PCK — 330 checks | Exported production scene, all 29 live maps, 10 data-file hashes, every model/label/clear spawn/ambience, café and supermarket Controls, bundled CJK font, all 29 environmental streams and 11 effects; development tools/tests/screenshots excluded |

The final `scripts/test-native.sh` and `scripts/test-native-ui.sh` runs both exited successfully on 18 October 2026. The graphical run used Xorg and OpenGL 4.5 Mesa llvmpipe. This speakerless Linux image reports missing optional speech-dispatcher and unsupported V-Sync; written readings were tested, and no gameplay/parser errors or leaked-resource warnings remained in the final UI run.

Recorded screenshots: [town](native-town.png), [café ingredient workbench](native-cafe.png), [stocked supermarket](native-supermarket.png), [first-person shopping](native-first-person.png), [mission sentence challenge](native-conversation.png) and [completed cashier receipt](native-checkout.png). These are captures of the running native renderer or its actual activity Controls.

The world renderer also audits its actual model bounds and semantic records. The final model library has 273 models; all 29 maps instantiate 5,801 labelled semantic instances and 75 resident placements, with no unknown vocabulary, missing/oversized models or solid-overlapping player spawns. Extra terrain and building-part records explain the difference from the 5,030 authored placement count. The follow/overview/first-person cameras retain the same physical player, and indoor first-person view includes upper walls and a ceiling.

The game contains 29 distinct original 24-second environmental loops and 11 effects. Stream wrapping, crossfade cleanup, volume and sound toggling were checked. Noto Sans CJK is bundled under its included OFL license; target-language text can render offline. Pronunciation depends on installed system voices, with written readings when a voice is absent.

Save tests include actual atomic disk replacement and a new state loading the result. Position storage uses a binary grid smaller than one millimetre to avoid decimal-parser drift in raw physics coordinates. Counters, language-specific bags, discoveries, grammar, missions, jobs and rewards survive the round trip. Invalid nested counters and unknown maps/items are rejected before replacing any existing language save.

## Windows delivery and limits

The release target is a standalone Windows x86-64 PE executable with its Godot PCK embedded. The packager verifies the official export template's pinned SHA-256, PE architecture, PCK header/footer, ZIP integrity and executable/archive hashes. The source and procedural assets remain in the repository; players only need the extracted executable.

The published [Windows archive](../downloads/Thing-Ling-Windows.zip) contains **58,860,653 bytes**. Its SHA-256 is `69c585e1f47e485cfba30c5861147dac86ba5bf459b397ab72e3d447a4cb7d10`. The embedded executable is 154,871,904 bytes, with SHA-256 `d2ef659aeafdde9c62617c0ebfa697d8a1826489090f3065df9027d89cf4974d`. The adjacent [release manifest](../downloads/Thing-Ling-Windows.json) records both. Archive CRC, its five members, bundled license texts, README and internal executable checksum were verified.

The exact exported executable's embedded PCK was mounted with Linux Godot from an empty directory outside the checkout. All 330 checks passed without source fallback, loading each map and verifying frozen source data hashes. The original browser launcher is preserved separately as `Thing-Ling-Browser-Windows.zip`; it cannot overwrite the native default during legacy packaging.

Export validation must be distinguished from Windows execution: the development host is Linux. Loading the exact embedded pack with Linux Godot can verify shipped resources and game behavior, but cannot verify Windows graphics/audio drivers, OS voices, antivirus behavior or a launch on the user's PC.

The mission image referenced in the request was not attached. All existing twelve mission chains are implemented and tested; exact correspondence to an unseen image remains open in the [word-for-word checklist](USER_REQUEST_CHECKLIST.md).
