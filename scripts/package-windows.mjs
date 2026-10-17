import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts', 'Thing-Ling-Windows');
const script = await readFile(path.join(root, 'windows', 'launcher.ps1'), 'utf8');
// Ship a plain, readable inline PowerShell command in a normal Windows CMD file.
// No PS1 execution-policy override, runtime file evaluation, or encoded command.
const command = script.split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))
  .join(' ');
if (/["%\r\n]/.test(command)) throw new Error('Launcher contains a CMD-unsafe character.');
const commandLine = `powershell.exe -NoLogo -NoProfile -Command "${command}"`;
if (commandLine.length > 7600) throw new Error('Launcher exceeds the Windows CMD length budget.');
const launcher = [
  '@echo off',
  'setlocal DisableDelayedExpansion',
  'title Thing Ling - keep this window open',
  'set "THING_LING_ROOT=%~dp0"',
  'echo Starting Thing Ling...',
  commandLine,
  'set "THING_LING_EXIT=%errorlevel%"',
  'if "%THING_LING_EXIT%"=="0" exit /b 0',
  'echo.',
  'echo The launcher could not start. You can also open Thing-Ling.html directly.',
  'pause',
  'exit /b %THING_LING_EXIT%',
  '',
].join('\r\n');
await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(path.join(output, 'Play Thing Ling.cmd'), launcher, 'ascii'),
  readFile(path.join(root, 'dist', 'index.html')).then(bytes => writeFile(path.join(output, 'Thing-Ling.html'), bytes)),
  readFile(path.join(root, 'windows', 'START-HERE.txt'), 'utf8').then(text => writeFile(path.join(output, 'START-HERE.txt'), text.replace(/\r?\n/g, '\r\n'), 'utf8')),
  readFile(path.join(root, 'docs', 'THIRD_PARTY_LICENSES.txt')).then(bytes => writeFile(path.join(output, 'THIRD-PARTY-NOTICES.txt'), bytes)),
]);
console.log(`Windows launch folder prepared (${commandLine.length}-character command): ${output}`);
