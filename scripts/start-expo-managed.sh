#!/bin/sh

set -u

FIFO_PATH="$(mktemp -u /tmp/agentpay-expo-stdin.XXXXXX)"
mkfifo "$FIFO_PATH"

KEEPALIVE_PID=""
EXPO_PID=""

cleanup() {
  trap - EXIT INT TERM
  if [ -n "$EXPO_PID" ]; then
    kill "$EXPO_PID" 2>/dev/null || true
  fi
  if [ -n "$KEEPALIVE_PID" ]; then
    kill "$KEEPALIVE_PID" 2>/dev/null || true
  fi
  wait "$EXPO_PID" 2>/dev/null || true
  wait "$KEEPALIVE_PID" 2>/dev/null || true
  rm -f "$FIFO_PATH"
}

trap cleanup EXIT INT TERM

tail -f /dev/null > "$FIFO_PATH" &
KEEPALIVE_PID=$!

script -q -c "EXPO_USE_METRO_WORKSPACE_ROOT=1 npx expo start --web --clear --port ${EXPO_PORT:-8081}" /dev/null < "$FIFO_PATH" &
EXPO_PID=$!

wait "$EXPO_PID"
EXIT_CODE=$?
cleanup
exit "$EXIT_CODE"
