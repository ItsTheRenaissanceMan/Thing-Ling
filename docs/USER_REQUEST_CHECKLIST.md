# User request checklist — native town edition

This checklist preserves the user's wording. A checked box means there is built functionality and recorded validation for that request. An unchecked box is still open; planned content and passing parser checks alone are not completion evidence. The complete request is retained verbatim below.

The referenced image was not attached in the conversation. Its exact pictured mission list cannot be verified until the image is supplied. The existing twelve authored missions are retained and expanded independently; they must not be described as an exact match to an unseen image.

## Native game

- [x] “Firstly, you don't need to make this a browser game.”
- [x] “Translate it all into a video game that launches locally on your PC, just like the original game example I have you.”

## Retain and expand the original island

- [x] “Next, I wanted you to keep the old map, even make it bigger, and especially keep the HIGH level of detail with a bunch of objects scattered all over the map.”
- [x] “I mean now the garden and the harbor buttons don't even do anything because you removed all the stuff.”
- [x] “Please make the changes, spend a LOT of time putting it lots of effort making this game much more in depth and fixing these critiques.”
- [x] “I want an environment that feels alive, with objects and characters having animations and los and lots of smaller details”

## Object discovery, maps, player, and missions

- [x] “Also in the "objects here" search, there's loads of repition, when each object should only be listed once.”
- [ ] “Please look at the attached image.” — Blocked: no image was attached.
- [ ] “You need to add ALL of the maps, each map with loads of new objects, that are required to complete those missions.” — Exact image correspondence is unverified while the attachment is missing.
- [x] “Also, there must be gameplay, not just clicking on/hovering over object names.”
- [x] “I want there to be tasks and missions given to me by the NPCs”
- [x] “that then require me to go around the map”
- [x] “use full sentences and grammar to complete the missions you have created.”
- [x] “In order for this to happen you must also create my own character who is able to walk around the map and interact with objects and people.”
- [x] “There must be very in-depth and complex dialogue and missions.”
- [ ] “I want you to work until you implement the missions you describe in the image.” — Exact image correspondence is unverified while the attachment is missing.

## A populated town

- [x] “I would suggest that you make a much bigger map, I'm talking like a whole town, with different sections to the town.”
- [x] “Like a night life area”
- [x] “a market”
- [x] “restaurants”
- [x] “post office”
- [x] “and many many more buildings that you can think of that should be added.”
- [x] “You should also give it loads and loads of objects and NPCs.”
- [x] “These NPCs should be animated and move around, either in place, or around town.”
- [x] “There can be streets that also have cars that drive around.”

## Every building and its interior

- [x] “To make the missions you made in the image a reality, I would recommend that each and EVERY building should be enterable”
- [x] “and once inside, there's a loading screen to load the indoors and all of its respective new objects and new NPCs.”
- [x] “In each building there must be some sort of gameplay.”
- [x] “I want the maps inside of each and every building to be complex and very big.”

## Supermarket

- [x] “For example, in a supermarket maybe I can work at the cash register”
- [x] “and you make some sort of game where I check customers out with their groceries”
- [x] “interact with them with very complex dialogue challenges that become more difficult as I become a higher level.”
- [x] “I should also be able to walk around the supermarket and check out ALL of the MANY MANY different items you put on the shelves.”
- [x] “I should also be able to play a minigame where I walk around inside the store from the customer's POV.”

## Café

- [x] “You should do the exact same thing with a cafe building, for example, where I can work behind the counter with a complex minigame”
- [x] “that requires me to have difficult language dialogue games”
- [x] “followed by me having to make a huge variety of drinks, like you would in a cafe”
- [x] “where I have to hover over the many many different ingredient options and steps to complete the drink orders that are coming in.”

## Sound and completion

- [x] “Lastly, to help with the atmosphere, I want you to add sound and ambiance to each and every unique environment”
- [x] “that also matches that respective environment.”
- [ ] “Do not stop until each and EVERY request laid about above is satisfied.”
- [x] “Make a list and make sure to check it off exactly, word-for-word, as I have laid it out before you.”

## Validation record

**38 of 42 exact-wording items are checked.** Three image-specific requirements and the literal overall completion requirement remain open because the referenced image was unavailable. All twelve existing mission chains and their maps are implemented. See the [native validation report](NATIVE_VALIDATION.md) and [player manual](NATIVE_GAME.md).

- **Native delivery:** the default [Windows ZIP](../downloads/Thing-Ling-Windows.zip) now contains the standalone `Thing Ling/Thing Ling.exe`, instructions, licenses and executable checksum. ZIP CRC, PE architecture, embedded PCK and hashes pass. The exact shipped pack ran from an empty directory outside the source checkout: **330 checks passed**, including all 29 live maps and the café/supermarket Controls. This is cross-export and resource/runtime validation on Linux; execution on a Windows OS remains unverified.
- **Engine and content:** the final `bash scripts/test-native.sh` run passed **8,370 integration checks**, **7,161 language checks**, **6,446 town checks**, **201 review checks**, and **26 collection eligibility checks**. Every mission chain completed in each of the four requested languages. The 5,030 authored placements retain supported details, populated original districts, clear doors/spawns, route connectivity and validated bounds. All 29 scenes render 5,801 labelled semantic instances and 75 resident placements without missing/oversized models or blocked spawns.
- **Physical gameplay and actual UI:** `bash scripts/test-native-ui.sh` passed **229 production Controls checks**, completing the first full NPC mission through door entry, physical collection, full-sentence dialogue, all three job requests, return travel and handover. It also completed real shelf shopping, quantity collection and checkout, toggled F first person, exercised unique noun search, finished saved reviews, and reloaded the complete save exactly. [Town](native-town.png), [first-person shopping](native-first-person.png) and [conversation](native-conversation.png) screenshots record the running game.
- **Jobs:** **9,972 rules checks and 364 full workflows** passed. The actual native Controls separately completed **30 shifts across all 28 venues**, with **256 checks**, in both headless and graphical runs. Café, cashier, customer shopping, quantities/change/budgets, seat reservations, cash denominations, ordered repairs/cooking, composition, written readings and elapsed-time rhythms are exercised. All 24 drinks and six foods are available through rotating menus. [Ingredient workbench](native-cafe.png) and [cashier receipt](native-checkout.png) show those Controls.
- **Audio and saves:** all 29 unique environmental streams and 11 effects are bundled. Duration, nonzero levels, headroom, live profile selection, wrapping/crossfade, volume and toggling were checked. Physical speaker listening remains unverified. Native disk saves, four independent languages, legacy migration and malformed nested-backup rejection pass; the final graphical save/reload assertion passes too.

## Complete user request, verbatim

```text
This does look good, there's no longer overlapping objects, and it seems every object has a label this time. However, you also removed tons of objects, and that's not what I wanted.

Firstly, you don't need to make this a browser game. Translate it all into a video game that launches locally on your PC, just like the original game example I have you.

Next, I wanted you to keep the old map, even make it bigger, and especially keep the HIGH level of detail with a bunch of objects scattered all over the map. I mean now the garden and the harbor buttons don't even do anything because you removed all the stuff. Please make the changes, spend a LOT of time putting it lots of effort making this game much more in depth and fixing these critiques. I want an environment that feels alive, with objects and characters having animations and los and lots of smaller details

Also in the "objects here" search, there's loads of repition, when each object should only be listed once. The second thing is you didn't even add new maps. Please look at the attached image. You need to add ALL of the maps, each map with loads of new objects, that are required to complete those missions. Also, there must be gameplay, not just clicking on/hovering over object names. I want there to be tasks and missions given to me by the NPCs that then require me to go around the map, use full sentences and grammar to complete the missions you have created. In order for this to happen you must also create my own character who is able to walk around the map and interact with objects and people. There must be very in-depth and complex dialogue and missions. I want you to work until you implement the missions you describe in the image.

I would suggest that you make a much bigger map, I'm talking like a whole town, with different sections to the town. Like a night life area, a market, restaurants, post office, and many many more buildings that you can think of that should be added. You should also give it loads and loads of objects and NPCs. These NPCs should be animated and move around, either in place, or around town. There can be streets that also have cars that drive around.

To make the missions you made in the image a reality, I would recommend that each and EVERY building should be enterable, and once inside, there's a loading screen to load the indoors and all of its respective new objects and new NPCs. In each building there must be some sort of gameplay. For example, in a supermarket maybe I can work at the cash register, and you make some sort of game where I check customers out with their groceries, interact with them with very complex dialogue challenges that become more difficult as I become a higher level. I should also be able to walk around the supermarket and check out ALL of the MANY MANY different items you put on the shelves. I want the maps inside of each and every building to be complex and very big. I should also be able to play a minigame where I walk around inside the store from the customer's POV. You should do the exact same thing with a cafe building, for example, where I can work behind the counter with a complex minigame that requires me to have difficult language dialogue games followed by me having to make a huge variety of drinks, like you would in a cafe, where I have to hover over the many many different ingredient options and steps to complete the drink orders that are coming in.

Lastly, to help with the atmosphere, I want you to add sound and ambiance to each and every unique environment, that also matches that respective environment.

Do not stop until each and EVERY request laid about above is satisfied. Make a list and make sure to check it off exactly, word-for-word, as I have laid it out before you.
```
