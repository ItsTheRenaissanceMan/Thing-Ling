Thing Ling — Native Windows Edition
==================================

A standalone 3D language adventure for Windows 10/11, 64-bit.

PLAY
----
1. Extract the ZIP to a normal folder.
2. Double-click Thing Ling.exe.
3. Choose German, Japanese, Spanish, or Mandarin Chinese.

The game runs directly on your PC. It includes its maps, vocabulary, font,
models, and original environmental audio. No browser, web server, Node.js,
Python, PowerShell, account, subscription, or administrator access is needed.
An internet connection is not needed to play. The executable is unsigned.

CONTROLS
--------
WASD / arrow keys: walk
Shift: sprint
E: interact with a nearby object, neighbor, or doorway
Right mouse button + drag: orbit the camera
Mouse wheel: zoom
F: toggle first-person view for close-up exploring and shopping
M: town overview
Home: restore the follow camera
J: journal    I: inventory    Tab: town guide    L: toggle nearby labels
Esc: pause    F5: save    F11: fullscreen
Use the on-screen menus for the journal, inventory, town guide, and settings.
Selecting a noun does not teleport your character; walk over and interact.

IN THE TOWN
-----------
Explore a large town and 28 separate, enterable interiors. The original
garden, orchard and harbor are present alongside the supermarket, cafes,
restaurant, post office, nightclub, school, clinic, workshop and other venues.
All 239 vocabulary types have German, Japanese, Spanish and Chinese entries.
Speak with residents for 12 connected missions with 100 ordered objectives.
Collect and carry items, use objects, complete jobs, and return to the
residents to practice full sentences and grammar. Review discovered words
through matching, listening or typing; each language keeps its own progress.

Work cafe shifts with 24 drink recipes and six food recipes, checking the
order, ingredients, quantities and preparation sequence. At the supermarket,
scan customer groceries and handle payments, or follow your own shopping
list through the aisles and check out what you actually collected. Every
interior offers an activity, with more demanding dialogue at higher levels.

AUDIO
-----
Every venue has its own 24-second environmental loop. The town has air and
birds; the waterfront has waves; cafes have cups, steam and pouring; the
bakery has oven air and work sounds; the post office has paper and stamping;
the workshop has soft hammering; the station has a passing-train texture;
the nightclub has an original instrumental groove. Quiet venues remain quiet.
The music studio, cinema, sports center, clinic, library, hotel, bank, museum,
tailor, gardens, orchard, sanctuary and conservatory have their own profiles.
Settings include a sound switch and volume control. Default volume is 30%.

Audio is generated from original oscillators, filters and seeded noise.
There are no externally sampled recordings, copyrighted songs or spoken
pseudo-language. Environmental sounds are atmosphere, not pronunciation.

SAVES
-----
Progress saves locally for each language. Godot normally stores Windows saves
under %APPDATA%\Godot\app_userdata\Thing Ling — A Town of Words\.
Keep your save folder when replacing the game with a newer release.
Use Settings to export a backup or import a previous Thing Ling save.

GRAPHICS
--------
The native game uses Godot's OpenGL compatibility renderer. A graphics driver
supporting OpenGL 3.3 is required. Update your graphics driver if the window
cannot initialize. Japanese and Chinese fonts are included and work offline. Pronunciation
uses a compatible voice installed in Windows when one is available; the
written word, reading and gameplay remain available without a speech voice.

SOURCE AND REBUILD
------------------
The native Godot project is the native/ directory in the source repository.
Use Godot 4.6.3. The browser edition remains a separate earlier edition.

In the repository, with Python 3.11+ and Godot 4.6.3 installed:

  python3 native/tools/prepare_windows_template.py
  python3 native/audio/generate_audio.py
  python3 native/tools/package_windows.py

The template preparer downloads the official export-template archive and
checks its published SHA-256 before extracting the Windows release template.
Downloads use the standard user cache: %LOCALAPPDATA%\thing-ling on
Windows, or $XDG_CACHE_HOME/thing-ling (normally ~/.cache/thing-ling) on Linux.
Set THING_LING_CACHE to choose a shared cache root, or pass --cache PATH to
the template preparer and then --template PATH to the packager. Godot is
found on PATH; --godot PATH or GODOT_BIN selects another executable.
The packager also accepts --output PATH. Its default output is
downloads/Thing-Ling-Windows.zip. Use python or py -3 instead of python3
if that is how Python is installed on your Windows development PC.

The export embeds its PCK in the executable. The ZIP includes SHA256SUMS.txt
for the executable and license notices. The build command also emits a JSON
manifest containing the archive and executable checksums.

LICENSE NOTICES
---------------
Godot Engine: MIT license, included in Licenses/Godot-LICENSE.txt.
Noto Sans CJK: SIL Open Font License 1.1, included in
Licenses/NotoSansCJKsc-LICENSE.txt. The font is unmodified.
The game models and procedural environmental audio were authored for Thing Ling.
