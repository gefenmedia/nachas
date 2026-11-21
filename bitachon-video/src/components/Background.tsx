import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from '../theme';

/** Deep-navy field, slow drifting gold dust, soft vignette. Never static. */
export const Background: React.FC<{warmth?: number}> = ({warmth = 0}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const t = frame / fps;
  const motes = useMemo(
    () =>
      new Array(46).fill(0).map((_, i) => ({
        x: random(`x${i}`) * width,
        y: random(`y${i}`) * height,
        r: 1.5 + random(`r${i}`) * 3.5,
        sp: 6 + random(`s${i}`) * 16,
        ph: random(`p${i}`) * Math.PI * 2,
        a: 0.12 + random(`a${i}`) * 0.35,
      })),
    [width, height],
  );
  const glowX = width * (0.5 + 0.08 * Math.sin(t * 0.13));
  const glowY = height * (0.36 + 0.04 * Math.cos(t * 0.11));
  return (
    <AbsoluteFill style={{background: colors.navyDeep}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${width * 0.95}px ${height * 0.62}px at ${glowX}px ${glowY}px, ${colors.navyLift} 0%, ${colors.navy} 45%, ${colors.navyDeep} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle ${Math.min(width, height) * 0.55}px at ${glowX}px ${glowY}px, rgba(242,178,76,${0.07 + warmth * 0.08}) 0%, rgba(242,178,76,0) 100%)`,
        }}
      />
      <svg width={width} height={height} style={{position: 'absolute'}}>
        {motes.map((m, i) => {
          const y = (((m.y - t * m.sp) % height) + height) % height;
          const x = m.x + Math.sin(t * 0.5 + m.ph) * 14;
          const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + m.ph);
          return <circle key={i} cx={x} cy={y} r={m.r} fill={colors.goldSoft} opacity={m.a * tw} />;
        })}
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)'}} />
    </AbsoluteFill>
  );
};
