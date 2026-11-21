import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, sans, type Layout} from '../theme';
import type {Chunk} from '../types';

/**
 * Word-timed burned-in captions, 2–4 words per group.
 * Active word: gold + 85% → 110% → 100% bounce on its timestamp.
 */
export const Captions: React.FC<{chunks: Chunk[]; layout: Layout; hideAfterMs?: number}> = ({chunks, layout, hideAfterMs}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  if (hideAfterMs !== undefined && ms >= hideAfterMs) return null;

  // find current chunk (binary search would be faster; 300 items is fine)
  let chunk: Chunk | undefined;
  for (const c of chunks) {
    if (ms >= c.startMs - 40 && ms < c.showUntilMs) { chunk = c; break; }
    if (c.startMs > ms) break;
  }
  if (!chunk) return null;

  const enter = interpolate(ms - (chunk.startMs - 40), [0, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: (layout.width - layout.captionMaxWidth) / 2,
          width: layout.captionMaxWidth,
          top: layout.captionY,
          transform: `translateY(-50%) translateY(${(1 - enter) * 18}px)`,
          opacity: enter,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'baseline',
          columnGap: layout.captionFontSize * 0.4,
          rowGap: layout.captionFontSize * 0.04,
          fontFamily: sans,
          fontWeight: 800,
          fontSize: layout.captionFontSize,
          lineHeight: 1.12,
          letterSpacing: -0.5,
          textAlign: 'center',
        }}
      >
        {chunk.words.map((w, i) => {
          const active = ms >= w.startMs && ms < Math.max(w.endMs, (chunk!.words[i + 1]?.startMs ?? chunk!.showUntilMs));
          const spoken = ms >= w.startMs;
          const t = ms - w.startMs;
          const scale = t < 0 ? 1 : interpolate(t, [0, 70, 200], [0.85, 1.1, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `scale(${active ? scale : 1})`,
                transformOrigin: '50% 70%',
                color: active ? colors.gold : spoken ? colors.cream : 'rgba(246,238,223,0.82)',
                WebkitTextStroke: `${Math.round(layout.captionFontSize * 0.1)}px ${colors.navyDeep}`,
                paintOrder: 'stroke fill',
                textShadow: `0 6px 18px rgba(0,0,0,0.55)`,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
