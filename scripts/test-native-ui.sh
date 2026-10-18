#!/usr/bin/env bash
# Linux cloud rendering checks. Player saves are kept separate from test data.
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
native_ui_root="${THING_LING_UI_TEST_ROOT:-/tmp/thing-ling-native-ui}"
mkdir -p "$native_ui_root/data" "$native_ui_root/config" "$native_ui_root/cache"
export XDG_DATA_HOME="$native_ui_root/data"
export XDG_CONFIG_HOME="$native_ui_root/config"
export XDG_CACHE_HOME="$native_ui_root/cache"
export LIBGL_ALWAYS_SOFTWARE="${LIBGL_ALWAYS_SOFTWARE:-1}"
native_godot="${GODOT_BIN:-godot}"
if [[ -z "${DISPLAY:-}" ]]; then
  export DISPLAY=:88
  if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    Xorg "$DISPLAY" -config "$repo_root/native/tools/cloud-xorg.conf" -noreset -nolisten tcp -logfile "$native_ui_root/xorg.log" >"$native_ui_root/xorg-start.log" 2>&1 &
    native_xorg_pid=$!
    trap 'kill "$native_xorg_pid" 2>/dev/null || true' EXIT
    for native_attempt in {1..25}; do
      if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then break; fi
      sleep 0.2
    done
  fi
fi
xdpyinfo -display "$DISPLAY" >/dev/null
"$native_godot" --audio-driver Dummy --path "$repo_root/native" --script res://tests/ui_playtest.gd 2>&1 | tee "$native_ui_root/game-ui.log"
if rg -q 'SCRIPT ERROR|Parse Error|UI TEST:|NATIVE_UI_SAVE_DIFF' "$native_ui_root/game-ui.log"; then exit 1; fi
"$native_godot" --audio-driver Dummy --path "$repo_root/native" --script res://tests/activity_ui_test.gd 2>&1 | tee "$native_ui_root/activity-ui.log"
if rg -q 'SCRIPT ERROR|Parse Error|ACTIVITY UI TEST FAILED' "$native_ui_root/activity-ui.log"; then exit 1; fi
