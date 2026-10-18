#!/usr/bin/env python3
"""Build a standalone Windows x86-64 game; run only after a source freeze.

Requires Godot 4.6.3 and an officially verified Windows release template.
The exported EXE embeds its PCK, including models, vocabulary, font and audio.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import struct
import subprocess
import zipfile

PROJECT = pathlib.Path(__file__).resolve().parents[1]
REPOSITORY = PROJECT.parent
RUNTIME_CACHE = PROJECT / '.godot' / 'build-runtime'
TEMPLATE_SHA256 = '91724f15024a3a545e28ccd83134403d31ce2323a38e51c95e4dfa282f732ab6'


def cache_root():
    override = os.environ.get('THING_LING_CACHE')
    if override:
        return pathlib.Path(override)
    if os.name == 'nt':
        base = pathlib.Path(os.environ.get('LOCALAPPDATA', pathlib.Path.home() / 'AppData' / 'Local'))
    else:
        base = pathlib.Path(os.environ.get('XDG_CACHE_HOME', pathlib.Path.home() / '.cache'))
    return base / 'thing-ling'


DEFAULT_TEMPLATE = cache_root() / 'godot' / 'templates' / 'windows_release_x86_64.exe'


def build_environment():
    environment = os.environ.copy()
    if os.name != 'nt':
        for name, directory in [('XDG_DATA_HOME', RUNTIME_CACHE/'data'), ('XDG_CACHE_HOME', RUNTIME_CACHE/'cache'), ('XDG_CONFIG_HOME', RUNTIME_CACHE/'config')]:
            directory.mkdir(parents=True, exist_ok=True)
            environment.setdefault(name, str(directory))
    return environment


def run(*command):
    print('+', ' '.join(map(str, command)), flush=True)
    subprocess.run(list(map(str, command)), cwd=PROJECT, env=build_environment(), check=True)


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--godot', default=os.environ.get('GODOT_BIN', shutil.which('godot') or 'godot'))
    parser.add_argument('--template', type=pathlib.Path, default=pathlib.Path(os.environ.get('GODOT_WINDOWS_TEMPLATE', str(DEFAULT_TEMPLATE))))
    parser.add_argument('--output', type=pathlib.Path, default=REPOSITORY / 'downloads' / 'Thing-Ling-Windows.zip')
    parser.add_argument('--skip-import', action='store_true', help='Reuse a verified current .godot import cache.')
    args = parser.parse_args()
    version = subprocess.check_output([args.godot, '--version'], text=True, env=build_environment()).strip()
    if not version.startswith('4.6.3.'):
        raise SystemExit(f'This project pins Godot 4.6.3, but found {version}.')
    if not args.template.is_file():
        raise SystemExit('Windows export template missing. Run native/tools/prepare_windows_template.py, or pass --template PATH.')
    with args.template.open('rb') as stream:
        if stream.read(2) != b'MZ':
            raise SystemExit('The Windows export template is not a PE executable.')
    if sha256(args.template) != TEMPLATE_SHA256:
        raise SystemExit('Windows template checksum mismatch. Re-run prepare_windows_template.py and use its verified 4.6.3 template.')
    build = PROJECT / 'build' / 'windows'
    build.mkdir(parents=True, exist_ok=True)
    executable = build / 'Thing Ling.exe'
    presets = PROJECT / 'export_presets.cfg'
    original = presets.read_text()
    template_value = json.dumps(args.template.resolve().as_posix())
    custom = re.sub(r'custom_template/release="[^"]*"', lambda _: 'custom_template/release=' + template_value, original)
    try:
        presets.write_text(custom)
        if not args.skip_import:
            run(args.godot, '--headless', '--path', PROJECT, '--editor', '--import')
        run(args.godot, '--headless', '--path', PROJECT, '--export-release', 'Windows Desktop', executable)
    finally:
        presets.write_text(original)
    if not executable.is_file() or executable.stat().st_size < args.template.stat().st_size:
        raise SystemExit('Export did not produce a complete standalone executable.')
    with executable.open('rb') as stream:
        stream.seek(0x3c)
        pe_offset = struct.unpack('<I', stream.read(4))[0]
        stream.seek(pe_offset)
        if stream.read(6) != b'PE\0\0d\x86':
            raise SystemExit('Exported executable is not a Windows x86-64 PE image.')
        stream.seek(-12, 2)
        pack_bytes, magic = struct.unpack('<Q4s', stream.read(12))
        if magic != b'GDPC' or not 0 < pack_bytes < executable.stat().st_size - 12:
            raise SystemExit('Exported executable is missing its embedded Godot PCK footer.')
        stream.seek(executable.stat().st_size - 12 - pack_bytes)
        if stream.read(4) != b'GDPC':
            raise SystemExit('Embedded Godot PCK header is invalid.')
    checksum = sha256(executable)
    readme = PROJECT / 'README-WINDOWS.md'
    licenses = [PROJECT / 'assets' / 'NotoSansCJKsc-LICENSE.txt', PROJECT / 'assets' / 'Godot-LICENSE.txt']
    for required in [readme, *licenses]:
        if not required.is_file():
            raise SystemExit(f'Required release notice is missing: {required}')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    partial_archive = args.output.with_suffix('.zip.tmp')
    with zipfile.ZipFile(partial_archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.write(executable, 'Thing Ling/Thing Ling.exe')
        archive.write(readme, 'Thing Ling/README.txt')
        for license_file in licenses:
            archive.write(license_file, f'Thing Ling/Licenses/{license_file.name}')
        archive.writestr('Thing Ling/SHA256SUMS.txt', f'{checksum}  Thing Ling.exe\n')
    with zipfile.ZipFile(partial_archive) as archive:
        damaged = archive.testzip()
        if damaged:
            raise SystemExit(f'ZIP integrity verification failed: {damaged}')
    partial_archive.replace(args.output)
    manifest = {'version':'2.0.0','engine':version,'platform':'Windows x86-64','standalone':True,'embeddedPck':True,'executableBytes':executable.stat().st_size,'executableSha256':checksum,'archiveBytes':args.output.stat().st_size,'archiveSha256':sha256(args.output)}
    args.output.with_suffix('.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps(manifest, indent=2))
    print(args.output)


if __name__ == '__main__':
    main()
