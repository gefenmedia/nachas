"""Local, free transcription with word-level timestamps.

Uses sherpa-onnx + NVIDIA Parakeet TDT 0.6b v2 (int8), downloaded from the
sherpa-onnx GitHub releases. Output matches Remotion's `Caption` type
(@remotion/captions): {text, startMs, endMs, timestampMs, confidence}.

Usage:
  python3 scripts/transcribe.py <wav16k> <modelDir> <out captions.json>

The WAV must be 16 kHz mono (see README for the ffmpeg command).
Audio is split at natural pauses (~20 s chunks) so words are never cut.
"""
import json
import re
import subprocess
import sys

import numpy as np
import sherpa_onnx
import soundfile as sf

wav_path, model_dir, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
SR = 16000

audio, sr = sf.read(wav_path, dtype="float32")
assert sr == SR, "expected 16 kHz WAV"
total = len(audio) / SR

# --- find pauses with ffmpeg silencedetect -------------------------------
log = subprocess.run(
    ["ffmpeg", "-i", wav_path, "-af", "silencedetect=noise=-35dB:d=0.25", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
mids = [(s + e) / 2 for s, e in zip(starts, ends)]

cuts, last = [0.0], 0.0
for m in mids:
    if m - last >= 18.0:
        cuts.append(m)
        last = m
cuts.append(total)

rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{model_dir}/encoder.int8.onnx",
    decoder=f"{model_dir}/decoder.int8.onnx",
    joiner=f"{model_dir}/joiner.int8.onnx",
    tokens=f"{model_dir}/tokens.txt",
    model_type="nemo_transducer",
    num_threads=4,
)

words = []  # [text, startSec]
for a, b in zip(cuts[:-1], cuts[1:]):
    seg = audio[int(a * SR): int(b * SR)]
    st = rec.create_stream()
    st.accept_waveform(SR, seg)
    rec.decode_stream(st)
    r = st.result
    for tok, ts in zip(r.tokens, r.timestamps):
        t = a + ts
        if tok.startswith(" ") or tok.startswith("▁") or not words:
            words.append([tok.replace("▁", " ").strip(), t, t])
        else:
            words[-1][0] += tok
        words[-1][2] = t

captions = []
for i, (text, s, last_tok) in enumerate(words):
    nxt = words[i + 1][1] if i + 1 < len(words) else min(total, last_tok + 0.4)
    end = min(nxt, last_tok + 0.5)
    end = max(end, s + 0.08)
    captions.append({
        "text": (" " if i else "") + text,
        "startMs": round(s * 1000),
        "endMs": round(end * 1000),
        "timestampMs": round(s * 1000),
        "confidence": None,
    })

with open(out_path, "w") as f:
    json.dump(captions, f, indent=1)
print(f"{len(captions)} words, {total:.1f}s, {len(cuts)-1} chunks")
