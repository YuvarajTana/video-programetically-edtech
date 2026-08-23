#!/usr/bin/env python3
"""Long-lived local IndicTrans2 and IndicF5 worker.

The Node server owns all paths and sends bounded JSON-line requests. Models are
loaded lazily and kept in memory between scenes.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any


MODEL_DIR = Path(os.environ.get("VIDEO_KIT_MODEL_DIR", ".video-kit/models")).resolve()
ENGLISH = "eng_Latn"
_translation_models: dict[str, tuple[Any, Any, Any, Any]] = {}
_indic_tts: Any | None = None
_english_tts: Any | None = None


def _device() -> tuple[str, Any]:
    import torch

    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps", torch.float32
    return "cpu", torch.float32


def _translation_model(direction: str):
    if direction in _translation_models:
        return _translation_models[direction]

    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    from IndicTransToolkit.processor import IndicProcessor

    repo = (
        "ai4bharat/indictrans2-en-indic-1B"
        if direction == "en-indic"
        else "ai4bharat/indictrans2-indic-en-1B"
    )
    device, dtype = _device()
    tokenizer = AutoTokenizer.from_pretrained(repo, cache_dir=MODEL_DIR, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        repo,
        cache_dir=MODEL_DIR,
        trust_remote_code=True,
        torch_dtype=dtype,
    ).to(device)
    processor = IndicProcessor(inference=True)
    _translation_models[direction] = (tokenizer, model, processor, device)
    return _translation_models[direction]


def _translate_once(texts: list[str], source: str, target: str) -> list[str]:
    if source == target:
        return texts
    direction = "en-indic" if source == ENGLISH else "indic-en"
    if source != ENGLISH and target != ENGLISH:
        raise ValueError("Indic-to-Indic translation must be explicitly pivoted.")
    tokenizer, model, processor, device = _translation_model(direction)
    batch = processor.preprocess_batch(texts, src_lang=source, tgt_lang=target)
    encoded = tokenizer(
        batch,
        truncation=True,
        padding="longest",
        return_tensors="pt",
        max_length=512,
    ).to(device)
    generated = model.generate(
        **encoded,
        use_cache=True,
        min_length=0,
        max_length=512,
        num_beams=5,
        num_return_sequences=1,
    )
    decoded = tokenizer.batch_decode(
        generated,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True,
    )
    return processor.postprocess_batch(decoded, lang=target)


def translate(message: dict[str, Any]) -> dict[str, Any]:
    texts = [str(value) for value in message["texts"]]
    source = str(message["source"])
    target = str(message["target"])
    if source != ENGLISH and target != ENGLISH:
        pivots = _translate_once(texts, source, ENGLISH)
        translated = _translate_once(pivots, ENGLISH, target)
        return {"translations": translated, "pivots": pivots}
    translated = _translate_once(texts, source, target)
    return {"translations": translated, "pivots": [None] * len(translated)}


def _indic_tts_model():
    global _indic_tts
    if _indic_tts is not None:
        return _indic_tts

    from f5_tts.api import F5TTS
    from huggingface_hub import snapshot_download

    root = Path(
        snapshot_download(
            repo_id="ai4bharat/IndicF5",
            cache_dir=MODEL_DIR,
        )
    )
    checkpoints = sorted(root.rglob("*.safetensors"))
    vocabs = sorted(root.rglob("vocab.txt"))
    if not checkpoints or not vocabs:
        raise RuntimeError("IndicF5 checkpoint or vocabulary was not found.")
    _indic_tts = F5TTS(
        model="F5TTS_v1_Base",
        ckpt_file=str(checkpoints[0]),
        vocab_file=str(vocabs[0]),
        device=_device()[0],
    )
    return _indic_tts


def _english_tts_model():
    global _english_tts
    if _english_tts is not None:
        return _english_tts

    from f5_tts.api import F5TTS

    _english_tts = F5TTS(
        model="F5TTS_v1_Base",
        device=_device()[0],
        hf_cache_dir=str(MODEL_DIR),
    )
    return _english_tts


def tts(message: dict[str, Any]) -> dict[str, Any]:
    reference = Path(str(message["referencePath"])).resolve()
    output = Path(str(message["outputPath"])).resolve()
    if not reference.is_file():
        raise ValueError("Reference sample does not exist.")
    output.parent.mkdir(parents=True, exist_ok=True)
    engine_name = str(message.get("engine", "indicf5"))
    if engine_name not in {"f5tts", "indicf5"}:
        raise ValueError("Unsupported local voice engine.")
    engine = _english_tts_model() if engine_name == "f5tts" else _indic_tts_model()
    engine.infer(
        ref_file=str(reference),
        ref_text=str(message["referenceTranscript"]),
        gen_text=str(message["text"]),
        file_wave=str(output),
        speed=float(message.get("speed", 1.0)),
    )
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError("IndicF5 did not create an audio file.")
    return {"outputPath": str(output)}


def handle(message: dict[str, Any]) -> dict[str, Any]:
    operation = message.get("op")
    if operation == "translate":
        return translate(message)
    if operation == "tts":
        return tts(message)
    if operation == "status":
        device, _ = _device()
        return {"device": device, "modelDir": str(MODEL_DIR)}
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
            result = handle(message)
            response = {"id": message.get("id"), "ok": True, "result": result}
        except Exception as error:  # worker must stay alive after one failed job
            response = {
                "id": message.get("id") if "message" in locals() else None,
                "ok": False,
                "error": str(error)[:4000],
            }
        sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
