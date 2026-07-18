#!/usr/bin/env python3
"""Concatenate mono 16-bit PCM WAVs with silence gaps, peak-normalize, and print QA metrics JSON.

Usage: concat_wav.py <output.wav> <silence_seconds> <in1.wav> [in2.wav ...]
Prints one JSON line: {duration, rms, peak, leadingSilence, trailingSilence, maxGap, gain}.
"""
import array
import json
import sys
import wave

TARGET_PEAK = 0.89  # of full scale
SILENCE = 0.018     # abs amplitude (0..1) below which a sample counts as silence


def main() -> int:
    out_path = sys.argv[1]
    silence_s = float(sys.argv[2])
    inputs = sys.argv[3:]
    if not inputs:
        print(json.dumps({"duration": 0.0}))
        return 0

    with wave.open(inputs[0], "rb") as first:
        params = first.getparams()
    rate, nch, sw = params.framerate, params.nchannels, params.sampwidth

    samples = array.array("h")  # signed 16-bit
    gap = array.array("h", [0] * int(rate * silence_s) * nch)
    for i, path in enumerate(inputs):
        with wave.open(path, "rb") as r:
            if (r.getframerate(), r.getnchannels(), r.getsampwidth()) != (rate, nch, sw):
                continue
            buf = array.array("h")
            buf.frombytes(r.readframes(r.getnframes()))
            samples.extend(buf)
        if i != len(inputs) - 1:
            samples.extend(gap)

    n = len(samples)
    if n == 0:
        print(json.dumps({"duration": 0.0}))
        return 0

    peak = max((abs(s) for s in samples), default=0) / 32768.0
    gain = 1.0
    if 0 < peak < TARGET_PEAK:
        gain = min(TARGET_PEAK / peak, 6.0)  # boost quiet audio, cap at 6x
        for i in range(n):
            v = int(samples[i] * gain)
            samples[i] = 32767 if v > 32767 else -32768 if v < -32768 else v

    # metrics on the (normalized) signal
    sq = 0
    for s in samples:
        sq += (s / 32768.0) ** 2
    rms = (sq / n) ** 0.5
    thr = SILENCE
    per_frame = nch
    frames = n // per_frame
    # per-frame silence flags
    def amp(fi):
        return abs(samples[fi * per_frame]) / 32768.0

    lead = 0
    while lead < frames and amp(lead) < thr:
        lead += 1
    trail = 0
    while trail < frames and amp(frames - 1 - trail) < thr:
        trail += 1
    # longest internal silent run
    max_gap = cur = 0
    for fi in range(lead, frames - trail):
        if amp(fi) < thr:
            cur += 1
            max_gap = max(max_gap, cur)
        else:
            cur = 0

    with wave.open(out_path, "wb") as out:
        out.setparams(params)
        out.writeframes(samples.tobytes())

    print(json.dumps({
        "duration": round(frames / rate, 3),
        "rms": round(rms, 4),
        "peak": round(max((abs(s) for s in samples), default=0) / 32768.0, 4),
        "leadingSilence": round(lead / rate, 3),
        "trailingSilence": round(trail / rate, 3),
        "maxGap": round(max_gap / rate, 3),
        "gain": round(gain, 3),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
