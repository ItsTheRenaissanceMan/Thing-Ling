# Noun Town research and the Thing-Ling design brief

**Current implementation: native version 2.0.** Thing Ling now has a local Godot desktop edition with a connected town and 28 enterable interiors, 5,030 placed objects, 36 residents, 12 missions containing 100 ordered stages, 239 nouns, 120 authored sentence challenges, venue work and spaced review in German, Japanese, Spanish and Chinese. See the [native manual](NATIVE_GAME.md), [native validation record](NATIVE_VALIDATION.md) and [request checklist](USER_REQUEST_CHECKLIST.md). The browser v1.1 comparison later in this report is retained as historical implementation context; it does not describe the expanded native edition. The original research sources, sample counts and conclusions below have not been replaced by claims about an untested commercial game.

Researched **18 October 2026, Europe/Berlin** (requests around 17 October 22:22–22:25 UTC). This is a source-based product and review analysis, not a first-hand playthrough or an independent assessment of learning outcomes. The sources were initially blocked on 17 October; research resumed after the environment's network policy changed and direct requests succeeded.

## What Noun Town actually offers

The [official website][official], [Steam product page][steam] and [Steam metadata API][metadata] describe a substantial vocabulary-learning game:

- **1,000+ words and phrases**, **12 learning languages**, **11 areas**, and **16 NPCs**. The learning languages are Japanese, Korean, Mandarin Chinese, Spanish from Spain, Mexican Spanish, French, German, Italian, Russian, Greek, Egyptian Arabic, and English. These are publisher claims, not a count independently extracted from the full game.
- An island that begins in **greyscale and gains color with mastered words**. Everyday environments such as the café, beach, farm and food store associate words with their objects and locations.
- Object vocabulary, native-speaker audio, speech recognition, character conversations and evolving relationships. Japanese has furigana and romaji options.
- Different activities attach vocabulary to action: robots for numbers, flower planting for colors, delivery driving for directions, and the shop-counter **Learning Rush** review game. An integrated spaced repetition system schedules review.
- A one-time Steam purchase advertised at **US$19.99**, with no subscription or ads. Desktop play does not require a VR headset; separate Meta Quest and Steam VR versions are linked from the official site. Store prices can vary by region and time.
- The free **LINK** service backs up/synchronizes progress across devices and supplies browser-based SRS review. The website also offers a dictionary, lessons and small browser games.

The developer explicitly frames the game as **beginner vocabulary learning**, or revision for more experienced learners. It does not establish that its complete curriculum teaches general conversational proficiency. The phrase “science-backed” in marketing is not evidence that this particular game has independently demonstrated learning efficacy.

**Do not confuse interface languages with learning languages.** Steam's structured support table lists ten interface languages and includes Brazilian Portuguese, whereas the learning-language list has twelve and excludes Portuguese. A [4 July 2026 negative review][r-portuguese] reports buying it under that misunderstanding. Describe target-language coverage explicitly.

## Updates matter when interpreting criticism

The [official Steam news feed][news] returned the following relevant announcements:

| Date | Publisher announcement | Consequence for this analysis |
| --- | --- | --- |
| 31 October 2024 | v2.30 added progress tracking, achievements, control descriptions, a 30-item review-session limit, dictionary/fabricator improvements and numerous fixes | Old reviews about absent progress tracking, unlimited review burden or the listed bugs cannot establish today's behavior |
| 19 May 2026 | Browser SRS and free web lessons announced | Browser review and supporting lessons are already part of the ecosystem |
| 20 May 2026 | Left Early Access; announcement says the game expanded from 6 to 12 languages and added **no-speech input**, furigana, LINK, Steam Deck support and hundreds of fixes | It would be inaccurate to claim today's game requires speaking, lacks furigana, or never received fixes |
| 30 July 2026 | Announced the separate Learn & Chill idler and reiterated LINK/free web tools | The ecosystem has several products; their feature counts must not be merged with the desktop game |

Steam lists the full-release date as **20 May 2026** and the Early Access date as **2 November 2023**. The five-item news response is not an exhaustive patch history. Neither official fix claims nor player complaints prove the current status of every issue; reproducing them in a purchased current build remains outside this investigation.

## Visual analysis from actual reference images

Three official Steam screenshots were downloaded and visually inspected: [café conversation][image-cafe], [farm animals][image-farm] and [delivery driving][image-delivery]. They show:

- An elevated oblique/isometric view, compact diorama-like scenes, clearly simplified 3D geometry, broad material colors and visible cast shadows.
- **Strong orange/yellow, cyan water, green vegetation and cream accents**, rather than an exclusively muted pastel palette. The driving scene mixes grey surroundings with vivid orange/yellow elements.
- Rounded, exaggerated cartoon people and animals, oversized readable props, and dense clusters of objects that communicate the learning setting.
- A bold interface with black panels, white outlines/text, rounded controls, large portraits and prominent audio/translation actions.

Thing-Ling uses an original, softer pastel harbor/island interpretation of the broad cozy low-poly aesthetic: cream buildings, terracotta roofs, turquoise water and rounded foliage. It does not reproduce Noun Town's distinctive characters, world layout, interface treatment, geometry or image assets. The reference screenshots were used for analysis and are not bundled as game assets.

## Review evidence and sampling

The public Steam page and review APIs were read without authentication. The initial `filter=recent`, `language=english`, `num_per_page=100`, `purchase_type=all` request returned **100 reviews**, with **73 recommended and 27 not recommended**, posted between **26 March and 13 October 2026**. A second request with the same parameters plus `review_type=negative` returned **71 negative reviews**, posted between **2 November 2023 and 13 October 2026**. There were **144 distinct review IDs** across the two responses; 27 overlapped. No pagination was required for the 71-record negative response. These are retrieval counts, not the number of all players.

The English all-purchase API summary was **557 reviews: 486 positive, 71 negative**. The public Steam page separately displayed **718 all-language reviews, 84% positive**, and **11 recent reviews, 45% positive**. Different language/filter scopes explain why these totals should not be equated. The website's **87% / “over 590”** wording differs from the live store display and should not be used as the current store statistic. The store's small recent denominator makes its percentage volatile.

The requests left Steam's off-topic-activity setting at its default; its historical exclusions were not independently reconstructed. The `timestamp_created` field supplied the date ranges; edited reviews can describe experiences from a different time. Eleven of the latest 100 had an update timestamp later than creation. Recommendation flags are coarse: a positive review can contain serious criticism and a negative review can praise useful learning.

For qualitative analysis, close reading focused on the substantive recent reviews cited below and compared them with the official release notes. **The full fetched corpus was not exhaustively human-coded.** Consequently this report gives no percentages for complaint themes and does not represent a random sample, a prevalence estimate, native-speaker certification, or a reproducibility test. Reviews are accounts by individual players, not proven diagnoses of the game's implementation.

### What players value

A [10 July 2026 positive review][r-supplement] calls it a vocabulary supplement that avoids the chore of flashcards, while accepting that the flaws exist. An [4 August 2026 positive German-learning review][r-german] describes enjoyable daily SRS practice, values articles, and still objects to missing plurals. A [5 July 2026 positive Mexican-Spanish review][r-spanish] praises the basic game while reporting misspellings and a translated sentence that omits “in the afternoon.” The useful lesson is to preserve the enjoyable spatial vocabulary loop and investigate content quality independently of the recommendation flag.

### Problems actually reported, with limits

| Theme | Dated evidence | Design implication and uncertainty |
| --- | --- | --- |
| Written form, reading and audio disagree | [13 October, Japanese][r-japanese] reports a ring pronounced/transcribed as *yubiwa* while the accepted romaji was *yubitamaki*. [5 July, Mexican Spanish][r-spanish] reports omitted translation details | Keep native script, reading, accepted answers, audio and meaning aligned. These specific entries were not independently reproduced; our content also requires native-speaker review |
| Speech input feels unreliable | [6 October, Spanish][r-mic] reports intermittent failure to detect a Blue Yeti microphone; [21 July, Mac/Mandarin][r-mac] reports delays, incorrect acceptance and missing tone discrimination | Keep speech optional; never label transcription matching as pronunciation or tone assessment. The May release already includes a no-speech route, so optional input is a parity requirement, not a novel fix |
| Interaction and menus obstruct learning | [21 July, Mac][r-mac] reports imprecise object targeting, inconsistent Escape behavior and waiting without an exit during recognition; [30 May][r-softlock] reports softlocks and awkward placement/decorating | Provide reliable selection, orbit controls, a wordbook route to every object, consistent overlay closure and short feedback loops. Browser interaction still needs testing on real devices |
| Goals and progression are unclear | [14 June][r-goals] reports difficulty understanding how daily nouns/conversations count; [18 July][r-onboarding] reports sparse tutorial explanations and no way to test past already-known vocabulary | Explain discovery, practice and quest completion separately. Offer visible prerequisites and onboarding. Placement testing remains future work in Thing-Ling |
| Vocabulary breadth is not a full curriculum | [20 September][r-scope] values some learning mechanics but criticizes word selection and incomplete-feeling systems; [18 July][r-onboarding] recommends using it as a supplement | Add useful phrases and contextual errands while stating the scope honestly. Our four short conversations are not a grammar or fluency curriculum |
| Linguistic detail matters | [4 August, German][r-german] wants plurals alongside singulars; [18 July, Spanish][r-onboarding] reports valid phrasing rejected and unclear dialect expectations | Provide grammatical information and sensible aliases. Thing-Ling includes German articles and some normalization, but currently lacks a full plural/variant curriculum |

The evidence is mixed, especially about speech: the [14 June review][r-goals] says Japanese recognition worked roughly 75% of the time for that reviewer, and the [20 September review][r-scope] calls pronunciation practice mostly working, depending on the language. Those observations contradict a universal claim that recognition never works. They support offering dependable alternatives and avoiding overconfident scoring.

Statements accusing developers of neglect, motives or misconduct were not adopted as findings. The official release notes show substantial changes, and several detailed complaints postdate those changes; both facts belong in the account.

## Applied design and delivered scope

Thing-Ling was designed while source access was blocked; this completed research checks the resulting direction and identifies remaining gaps. It must not be presented as if all implementation decisions came from reviews read beforehand.

| Area | Noun Town: verified source description | Thing-Ling: implemented v1.1 |
| --- | --- | --- |
| Language/content scope | Publisher advertises 1,000+ words/phrases and 12 learning languages | 179 vocabulary words in each of German, Japanese, Spanish and Mandarin Chinese; 12 practical phrases per language |
| World and residents | 11 areas and 16 voiced NPCs, according to publisher | Thirteen original 3D maps (village hub and twelve mission maps), 471 authored object placements, four characters, 12 dependency-linked missions and four three-step conversations |
| Learning loop | Spatial object learning, mini-games, SRS, speech/no-speech inputs | Discover labelled objects and building parts; complete map-specific tasks, a perfect word check and a character handover; matching, listening and typed recall; scheduled reviews and authored conversations |
| Progression | Greyscale-to-color restoration and relationships | XP, levels, coins, visible restorations, cosmetic projects, daily discovery goal and study streaks |
| Audio | Advertised native-speaker recordings and speech recognition | Installed browser/device TTS voices; written fallback if none matches; optional browser speech recognition. No recorded cast or pronunciation assessment |
| Save/revision | LINK synchronization and browser SRS | Separate local saves per language, validated JSON import/export; no account or cloud synchronization |
| Platform | Separate commercial desktop/VR offerings | Portable single-file browser build and Windows local launcher; no VR support |

The delivered game follows **explore → discover → retrieve → complete a favor → earn a visible reward → return for review**. It deliberately gives every object an alternative route through the searchable wordbook, makes microphone use optional, explains mistakes, and saves separate progress for each learning language. Early additional practice does not advance a word's due date or mastery; successful due reviews do. These choices address credible usability and review concerns without claiming to solve all of Noun Town's problems.

**This is a playable first edition, not content parity with the mature commercial game.** Useful next priorities are independent native-speaker auditing of all four language packs; German plurals and Spanish regional variants; more carefully graded phrase/grammar content; placement testing; more activities that teach verbs/numbers/directions through action; recorded pronunciation; longer resident story arcs; and more manual device/accessibility testing. Expanded word counts should follow verified content quality, not substitute for it.

For what the build actually passed, see [VALIDATION.md](VALIDATION.md). The present research did not independently measure retention, confirm tone accuracy, reproduce every reported Noun Town bug, or test the commercial VR versions.

## Sources

All links below were accessed during the research session on 18 October 2026 in Europe/Berlin. Store/API data can change. Review links are direct public author-review permalinks; dates in this report refer to creation timestamps returned by Steam.

[official]: https://noun.town/
[steam]: https://store.steampowered.com/app/2313720/Noun_Town_Language_Learning/
[metadata]: https://store.steampowered.com/api/appdetails?appids=2313720
[news]: https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2313720&count=5&maxlength=3000
[image-cafe]: https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2313720/a1502ded65fc3e03e59d87117867d3dcb9892345/ss_a1502ded65fc3e03e59d87117867d3dcb9892345.1920x1080.jpg
[image-farm]: https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2313720/ss_b1315e7cbf82b4510f657ff59355699e915522b1.1920x1080.jpg
[image-delivery]: https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2313720/ss_c7df9ab36e805b9b0e8d5c657a380363facb67b7.1920x1080.jpg
[r-japanese]: https://steamcommunity.com/profiles/76561198806192964/recommended/2313720/
[r-mic]: https://steamcommunity.com/profiles/76561198062976528/recommended/2313720/
[r-mac]: https://steamcommunity.com/profiles/76561199113400506/recommended/2313720/
[r-scope]: https://steamcommunity.com/profiles/76561197980786653/recommended/2313720/
[r-onboarding]: https://steamcommunity.com/profiles/76561199577521253/recommended/2313720/
[r-goals]: https://steamcommunity.com/profiles/76561198052884356/recommended/2313720/
[r-softlock]: https://steamcommunity.com/profiles/76561198174888065/recommended/2313720/
[r-german]: https://steamcommunity.com/profiles/76561198312016684/recommended/2313720/
[r-spanish]: https://steamcommunity.com/profiles/76561198085633045/recommended/2313720/
[r-supplement]: https://steamcommunity.com/profiles/76561198064615526/recommended/2313720/
[r-portuguese]: https://steamcommunity.com/profiles/76561199060863904/recommended/2313720/

Reproduce the two review requests:

- [Latest 100 English reviews, all purchase types](https://store.steampowered.com/appreviews/2313720?json=1&language=english&num_per_page=100&purchase_type=all&filter=recent)
- [English negative reviews, latest first, all purchase types](https://store.steampowered.com/appreviews/2313720?json=1&language=english&num_per_page=100&purchase_type=all&filter=recent&review_type=negative)
