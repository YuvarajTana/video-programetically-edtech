#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install it with: brew install uv"
  exit 1
fi

uv venv --python 3.11 .venv-local-voice
VIRTUAL_ENV="$PWD/.venv-local-voice" uv pip install \
  "setuptools<81" \
  "chatterbox-tts>=0.1,<1"

echo "Local Chatterbox voice environment is ready."
echo "Models download privately into .video-kit/models on first use."
