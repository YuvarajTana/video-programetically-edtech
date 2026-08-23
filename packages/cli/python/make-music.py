#!/usr/bin/env python3
"""Synthesize copyright-free music beds. Zero licensing by construction.

    npm run music -- <preset> <seconds> [out.wav]
    npm run music -- calm-plucks 60 public/audio/music/calm-plucks.wav

Every bed: 44.1 kHz stereo WAV, RMS-normalized to -22 dBFS with 1.2 s fades,
so it sits under narration without ducking surprises. Declare the output in a
spec's soundtrack with credit "AI Data Dynamics" and license "original".

Requires numpy only. Output WAVs are generated on demand and gitignored.
"""
import struct
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100

# name -> (bpm, root_midi, chord degrees per bar, voice, percussion)
PRESETS = {
    # calm mallets for explainer beds
    "calm-plucks": (84, 50, [[0, 7, 12, 16], [5, 12, 17, 21], [3, 10, 15, 19], [7, 14, 19, 23]], "pluck", None),
    # steady mechanical pulse for systems/inference topics
    "steady-pulse": (112, 45, [[0, 7, 12], [0, 7, 12], [5, 12, 17], [7, 14, 19]], "pluck", "kick"),
    # airy and spacious, embeddings/concept topics
    "spacious": (72, 53, [[0, 7, 16], [9, 16, 21], [5, 12, 19], [7, 12, 16]], "mallet", None),
    # bright and friendly for the learn channel
    "learn-bright": (96, 57, [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12]], "mallet", "brush"),
    # bouncy and energetic for the fun channel
    "fun-bounce": (118, 48, [[0, 7, 12, 16], [8, 15, 20, 24], [10, 17, 22, 26], [7, 14, 19, 23]], "pluck", "kick"),
    # low and slightly tense, problem/warning sections
    "undertow": (88, 41, [[0, 7, 12, 15], [1, 8, 13, 16], [0, 7, 12, 15], [5, 12, 15, 20]], "mallet", None),
}


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def voice_note(freq, dur, kind, rng):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if kind == "pluck":
        # damped harmonic stack with a fast attack — guitar-ish pluck
        env = np.exp(-t * 3.2) * np.minimum(t * 200, 1.0)
        wave_ = (
            np.sin(2 * np.pi * freq * t)
            + 0.4 * np.sin(2 * np.pi * 2 * freq * t)
            + 0.15 * np.sin(2 * np.pi * 3 * freq * t + rng.uniform(0, 1))
        )
    else:  # mallet
        env = np.exp(-t * 2.2) * np.minimum(t * 60, 1.0)
        wave_ = np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(2 * np.pi * 4 * freq * t)
    return wave_ * env * 0.32


def percussion_hit(kind, rng):
    if kind == "kick":
        n = int(0.16 * SR)
        t = np.arange(n) / SR
        sweep = 95 * np.exp(-t * 26) + 42
        return np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.exp(-t * 22) * 0.5
    # brush: a soft noise tick
    n = int(0.05 * SR)
    return rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 90) * 0.12


def render(preset, seconds):
    bpm, root, bars, voice, perc = PRESETS[preset]
    rng = np.random.default_rng(hash(preset) % (2**32))
    beat = 60.0 / bpm
    total = int(seconds * SR)
    left = np.zeros(total)
    right = np.zeros(total)

    beats_per_bar = 4
    bar = 0
    t = 0.0
    while t < seconds:
        chord = [root + degree for degree in bars[bar % len(bars)]]
        for b in range(beats_per_bar):
            when = t + b * beat
            if when >= seconds:
                break
            # arpeggiate: one chord tone per beat, octave shimmer on beat 3
            note = chord[b % len(chord)] + (12 if b == 2 and bar % 2 else 0)
            tone = voice_note(midi_hz(note), beat * 2.2, voice, rng)
            start = int(when * SR)
            end = min(start + len(tone), total)
            pan = 0.35 + 0.3 * ((b % 2) * 2 - 1) * 0.5  # gentle alternation
            left[start:end] += tone[: end - start] * (1 - pan)
            right[start:end] += tone[: end - start] * pan
            if perc and b in (0, 2):
                hit = percussion_hit(perc, rng)
                hend = min(start + len(hit), total)
                left[start:hend] += hit[: hend - start] * 0.7
                right[start:hend] += hit[: hend - start] * 0.7
        t += beat * beats_per_bar
        bar += 1

    mix = np.stack([left, right])
    # 1.2 s fades
    fade = int(1.2 * SR)
    ramp = np.linspace(0, 1, fade)
    mix[:, :fade] *= ramp
    mix[:, -fade:] *= ramp[::-1]
    # normalize to -22 dBFS RMS, then true-peak guard
    target = 10 ** (-22 / 20)
    rms = np.sqrt(np.mean(mix**2))
    if rms > 0:
        mix *= target / rms
    peak = np.max(np.abs(mix))
    if peak > 0.9:
        mix *= 0.9 / peak
    return mix


def write_wav(path, mix):
    data = (np.clip(mix, -1, 1) * 32767).astype("<i2")
    interleaved = data.T.reshape(-1)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(struct.pack(f"<{len(interleaved)}h", *interleaved))


def main():
    args = sys.argv[1:]
    if len(args) < 2 or args[0] not in PRESETS:
        names = " · ".join(PRESETS)
        print(f"usage: npm run music -- <preset> <seconds> [out.wav]\npresets: {names}")
        raise SystemExit(1)
    preset = args[0]
    seconds = float(args[1])
    out = args[2] if len(args) > 2 else f"public/audio/music/{preset}.wav"
    write_wav(out, render(preset, seconds))
    print(f"wrote {out} ({seconds:.0f}s, -22 dBFS RMS, license: original)")


if __name__ == "__main__":
    main()
