"""Publish the historical v1.1 browser packages using Python's standard library.

Run `npm run package:browser-windows` first. The native Windows ZIP is separate
and is never replaced by this script. End users do not need Python to play.
"""

from hashlib import sha256
from pathlib import Path
from shutil import copyfile
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT / "artifacts"
DOWNLOADS = ROOT / "downloads"
WINDOWS = ARTIFACTS / "Thing-Ling-Windows"
SOURCE_DIRS = ("src", "public", "tests", "docs", "windows", "scripts")
SOURCE_FILES = (
    ".gitattributes", ".gitignore", "README.md", "package.json", "package-lock.json",
    "index.html", "vite.config.js", "playwright.config.js",
    "downloads/README.md",
)
RELEASE_TIME = (2026, 10, 18, 0, 0, 0)


def source_files():
    files = [ROOT / name for name in SOURCE_FILES]
    for name in SOURCE_DIRS:
        files.extend(
            path for path in (ROOT / name).rglob("*")
            if path.is_file() and "__pycache__" not in path.parts
            and path.suffix != ".pyc"
        )
    return sorted(files)


def add_file(archive, path, name):
    info = ZipInfo(name, date_time=RELEASE_TIME)
    info.external_attr = 0o100644 << 16
    archive.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)


def add_source(archive):
    for path in source_files():
        add_file(archive, path, "source/" + path.relative_to(ROOT).as_posix())


def main():
    game = ROOT / "dist" / "index.html"
    required = [game, WINDOWS / "Play Thing Ling.cmd", WINDOWS / "Thing-Ling.html",
                WINDOWS / "START-HERE.txt", WINDOWS / "THIRD-PARTY-NOTICES.txt"]
    for path in required:
        if not path.is_file():
            raise SystemExit("Missing " + str(path) + "; run npm run package:browser-windows first.")
    if game.read_bytes() != (WINDOWS / "Thing-Ling.html").read_bytes():
        raise SystemExit("Windows HTML is stale; run npm run package:browser-windows first.")
    ARTIFACTS.mkdir(exist_ok=True)
    DOWNLOADS.mkdir(exist_ok=True)
    copyfile(game, ARTIFACTS / "Thing-Ling.html")
    instructions = (
        "THING LING - Historical browser edition 1.1\n\n"
        "Extract this archive and open Thing-Ling.html in a modern browser.\n"
        "Choose German, Japanese, Spanish, or Mandarin Chinese.\n"
        "Open Island atlas and visit Almanac Courtyard for Theo's first favor.\n"
        "Use Labels or Objects here; complete tasks, pass the check, and return to Theo.\n"
        "The separate Thing-Ling-Browser-Windows.zip has this browser game's launcher.\n"
        "Thing-Ling-Windows.zip is the newer native game, with Thing Ling.exe.\n"
        "If local HTML is restricted, run a local server or use that Windows package.\n\n"
        "Core gameplay embeds all assets and needs no account or internet connection.\n"
        "Progress lives in your browser. Use Settings to export/import backups.\n"
        "Audio uses installed device voices; written readings are always available.\n\n"
        "The source folder includes the editable browser project, tests, browser launcher,\n"
        "packaging scripts, research report, validation notes, and license notices.\n"
        "See source/README.md for development and release commands.\n"
    )
    (ARTIFACTS / "HOW-TO-PLAY.txt").write_text(instructions, encoding="utf-8")
    generic = ARTIFACTS / "Thing-Ling.zip"
    with ZipFile(generic, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        add_file(archive, game, "Thing-Ling.html")
        add_file(archive, ARTIFACTS / "HOW-TO-PLAY.txt", "HOW-TO-PLAY.txt")
        add_file(archive, ROOT / "docs/THIRD_PARTY_LICENSES.txt", "THIRD-PARTY-NOTICES.txt")
        add_source(archive)
    windows_archive = ARTIFACTS / "Thing-Ling-Browser-Windows.zip"
    with ZipFile(windows_archive, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(WINDOWS.iterdir()):
            if path.is_file():
                add_file(archive, path, path.name)
        add_source(archive)
    for path in (generic, windows_archive):
        with ZipFile(path) as archive:
            if archive.testzip() is not None:
                raise SystemExit("ZIP integrity check failed: " + str(path))
            if archive.read("Thing-Ling.html") != game.read_bytes():
                raise SystemExit("Packaged HTML does not match production: " + str(path))
            for name in ("scripts/package-windows.mjs", "scripts/package-release.py",
                         "windows/launcher.ps1", "windows/START-HERE.txt"):
                if "source/" + name not in archive.namelist():
                    raise SystemExit("Missing source file: " + name)
    # Preserve checksums for the independent native export and other published
    # artifacts. Recompute preserved entries from disk so stale hashes cannot be
    # carried forward when a native export was refreshed before this script.
    checksums = {}
    checksum_path = DOWNLOADS / "SHA256SUMS"
    if checksum_path.is_file():
        for line in checksum_path.read_text(encoding="ascii").splitlines():
            fields = line.split("  ", 1)
            if len(fields) != 2:
                continue
            name = fields[1]
            target = DOWNLOADS / name
            if Path(name).name == name and target.is_file():
                checksums[name] = sha256(target.read_bytes()).hexdigest()
    for path in (ARTIFACTS / "Thing-Ling.html", generic, windows_archive):
        target = DOWNLOADS / path.name
        copyfile(path, target)
        digest = sha256(target.read_bytes()).hexdigest()
        checksums[target.name] = digest
        print(target.name + ": " + str(target.stat().st_size) + " bytes; verified")
    checksum_path.write_text("".join(checksums[name] + "  " + name + "\n" for name in sorted(checksums)), encoding="ascii")


if __name__ == "__main__":
    main()
