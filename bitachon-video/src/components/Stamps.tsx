import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, sans, serif, type Layout} from '../theme';
import type {Scene} from '../types';

/**
 * Key-word stamps: a word or number that lands on the stage exactly when it is
 * spoken. Number = huge outlined serif behind the visual; word = elegant serif
 * line under the visual; chip = small pill (stack of up to 4).
 */
export const Stamps: React.FC<{scene: Scene; layout: Layout; layer: 'back' | 'front'}> = ({scene, layout, layer}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const S = layout.stageSize;
  const chips = scene.stamps.filter((s) => s.style === 'chip');
  return (
    <>
      {scene.stamps.map((st, i) => {
        if (ms < st.atMs - 30) return null;
        const t = ms - (st.atMs - 30);
        const inP = interpolate(t, [0, 260], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
        const outP = interpolate(ms, [scene.endMs - 250, scene.endMs], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        // a later word stamp replaces an earlier one
        const nextWord = scene.stamps.slice(i + 1).find((s) => s.style === st.style && st.style !== 'chip');
        const replaced = nextWord ? interpolate(ms, [nextWord.atMs - 30, nextWord.atMs + 120], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
        const op = Math.min(inP * 1.2, 1) * outP * replaced;
        if (op <= 0.001) return null;
        if (st.style === 'number' && layer === 'back') {
          return (
            <div key={i} style={{position: 'absolute', left: layout.stageX - S / 2, width: S, top: layout.stageY - S * 0.36, textAlign: 'center', fontFamily: serif, fontWeight: 700, fontSize: S * 0.62, lineHeight: 1, color: 'transparent', WebkitTextStroke: `4px ${colors.gold}`, opacity: op * 0.55, transform: `scale(${0.8 + 0.2 * inP + (t / 1000) * 0.02})`}}>
              {st.text}
            </div>
          );
        }
        if (st.style === 'word' && layer === 'front') {
          return (
            <div key={i} style={{position: 'absolute', left: layout.stageX - S * 0.75, width: S * 1.5, top: layout.stageY + S * 0.3, textAlign: 'center', fontFamily: serif, fontWeight: 700, fontSize: S * 0.075, letterSpacing: 1, color: colors.goldSoft, opacity: op, transform: `translateY(${(1 - inP) * 30}px)`, textShadow: '0 4px 20px rgba(0,0,0,0.6)'}}>
              {st.text}
            </div>
          );
        }
        if (st.style === 'chip' && layer === 'front') {
          const k = chips.indexOf(st);
          const cols = 2;
          const cx = layout.stageX + (k % cols === 0 ? -1 : 1) * S * 0.24;
          const cy = layout.stageY - S * 0.18 + Math.floor(k / cols) * S * 0.3;
          return (
            <div key={i} style={{position: 'absolute', left: cx - S * 0.22, width: S * 0.44, top: cy - S * 0.06, height: S * 0.12, borderRadius: S * 0.06, border: `3px solid ${colors.gold}`, background: 'rgba(14,26,43,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 700, fontSize: S * 0.05, color: colors.cream, opacity: op, transform: `scale(${0.6 + 0.4 * inP})`}}>
              {st.text}
            </div>
          );
        }
        return null;
      })}
    </>
  );
};
