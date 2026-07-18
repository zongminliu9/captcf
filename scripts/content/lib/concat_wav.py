#!/usr/bin/env python3
"""Concatenate mono 16-bit PCM WAV files with silence gaps; print duration (s).

Usage: concat_wav.py <output.wav> <silence_seconds> <in1.wav> [in2.wav ...]
"""
import sys
import wave


def main() -> int:
    out_path = sys.argv[1]
    silence_s = float(sys.argv[2])
    inputs = sys.argv[3:]
    if not inputs:
        print("0.0")
        return 0

    with wave.open(inputs[0], "rb") as first:
        params = first.getparams()

    total_frames = 0
    with wave.open(out_path, "wb") as out:
        out.setparams(params)
        silence = b"\x00" * (int(params.framerate * silence_s) * params.nchannels * params.sampwidth)
        for i, path in enumerate(inputs):
            with wave.open(path, "rb") as r:
                if (r.getframerate(), r.getnchannels(), r.getsampwidth()) != (
                    params.framerate,
                    params.nchannels,
                    params.sampwidth,
                ):
                    # resample-free guard: skip mismatched clip rather than corrupt output
                    continue
                data = r.readframes(r.getnframes())
                total_frames += r.getnframes()
                out.writeframes(data)
            if i != len(inputs) - 1:
                out.writeframes(silence)
                total_frames += int(params.framerate * silence_s)

    print(round(total_frames / params.framerate, 3))
    return 0


if __name__ == "__main__":
    sys.exit(main())
