#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install it with: brew install uv"
  exit 1
fi

uv venv --python 3.11 .venv-indic
VIRTUAL_ENV="$PWD/.venv-indic" uv pip install -r scripts/requirements-indic-ai.txt

echo "Local Indic AI environment is ready."
echo "Models download privately into .video-kit/models on first use."
