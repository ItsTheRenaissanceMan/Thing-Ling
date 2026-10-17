# Validation record

Validated on 17 October 2026 in the managed cloud environment with Node.js 24.19.0, Vite 8.3.4, and system Chromium. Browser automation used software WebGL and reduced motion; the normal game does not require those test flags.

## Installation and production build

- A clean `npm ci --cache /workspace/.cache/thing-ling/npm --no-audit --no-fund` succeeded with the project’s dependency lock.
- `npm run build` succeeded. The result is a roughly 1.18 MB HTML file embedding the application, styles, fonts, and procedural 3D world.
- The development server answered its internal readiness request with HTTP 200. The application and production build both mounted and rendered the actual WebGL island.
- Installation/startup instructions and the actual repository mount path were saved to the environment configuration draft. This confirms draft persistence, not publication or restoration in another task.

## Learning and story tests

`npm test`: **25 passed, 0 failed, 0 skipped**.

The suite exercises vocabulary coverage for exactly German, Japanese, Spanish, and Chinese; immutable one-time discovery rewards; due-date ordering; successful and incorrect review scheduling; mastery caps; early practice without mastery inflation; daily streak rules; four distinct answer options; typed native/romanized answers; XP levels; safe save import validation and migrations; quest prerequisites and completion rewards; a valid quest graph; and complete, idempotent conversation scenarios.

## Browser playtests

`npm run test:e2e`: **8 passed, 0 failed, 0 skipped** in the final run.

1. The WebGL island starts, neighborhood navigation works, no runtime or console errors occur, and all main sections fit a 390 px mobile viewport.
2. Discovering a word grants its reward once; separate language wordbooks and the active selection persist through reload.
3. A complete mixed review session accepts matching, written listening fallback, and romanized Japanese typing. Immediate repetitions do not inflate spaced mastery.
4. An incorrect typed answer shows the actual correct answer, updates the review record, and waits for the player to continue.
5. The opening quest requires its discoveries, awards its completed challenge once, and remains complete after reload.
6. Sound/motion preferences survive reload, exports contain the actual save, and malformed imports preserve existing progress.
7. A German conversation explains an incorrect phrase, permits retry, completes all three contextual moments, and grants its reward once, including after replay/reload.
8. Valid earned quest branches restore the garden and café independently, including switching languages with the same number of completed landmarks. A lantern project charges exactly once, persists after reload, and leaves another language’s coins untouched.

## Portable build check

The managed browser rejects direct `file:` navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Direct file opening was therefore **not** verified in this environment. The same unmodified production HTML was served locally instead.

After its initial response, browser networking was disabled. The following real UI flow passed: choose Chinese; discover 苹果; answer a typed recall question using `ping guo`; export progress; cancel a reset; confirm a reset; import the exported backup through the confirmation flow; compare the restored save exactly to the export. After reconnecting to the local server, reload preserved the Chinese selection and word record. There were **zero separate asset/external requests and zero page errors**. Local-file restrictions on a player’s device can be handled by the documented local server option.

## Visual and world interaction checks

Desktop and mobile screenshots were inspected for the island, wordbook, practice, quests, phrases, conversations, word dialogs, quizzes, and settings. Original scene interactions were also checked directly: NPC selection, actual canvas raycasting on the apple, discovered-word markers, independent milestone visuals, cosmetic project visibility, pause/resume, and disposal. Geometry batching reduced the measured scene draw calls from about 1,822 to 328 per rendered frame. Inactive scenes produced no draw calls during the sampled interval.

## Limits

- Noun Town's official site, Steam page, metadata, and reviews were blocked during the initial 17 October build. Network access became available before publication on 18 October; the completed [research report](RESEARCH.md) now records the actual sources, review sample, findings, and remaining uncertainties.
- Device-specific native speech playback and microphone recognition need testing on the player’s device; this environment has no matching installed voices. Written fallbacks were tested.
- No cross-device cloud save, VR mode, certified proficiency scoring, trained pronunciation assessment, or native-speaker curriculum review is claimed.
- This is a tested first playable edition with the content volume documented in the README. Long-term learning effectiveness, every hardware/browser combination, direct local-file launch, environment publication, and a newly restored cloud task were not verified.

## Windows package

The Windows package adds `Play Thing Ling.cmd` and a readable PowerShell launcher source, without changing the game code. `npm run package:windows` successfully rebuilt the identical portable HTML and generated the launch folder. The launcher uses Windows PowerShell 5.1 APIs, binds a TCP listener to IPv4 loopback on a fixed port, and serves only the included game HTML. It does not install a service, require an execution-policy override, or open an existing unidentified service when its port is occupied.

Static review checked CMD quoting and real CRLF line endings, the 2,991-character command against CMD's limit, environment-variable handling of folder paths, PowerShell 5.1 syntax, bounded request reads, raw UTF-8 game bytes, response lengths, GET/HEAD handling, and save-origin consistency. The generated package was checked for ZIP integrity and byte-for-byte equality between its game HTML and the tested production build. No Windows machine or PowerShell runtime is available in this workspace, so **native Windows launcher execution has not been tested**.
