# Original native audio

All 29 places have a distinct deterministic 24-second WAV bed. The loops are 22,050 Hz mono PCM16, with matching zero endpoints and a brief 20 ms cosine edge envelope. Playback uses a true `AudioStreamWAV.LOOP_FORWARD` loop. Files are synthesized from oscillators, filtered noise, and envelopes; there are no external recordings or copyrighted songs.

| Map ID | Environment key | Authored sound |
| --- | --- | --- |
| `town` | `town` | Air, birds, distant market movement and small bell tones. |
| `school` | `school` | Quiet room tone, paper movement, and a gentle three-note school bell. |
| `clinic` | `clinic` | Soft ventilation and restrained room tone. |
| `library` | `library` | Hushed air and occasional page turns. |
| `museum` | `museum` | Quiet gallery air and distant paper movement. |
| `nightlife` | `nightlife` | Original eight-bar Cmaj7–Am7–Dm7–G7 instrumental groove at 80 BPM. |
| `cinema` | `cinema` | Low projector whirr with occasional soft seat/paper movement. |
| `music-studio` | `music` | Original sparse keyboard-like instrumental notes. |
| `sports-center` | `sports` | Soft ball bounces and shoe/rubber-like scrapes. |
| `little-hello` | `courtyard` | Garden breeze and small birds. |
| `supermarket` | `supermarket` | Diffuse room murmur, checkout beeps, and movement. |
| `restaurant` | `restaurant` | Diffuse room murmur, plate/cutlery tones, and work movement. |
| `post-office` | `post` | Paper sorting, a small stamp sound, and room air. |
| `kettle-on` | `tea` | Cups, steam/pouring textures, and soft cafe room murmur. |
| `breakfast-club` | `bakery` | Warm oven air, work movement, and tray/cup tones. |
| `lantern-cafe` | `cafe` | Cup tones, espresso/steam textures, and room murmur. |
| `bank` | `bank` | Quiet office air and restrained paper movement. |
| `first-seedlings` | `garden` | Outdoor air and numerous short bird phrases. |
| `orchard-colors` | `orchard` | Leafy air and bird phrases with its own deterministic timing. |
| `small-neighbors` | `sanctuary` | Air, birds, and small animal-like calls. |
| `garden-in-bloom` | `conservatory` | Protected room air with distant birds. |
| `workshop` | `workshop` | Soft hammer tones, brushing/saw-like movement, and air. |
| `hotel` | `hotel` | Quiet room air and a small distant clock tick. |
| `tailor` | `tailor` | Soft fabric/paper movement and room tone. |
| `homecoming-parcel` | `cottage` | Quiet home air and a subtle clock. |
| `water-edge` | `cove` | Slow waves, sea air, and birds. |
| `lost-and-found` | `exchange` | Paper sorting and stamping with a separate noise/timing seed. |
| `station` | `station` | Passing-train air and a three-note station signal. |
| `harbor-lanterns` | `lighthouse` | Slow waves and a low distant bell/foghorn-like tone. |

Profiles with similar subject matter still have their own WAV file and seeded timing/noise. The manifest maps stable map IDs and semantic aliases to these files. Normalized RMS varies from 0.016 for quiet rooms to 0.065 for the nightclub; the game master starts at 30%.

Transitions use two voices with a 1.35-second crossfade, then stop the retired voice. Rapid travel never creates additional environment players. Eleven effects cover footsteps, interaction, collection, use, doors, success, failure, transitions, coins, dialogue, and UI clicks. A six-voice pool bounds effect playback; footsteps are throttled to 210 ms. Disabling audio stops both beds and effects immediately.

Regenerate all files with `python3 native/audio/generate_audio.py`. The generator reads `native/data/town.json` so map/audio coverage stays explicit. `profiles.json` records paths, kinds, duration, and RMS.

The native audio smoke test visited all 29 environments, checked the two-voice bound, checked retirement to one voice, sought a bed to 23.9 seconds and verified wraparound, checked sound disable/restore, volume, and bounded effect playback. Headless shutdown was clean after allowing the audio server to flush.
