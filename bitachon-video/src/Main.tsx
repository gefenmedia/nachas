import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from './components/Background';
import {Captions} from './components/Captions';
import {Stamps} from './components/Stamps';
import {musicEnvelope} from './lib/ducking';
import {colors, sans, serif, type Layout} from './theme';
import type {VideoProps} from './types';
import {Defs, VISUALS} from './visuals/library';

const FADE_MS = 260;

export const Main: React.FC<VideoProps & {layout: Layout}> = ({narrationSrc, musicSrc, musicVolume, episode, chunks, scenes, layout}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const endCardStart = episode.narrationDurationMs;

  const env = useMemo(() => musicEnvelope({chunks, fps, totalFrames: durationInFrames, pauseGain: musicVolume}), [chunks, fps, durationInFrames, musicVolume]);

  // camera punch on key words: scene cuts, triggers, stamps, pulses
  const pulses = useMemo(
    () => scenes.flatMap((s) => [s.startMs, ...(s.triggerMs != null ? [s.triggerMs] : []), ...s.stamps.map((x) => x.atMs), ...s.pulsesMs]).sort((a, b) => a - b),
    [scenes],
  );
  let punch = 0;
  for (const pm of pulses) {
    const dt = ms - pm;
    if (dt < 0) break;
    if (dt < 700) punch = Math.max(punch, interpolate(dt, [0, 110, 700], [0, 1, 0], {easing: Easing.out(Easing.quad)}));
  }
  const drift = 1 + 0.018 * Math.sin((ms / 1000) * 0.35);
  const camScale = drift + punch * 0.04;
  const camX = Math.sin((ms / 1000) * 0.21) * 10;
  const camY = Math.cos((ms / 1000) * 0.17) * 8;

  const active = scenes.filter((s) => ms >= s.startMs - FADE_MS && ms < s.endMs + FADE_MS && ms < endCardStart + 400);
  const S = layout.stageSize;
  const endP = interpolate(ms, [endCardStart - 150, endCardStart + 450], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});

  // hook
  const hookOut = interpolate(ms, [episode.hook.endMs - 200, episode.hook.endMs + 150], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hookWords = episode.hook.text.split(' ');
  const tagIn = interpolate(ms, [episode.hook.endMs, episode.hook.endMs + 500], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (1 - endP);

  return (
    <AbsoluteFill style={{background: colors.navyDeep, overflow: 'hidden'}}>
      <Background warmth={punch} />

      {/* visual stage */}
      <AbsoluteFill style={{transform: `translate(${camX}px,${camY}px) scale(${camScale})`, transformOrigin: `${layout.stageX}px ${layout.stageY}px`, opacity: 1 - endP}}>
        {active.map((s) => {
          const fadeIn = s.startMs === 0 ? 1 : interpolate(ms, [s.startMs - FADE_MS, s.startMs + FADE_MS * 0.3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const fadeOut = interpolate(ms, [s.endMs - FADE_MS * 0.3, s.endMs + FADE_MS], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const V = VISUALS[s.visual];
          const t = (ms - s.startMs) / 1000;
          const enterScale = interpolate(ms - s.startMs, [-FADE_MS, 500], [0.94, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
          return (
            <AbsoluteFill key={s.id} style={{opacity: Math.min(fadeIn, fadeOut)}}>
              <Stamps scene={s} layout={layout} layer="back" />
              <svg
                viewBox="0 0 1000 1000"
                width={S}
                height={S}
                style={{position: 'absolute', left: layout.stageX - S / 2, top: layout.stageY - S / 2, overflow: 'visible', transform: `scale(${enterScale})`}}
              >
                <Defs />
                {V ? <V t={t} trig={s.triggerMs != null ? (s.triggerMs - s.startMs) / 1000 : null} dur={(s.endMs - s.startMs) / 1000} /> : null}
              </svg>
              <Stamps scene={s} layout={layout} layer="front" />
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>

      {/* hook: on screen from frame 0, already moving */}
      {hookOut > 0 && (
        <div style={{position: 'absolute', left: layout.width * 0.08, width: layout.width * 0.84, top: layout.hookY, transform: 'translateY(-50%)', textAlign: 'center', fontFamily: sans, fontWeight: 800, fontSize: layout.hookFontSize, lineHeight: 1.1, color: colors.cream, opacity: hookOut, textShadow: '0 6px 24px rgba(0,0,0,0.6)'}}>
          {hookWords.map((w, i) => {
            const pp = interpolate(frame, [i * 1.5, i * 1.5 + 10], [0.4, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4))});
            const gold = /showed|up\./i.test(w);
            return (
              <span key={i} style={{display: 'inline-block', marginRight: '0.25em', transform: `translateY(${(1 - pp) * 26}px) scale(${0.9 + 0.1 * pp})`, opacity: pp, color: gold ? colors.gold : colors.cream}}>
                {w}
              </span>
            );
          })}
          <div style={{margin: '18px auto 0', height: 6, borderRadius: 3, background: colors.gold, width: `${interpolate(frame, [4, 40], [0, 46], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)})}%`}} />
        </div>
      )}

      {/* quiet brand tag after the hook */}
      <div style={{position: 'absolute', top: layout.tagY, width: '100%', textAlign: 'center', fontFamily: sans, fontWeight: 700, fontSize: layout.hookFontSize * 0.36, letterSpacing: 8, color: colors.goldSoft, opacity: 0.55 * tagIn}}>
        BULLETPROOF BITACHON
      </div>

      <Captions chunks={chunks} layout={layout} hideAfterMs={endCardStart} />

      {/* end card */}
      {endP > 0 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: endP}}>
          <div style={{textAlign: 'center', transform: `translateY(${(1 - endP) * 30}px)`}}>
            <svg width={120} height={120} viewBox="0 0 120 120" style={{marginBottom: 24}}>
              <circle cx={60} cy={60} r={52} fill="none" stroke={colors.gold} strokeWidth={4} />
              <path d="M60,28 L84,38 Q84,72 60,92 Q36,72 36,38 Z" fill="none" stroke={colors.gold} strokeWidth={5} strokeLinejoin="round" />
            </svg>
            <div style={{fontFamily: serif, fontWeight: 700, fontSize: layout.hookFontSize * 1.25, color: colors.cream, lineHeight: 1.05}}>
              Bulletproof
              <br />
              <span style={{color: colors.gold}}>Bitachon</span>
            </div>
            <div style={{margin: '30px auto', width: 120, height: 3, background: colors.goldSoft, opacity: 0.7}} />
            <div style={{fontFamily: sans, fontWeight: 600, fontSize: layout.hookFontSize * 0.5, color: colors.creamDim, letterSpacing: 1}}>{episode.cta}</div>
          </div>
        </AbsoluteFill>
      )}

      <Audio src={staticFile(narrationSrc)} />
      {musicSrc ? <Audio src={staticFile(musicSrc)} volume={(f) => env[f] ?? 0} loop /> : null}
    </AbsoluteFill>
  );
};
