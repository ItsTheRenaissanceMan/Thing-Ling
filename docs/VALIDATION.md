# Validation record — v1.1

Checked on 18 October 2026 in the managed Linux cloud environment with Node.js 24.19.0, Vite 8.3.4, and system Chromium. Browser automation uses software WebGL and reduced motion; normal play uses the player's GPU and does not require those flags.

## Content and unit tests

`npm test`: **44 passed, 0 failed, 0 skipped**.

The checked content contains exactly German, Japanese, Spanish, and Mandarin Chinese; **179 vocabulary entries per language**, **12 mission definitions**, **13 maps**, and **471 authored prop placements**. Generated terrain and structural parts add further discoverable instances.

Tests cover all of the following:

- One-time discovery and mission rewards, review scheduling, early practice without mastery inflation, streaks, answer normalization, and session generation.
- All twelve physical mission chains in each of the four languages, including branch dependencies, correct-map enforcement, task collection, full perfect assessments, and explicit handovers.
- No progression shortcut through wordbook discoveries, incomplete checks, locked locations, or repeat submissions.
- Version-one save migration, legacy completed quests, independent language state, malformed imports, and inconsistent mission records.
- Complete vocabulary references, unique maps, model footprints, rotated/scaled bounds, NPC clearance, and all mission targets physically present.
- Geometry failure cases: intersecting ground props, overlapping dishes on one table, unsupported tabletop items, missing labels, absent targets, and out-of-bounds placements. Parent support exemptions do not exempt sibling items from collision checks.

## Browser playtests

`npm run test:e2e`: **14 passed, 0 failed, 0 skipped** in 10.9 minutes. A newly added valid-backup import regression reproduced a stale task-card reference, then passed after the imported map was loaded before refreshing the HUD. The existing preferences/export/invalid-import case also passed again after that correction (**2 targeted cases passed in 32.4 seconds**). This covers **15 distinct browser cases** overall.

The browser suite exercises the actual UI rather than a hidden progression API:

1. Play all twelve missions in Japanese, travelling to every map, completing each authored object action, passing its randomized word check, and explicitly handing work to its character. Verify rewards remain unavailable before the handover and all twelve completions survive reload.
2. Audit scene labels and the object directory on every map: every rendered semantic instance has a unique ID, a real vocabulary entry, nonempty text, and an accessible inventory entry. Every authored prop and every mission target must also have a label.
3. Complete the opening mission independently in German, Japanese, Spanish, and Chinese; switch language and reload without mixing map or learning progress.
4. Preserve legacy completed quests, reject wordbook shortcuts, save partially completed tasks across reload, and retain tasks after a failed assessment followed by a successful retry.
5. Check atlas, object directory, scene controls, and the other game sections at a 390 × 844 phone viewport without horizontal overflow.
6. Load every map through the actual Three.js renderer, inspect rendered model bounds, and require no oversized models, unintended intersections, or meshes without vocabulary/character ownership. This is additional to the data-level geometry audit.
7. Import a valid backup whose current map differs from the open scene, use the refreshed task card to complete an actual action, and verify its state after reload.
8. Exercise discovery rewards, Japanese written/romanized practice, matching/listening fallbacks, error feedback, preferences, export, invalid import protection, a complete German conversation, separate restoration branches, and one-time cosmetic purchases.

The complete campaign case has a longer timeout because 26 full-size screenshots and all twelve missions run sequentially in a software-rendered browser. Its assertions and required interactions are unchanged.

## Production and portable build

`npm run package:windows` builds a single self-contained HTML file (about 1.28 MB) and prepares the Windows launch folder. The build embeds application code, styles, fonts, and procedural geometry; no separate game asset downloads are required.

The unmodified production HTML passed an offline Chinese mission: travel to Almanac Courtyard, perform all three object actions, answer the full word check, hand over to Theo, and export the resulting save. Networking was disabled after the initial HTML response. After reconnecting and reloading, the language, map, learned words, task records and completion matched the saved state. **Zero separate asset requests and zero page errors** occurred. A final production lighthouse view also verified the lighter night heading and produced the documentation screenshot.

The managed browser rejects direct `file:` navigation. Portable HTML is tested unmodified through a loopback server instead. Direct local-file opening is therefore not verified in this environment.

## Visual inspection

Desktop scene screenshots are captured with and without optional labels for all thirteen maps. Mobile atlas, object inventory, and mission screenshots cover the narrow layout. The map camera resets on travel after object focus; the phone view is positioned above its mission controls. House façades retain labelled doors, windows, shutters, planters, flowers, chimneys and roof detail. A house with authored fixtures uses those fixtures instead of adding duplicate generic doors or windows.

Floating labels avoid one another on screen. Hover cards, the scene inventory, and the full wordbook provide access when a floating label cannot fit. Repeated parts of one recognizable object share a semantic noun; every polygon does not become a separate vocabulary entry.

## Windows and published archives

The Windows launcher uses built-in Windows PowerShell 5.1 APIs and a fixed IPv4 loopback port. It serves only the included HTML and opens the default browser. It does not install a service, require administrator rights, or change execution policy. Its command and CRLF line endings were statically reviewed in the initial release; this update retains that launcher.

Release generation verifies both ZIPs, checks that their HTML is identical to the production build, includes the complete editable project and packaging sources, and refreshes SHA-256 checksums. Archive source checks exclude dependencies, caches, credentials, and browser-test outputs.

**Native Windows launcher execution has not been tested:** this workspace has no Windows or PowerShell runtime. Browser gameplay is tested on Linux Chromium.

## Other limits

- Device voices and microphone recognition need testing on the player's device. Written readings and choice/typing fallbacks are tested; recorded native-speaker audio is not supplied.
- The campaign's authored actions use contextual buttons and visible completion feedback. They do not imply freeform physics, a cooking simulation, or plant-growth timers.
- Long-term retention, independent native-speaker curriculum review, every hardware/browser combination, VR, and cross-device cloud saves are not verified or supplied.
- The [research report](RESEARCH.md) records the actual Noun Town sources and review sample. The current content is documented in [CAMPAIGN.md](CAMPAIGN.md); equivalent commercial content volume is not claimed.
