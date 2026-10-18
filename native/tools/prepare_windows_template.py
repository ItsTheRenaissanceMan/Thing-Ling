#!/usr/bin/env python3
"""Fetch and verify the official Godot 4.6.3 Windows release export template.

Keeps the inherited HTTPS proxy and system CA trust. No global installation required.
The complete official TPZ is checked before any executable is extracted.
"""
import argparse
import hashlib
import pathlib
import os
import subprocess
import zipfile

VERSION = '4.6.3-stable'
ARCHIVE_SHA256 = '3fbe2c0e2dec9d537ab9ec97bcf8da91dcf23357fc51f67092dd068d839290a8'
URL = f'https://github.com/godotengine/godot-builds/releases/download/{VERSION}/Godot_v{VERSION}_export_templates.tpz'
def cache_root():
    override = os.environ.get('THING_LING_CACHE')
    if override:
        return pathlib.Path(override)
    if os.name == 'nt':
        base = pathlib.Path(os.environ.get('LOCALAPPDATA', pathlib.Path.home() / 'AppData' / 'Local'))
    else:
        base = pathlib.Path(os.environ.get('XDG_CACHE_HOME', pathlib.Path.home() / '.cache'))
    return base / 'thing-ling'


DEFAULT_CACHE = cache_root() / 'godot'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=pathlib.Path, default=DEFAULT_CACHE)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    archive = args.cache / f'Godot_v{VERSION}_export_templates.tpz'
    if not archive.exists():
        partial = archive.with_suffix('.download')
        subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', '--retry', '2', URL, '-o', str(partial)], check=True)
        partial.replace(archive)
    with archive.open('rb') as stream:
        actual = hashlib.file_digest(stream, 'sha256').hexdigest()
    if actual != ARCHIVE_SHA256:
        raise SystemExit(f'Official archive verification failed: {actual}; expected {ARCHIVE_SHA256}. The archive was not used.')
    destination = args.cache / 'templates'
    destination.mkdir(exist_ok=True)
    names = ['templates/windows_release_x86_64.exe', 'templates/windows_release_x86_64_console.exe', 'templates/version.txt']
    with zipfile.ZipFile(archive) as bundle:
        for name in names:
            target = destination / pathlib.Path(name).name
            target.write_bytes(bundle.read(name))
            print(target)
    print(f'Verified official archive SHA-256: {actual}')


if __name__ == '__main__':
    main()
