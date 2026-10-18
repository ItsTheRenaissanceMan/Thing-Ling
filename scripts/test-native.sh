#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
native_test_root="${THING_LING_TEST_ROOT:-/tmp/thing-ling-native-tests}"
mkdir -p "$native_test_root/data" "$native_test_root/config" "$native_test_root/cache"
export XDG_DATA_HOME="$native_test_root/data"
export XDG_CONFIG_HOME="$native_test_root/config"
export XDG_CACHE_HOME="$native_test_root/cache"
export THING_LING_TEST_REPORT="$native_test_root/integration.json"
native_godot="${GODOT_BIN:-godot}"
python3 "$repo_root/scripts/test-native-data.py"
"$native_godot" --headless --path "$repo_root/native" --editor --import --quit 2>&1 | tee "$native_test_root/import.log"
if rg -q 'SCRIPT ERROR|Parse Error' "$native_test_root/import.log"; then
  exit 1
fi
"$native_godot" --headless --path "$repo_root/native" --script res://tests/integration_test.gd 2>&1 | tee "$native_test_root/engine.log"
if rg -q 'SCRIPT ERROR|Parse Error|NATIVE TEST:' "$native_test_root/engine.log"; then
  exit 1
fi
for native_suite in language_test town_data_test review_test interaction_rules_test activity_test activity_ui_test; do
  if [[ -f "$repo_root/native/tests/$native_suite.gd" ]]; then
    "$native_godot" --headless --path "$repo_root/native" --script "res://tests/$native_suite.gd" 2>&1 | tee "$native_test_root/$native_suite.log"
    if rg -q 'SCRIPT ERROR|Parse Error|NATIVE TEST:' "$native_test_root/$native_suite.log"; then
      exit 1
    fi
  fi
done
