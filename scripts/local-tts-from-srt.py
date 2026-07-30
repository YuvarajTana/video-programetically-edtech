#!/usr/bin/env python3

import argparse
import math
import re
from pathlib import Path

import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model


def timestamp_seconds(value: str) -> float:
    hours, minutes, rest = value.split(":")
    seconds, milliseconds = rest.split(",")

    return (
        int(hours) * 3600
        + int(minutes) * 60
        + int(seconds)
        + int(milliseconds) / 1000
    )


def read_srt(path: Path):
    contents = path.read_text(encoding="utf-8").strip()
    blocks = re.split(r"\n\s*\n", contents)

    cues = []

    for block in blocks:
        lines = block.splitlines()

        if len(lines) < 3 or " --> " not in lines[1]:
            continue

        start_text, end_text = lines[1].split(" --> ")
        text = " ".join(lines[2:]).strip()

        cues.append(
            {
                "start": timestamp_seconds(start_text),
                "end": timestamp_seconds(end_text),
                "text": text,
            }
        )

    return cues


def generate_audio(model, text, voice, speed, language):
    chunks = []
    sample_rate = 24000

    for result in model.generate(
        text=text,
        voice=voice,
        speed=speed,
        lang_code=language,
    ):
        chunk = np.asarray(result.audio, dtype=np.float32).reshape(-1)
        chunks.append(chunk)
        sample_rate = int(getattr(result, "sample_rate", sample_rate))

    if not chunks:
        raise RuntimeError(f"No speech generated for: {text}")

    return np.concatenate(chunks), sample_rate


def apply_fade(audio, sample_rate):
    fade_samples = min(int(sample_rate * 0.01), len(audio) // 2)

    if fade_samples <= 0:
        return audio

    audio[:fade_samples] *= np.linspace(0, 1, fade_samples)
    audio[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    return audio


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--srt", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--voice", default="am_adam")
    parser.add_argument("--speed", type=float, default=0.98)
    parser.add_argument("--model", default="mlx-community/Kokoro-82M-bf16")
    parser.add_argument("--language", default="a")
    args = parser.parse_args()

    srt_path = Path(args.srt)
    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    cues = read_srt(srt_path)

    if not cues:
        raise RuntimeError(f"No cues found in {srt_path}")

    print(f"Loading {args.model}...")
    model = load_model(args.model)

    sample_rate = 24000
    total_seconds = max(cue["end"] for cue in cues)
    master = np.zeros(math.ceil(total_seconds * sample_rate), dtype=np.float32)

    clips_directory = output_path.parent / "clips"
    clips_directory.mkdir(parents=True, exist_ok=True)

    for index, cue in enumerate(cues, start=1):
        available_seconds = cue["end"] - cue["start"]
        target_seconds = max(0.25, available_seconds - 0.18)
        speed = args.speed

        for attempt in range(4):
            audio, generated_rate = generate_audio(
                model,
                cue["text"],
                args.voice,
                speed,
                args.language,
            )

            if generated_rate != sample_rate:
                raise RuntimeError(
                    f"Expected {sample_rate} Hz, received {generated_rate} Hz"
                )

            duration = len(audio) / sample_rate

            if duration <= target_seconds:
                break

            speed *= (duration / target_seconds) * 1.02

        duration = len(audio) / sample_rate

        if duration > available_seconds:
            raise RuntimeError(
                f"Cue {index} is {duration:.2f}s but only "
                f"{available_seconds:.2f}s is available"
            )

        audio = apply_fade(audio, sample_rate)

        clip_path = clips_directory / f"{index:02d}.wav"
        sf.write(clip_path, audio, sample_rate)

        start_sample = round(cue["start"] * sample_rate)
        end_sample = start_sample + len(audio)

        master[start_sample:end_sample] += audio

        print(
            f"{index:02d}: {cue['start']:.1f}s "
            f"duration={duration:.2f}s speed={speed:.2f}"
        )

    peak = float(np.max(np.abs(master)))

    if peak > 0.98:
        master *= 0.98 / peak

    sf.write(output_path, master, sample_rate)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
