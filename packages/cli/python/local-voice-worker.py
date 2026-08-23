#!/usr/bin/env python3
"""Persistent, private Chatterbox worker for the owner's English voice."""

from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from pathlib import Path
from typing import Any


MODEL_DIR = Path(os.environ.get("VIDEO_KIT_MODEL_DIR", ".video-kit/models")).resolve()
_model: Any | None = None


def _device() -> str:
    import torch

    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _tts_model():
    global _model
    if _model is not None:
        return _model

    from chatterbox.tts import ChatterboxTTS

    _model = ChatterboxTTS.from_pretrained(device=_device())
    return _model


def synthesize(message: dict[str, Any]) -> dict[str, Any]:
    import torchaudio as ta

    reference = Path(str(message["referencePath"])).resolve()
    output = Path(str(message["outputPath"])).resolve()
    if not reference.is_file():
        raise ValueError("My Voice reference sample does not exist.")
    text = str(message["text"]).strip()
    if not text:
        raise ValueError("Narration text is empty.")
    output.parent.mkdir(parents=True, exist_ok=True)
    model = _tts_model()
    wav = model.generate(
        text,
        audio_prompt_path=str(reference),
        exaggeration=float(message.get("exaggeration", 0.45)),
        cfg_weight=float(message.get("cfgWeight", 0.35)),
    )
    ta.save(str(output), wav, model.sr)
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError("Chatterbox did not create an audio file.")
    return {"outputPath": str(output), "device": _device()}


def handle(message: dict[str, Any]) -> dict[str, Any]:
    operation = message.get("op")
    if operation == "tts":
        return synthesize(message)
    if operation == "status":
        return {"device": _device(), "modelDir": str(MODEL_DIR)}
    raise ValueError(f"Unknown operation: {operation}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stdio", action="store_true")
    args = parser.parse_args()
    if not args.stdio:
        parser.error("--stdio is required")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for line in sys.stdin:
        try:
            message = json.loads(line)
            response = {
                "id": message.get("id"),
                "ok": True,
                "result": handle(message),
            }
        except Exception as error:
            response = {
                "id": message.get("id") if "message" in locals() else None,
                "ok": False,
                "error": f"{error}\n{traceback.format_exc()}"[:4000],
            }
        sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
