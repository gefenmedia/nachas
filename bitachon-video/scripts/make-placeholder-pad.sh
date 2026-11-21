#!/usr/bin/env bash
# Generates an original, license-free ambient pad (instrumental, no vocals) as a
# placeholder music bed. Replace with a YouTube Audio Library track when ready.
# Usage: bash scripts/make-placeholder-pad.sh [seconds]
set -euo pipefail
DUR=${1:-300}
mkdir -p public/music
# Drone (D2 + A2) + a slow D – Bm – G – A progression, each chord swelling over 8 s.
K='floor(mod(t,32)/8)'
r(){ echo "if(eq($K,0),$1,if(eq($K,1),$2,if(eq($K,2),$3,$4)))"; }
R1=$(r 146.83 123.47 98.00 110.00)
R2=$(r 185.00 146.83 123.47 138.59)
R3=$(r 220.00 185.00 146.83 164.81)
R4=$(r 293.66 246.94 196.00 220.00)
E='pow(sin(PI*mod(t,8)/8),1.5)'
EXPR="0.22*sin(2*PI*73.42*t)+0.16*sin(2*PI*110*t)+$E*(0.13*sin(2*PI*($R1)*t)+0.11*sin(2*PI*($R2)*t)+0.09*sin(2*PI*($R3)*t)+0.05*sin(2*PI*($R4)*t))"
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='$EXPR':s=44100:d=$DUR" \
  -af "lowpass=f=1400,aecho=0.8:0.7:120|360:0.3|0.2,tremolo=f=0.15:d=0.2,afade=t=in:d=2,loudnorm=I=-22:TP=-3,aformat=channel_layouts=stereo" \
  -c:a libmp3lame -b:a 160k public/music/placeholder-pad.mp3
echo "wrote public/music/placeholder-pad.mp3"
