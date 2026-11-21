/* Procedural, modest, symbol-only visuals for Bulletproof Bitachon.
 * Every visual draws in a 1000×1000 box centred on (500,500).
 * Props: t = seconds since scene start, trig = seconds of the trigger word
 * (or null), dur = scene length in seconds. All motion is deterministic.
 * No people, no faces, no depiction of Hashem — only light, objects, nature.
 */
import React from 'react';
import {Easing, interpolate, random} from 'remotion';
import {colors as C} from '../theme';

export type VP = {t: number; trig: number | null; dur: number};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.out(Easing.cubic);
/** 0→1 over len seconds starting at `at` */
export const p = (t: number, at = 0, len = 0.6) => interpolate(t, [at, at + len], [0, 1], {...clamp, easing: ease});
const trigAt = (trig: number | null, fallback = 0.4) => (trig ?? fallback);
const breathe = (t: number, sp = 1, amt = 0.02) => 1 + Math.sin(t * sp * 2) * amt;

const Glow: React.FC<{cx?: number; cy?: number; r?: number; o?: number; color?: string}> = ({cx = 500, cy = 500, r = 300, o = 0.5, color = C.gold}) => (
  <circle cx={cx} cy={cy} r={r} fill={`url(#glow-${color === C.gold ? 'gold' : 'cream'})`} opacity={o} />
);

export const Defs: React.FC = () => (
  <defs>
    <radialGradient id="glow-gold">
      <stop offset="0%" stopColor={C.gold} stopOpacity={0.9} />
      <stop offset="45%" stopColor={C.amber} stopOpacity={0.25} />
      <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="glow-cream">
      <stop offset="0%" stopColor={C.cream} stopOpacity={0.95} />
      <stop offset="50%" stopColor={C.goldSoft} stopOpacity={0.2} />
      <stop offset="100%" stopColor={C.goldSoft} stopOpacity={0} />
    </radialGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={C.cream} />
      <stop offset="100%" stopColor="#E2D4BA" />
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stopColor={C.amber} />
      <stop offset="60%" stopColor={C.gold} />
      <stop offset="100%" stopColor={C.cream} />
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={C.navy} stopOpacity={0} />
      <stop offset="100%" stopColor={C.amber} stopOpacity={0.35} />
    </linearGradient>
  </defs>
);

const Rays: React.FC<{t: number; cx?: number; cy?: number; n?: number; len?: number; o?: number; spin?: number}> = ({t, cx = 500, cy = 500, n = 14, len = 420, o = 0.35, spin = 4}) => (
  <g opacity={o}>
    {new Array(n).fill(0).map((_, i) => {
      const a = ((i / n) * 360 + t * spin) * (Math.PI / 180);
      const w = 0.05;
      return (
        <path key={i} d={`M${cx},${cy} L${cx + Math.cos(a - w) * len},${cy + Math.sin(a - w) * len} L${cx + Math.cos(a + w) * len},${cy + Math.sin(a + w) * len} Z`} fill={C.goldSoft} opacity={0.35 + 0.25 * Math.sin(t * 1.5 + i)} />
      );
    })}
  </g>
);

/* ---------------- visuals ---------------- */

const Siddur: React.FC<VP> = ({t, trig}) => {
  const open = p(t, 0, 0.9);
  const lit = p(t, trigAt(trig, 0.8), 0.8);
  const ang = (1 - open) * 70;
  const lines = (side: number) =>
    new Array(7).fill(0).map((_, i) => {
      const w = 150 - (i % 3) * 22;
      const show = p(t, 0.5 + i * 0.12, 0.4);
      return <rect key={i} x={side < 0 ? 330 : 530} y={465 + i * 24} width={w * show} height={8} rx={4} fill={C.charcoal} opacity={0.55} />;
    });
  return (
    <g transform={`translate(0,${Math.sin(t * 1.4) * 6})`}>
      <Glow cy={470} r={330 + lit * 80} o={0.25 + lit * 0.5} />
      <Rays t={t} cy={430} o={lit * 0.5} />
      <g transform={`translate(500,640)`}>
        <path d="M-230,-215 Q-120,-245 0,-205 L0,25 Q-120,-15 -230,15 Z" fill="url(#page)" transform={`skewY(${ang * 0.15}) scale(${0.7 + 0.3 * open},1)`} />
        <path d="M230,-215 Q120,-245 0,-205 L0,25 Q120,-15 230,15 Z" fill="url(#page)" transform={`skewY(${-ang * 0.15}) scale(${0.7 + 0.3 * open},1)`} />
        <path d="M0,-205 L0,25" stroke={C.amber} strokeWidth={4} />
        <path d="M-240,20 Q-120,-10 0,32 Q120,-10 240,20 L240,34 Q120,4 0,46 Q-120,4 -240,34 Z" fill={C.amber} opacity={0.9} />
      </g>
      <g>{lines(-1)}{lines(1)}</g>
    </g>
  );
};

const Speed: React.FC<VP> = ({t, trig}) => {
  const go = p(t, trigAt(trig, 0.5) - 0.3, 0.3);
  const swing = Math.sin(t * 14) * 32 * (0.3 + 0.7 * go);
  return (
    <g>
      {new Array(16).fill(0).map((_, i) => {
        const y = 180 + random(`sy${i}`) * 640;
        const len = 120 + random(`sl${i}`) * 260;
        const x = 1100 - ((t * (900 + random(`sv${i}`) * 900) + random(`sx${i}`) * 1200) % 1500);
        return <rect key={i} x={x} y={y} width={len} height={5} rx={3} fill={C.goldSoft} opacity={0.15 + 0.45 * go} />;
      })}
      <g transform="translate(500,770)">
        <path d="M-150,0 L-80,-420 L80,-420 L150,0 Z" fill={C.charcoal} stroke={C.gold} strokeWidth={6} />
        <g transform={`rotate(${swing})`}>
          <rect x={-6} y={-400} width={12} height={380} rx={6} fill={C.cream} />
          <rect x={-34} y={-300} width={68} height={40} rx={8} fill={C.gold} />
        </g>
        <circle r={18} fill={C.gold} cy={-20} />
      </g>
    </g>
  );
};

const Generations: React.FC<VP> = ({t}) => {
  const a = p(t, 0, 0.6);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2);
  return (
    <g>
      <line x1={140} y1={560} x2={140 + 720 * a} y2={560} stroke={C.creamDim} strokeWidth={6} strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 160 + i * 170;
        const s = p(t, 0.05 + i * 0.12, 0.4);
        const now = i === 4;
        return (
          <g key={i} transform={`translate(${x},560) scale(${s})`}>
            {now && <circle r={70 + pulse * 10} fill="url(#glow-gold)" opacity={0.7} />}
            <circle r={now ? 30 : 20} fill={now ? C.gold : C.slate} stroke={C.cream} strokeWidth={4} />
          </g>
        );
      })}
      <text x={160} y={670} fill={C.creamDim} fontSize={64} fontFamily="Frank Ruhl Libre" textAnchor="middle" opacity={p(t, 0.2)}>then</text>
      <text x={840} y={670} fill={C.gold} fontSize={70} fontFamily="Frank Ruhl Libre" textAnchor="middle" opacity={p(t, 0.6)}>now</text>
    </g>
  );
};

const Storm: React.FC<VP> = ({t, trig}) => {
  const grow = p(t, 0, 1.2);
  const flash = trig !== null && t > trig && t < trig + 0.25 ? 1 - (t - trig) / 0.25 : 0;
  const jit = Math.sin(t * 9) * 3;
  const puffs = [[380, 470, 120], [500, 420, 150], [630, 470, 120], [450, 520, 110], [570, 525, 115], [300, 520, 85], [710, 525, 85]];
  return (
    <g transform={`translate(${jit},0) scale(${0.85 + 0.15 * grow})`} style={{transformOrigin: '500px 500px'}}>
      <Glow cy={480} r={360} o={0.15 + flash * 0.6} color={C.cream} />
      {puffs.map(([x, y, r], i) => (
        <circle key={i} cx={x + Math.sin(t * 0.8 + i) * 8} cy={y} r={r * grow} fill={C.charcoal} stroke={C.slate} strokeWidth={3} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 600 + ((t * 420 + i * 60) % 280);
        return <line key={i} x1={340 + i * 64} y1={y} x2={330 + i * 64} y2={y + 36} stroke={C.ice} strokeWidth={5} strokeLinecap="round" opacity={0.5 * grow} />;
      })}
      <path d="M520,560 L470,660 L515,660 L480,760" fill="none" stroke={C.gold} strokeWidth={10} strokeLinejoin="round" opacity={flash} />
    </g>
  );
};

const Spark: React.FC<VP> = ({t, trig}) => {
  const at = trigAt(trig, 0.3);
  const burst = p(t, at - 0.1, 0.7);
  return (
    <g>
      <Glow r={200 + 220 * burst} o={0.25 + 0.5 * burst} />
      {new Array(18).fill(0).map((_, i) => {
        const a = (i / 18) * Math.PI * 2 + 0.1;
        const r1 = 90 + 160 * burst;
        const r2 = r1 + 60 + (i % 2) * 50;
        return <line key={i} x1={500 + Math.cos(a) * r1} y1={500 + Math.sin(a) * r1} x2={500 + Math.cos(a) * r2} y2={500 + Math.sin(a) * r2} stroke={C.gold} strokeWidth={8} strokeLinecap="round" opacity={burst * (0.6 + 0.4 * Math.sin(t * 6 + i))} />;
      })}
      <circle cx={500} cy={500} r={70 * breathe(t, 2, 0.08)} fill={C.cream} />
      <circle cx={500} cy={500} r={120 + 300 * ((t * 0.5) % 1)} fill="none" stroke={C.goldSoft} strokeWidth={4} opacity={1 - ((t * 0.5) % 1)} />
    </g>
  );
};

const Path: React.FC<VP> = ({t}) => {
  const draw = p(t, 0, 1.6);
  const d = 'M500,900 C300,780 720,680 520,560 C380,470 620,400 500,300 C440,250 520,210 500,170';
  const steps = Math.floor(t * 1.4); // a steady, unhurried pace
  return (
    <g>
      <Glow cy={170} r={220} o={0.6} />
      <path d={d} fill="none" stroke={C.charcoal} strokeWidth={90} strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.goldSoft} strokeWidth={6} strokeDasharray="18 22" pathLength={1000} strokeDashoffset={-t * 40} opacity={draw} />
      {new Array(Math.min(steps, 8)).fill(0).map((_, i) => {
        const pts = [[500, 860], [470, 780], [560, 700], [540, 620], [470, 540], [540, 460], [520, 390], [490, 320]];
        const [x, y] = pts[i];
        return <circle key={i} cx={x} cy={y} r={14 - i} fill={C.gold} opacity={0.9 - i * 0.06} />;
      })}
    </g>
  );
};

const RaysV: React.FC<VP> = ({t}) => (
  <g>
    <Rays t={t} cy={200} n={18} len={900} o={0.45 * p(t, 0, 1)} spin={2} />
    <Glow cy={200} r={320} o={0.7} color={C.cream} />
    <path d="M100,860 Q500,780 900,860" stroke={C.goldSoft} strokeWidth={4} fill="none" opacity={0.5} />
  </g>
);

const Question: React.FC<VP> = ({t, trig}) => {
  const s = p(t, trigAt(trig, 0.4) - 0.2, 0.5);
  return (
    <g transform={`translate(500,470) rotate(${Math.sin(t * 2) * 4}) scale(${0.6 + 0.4 * s})`}>
      <Glow cx={0} cy={0} r={260} o={0.3} />
      <path d="M-90,-100 Q-90,-210 10,-210 Q110,-210 110,-120 Q110,-60 40,-30 Q0,-10 0,50" fill="none" stroke={C.gold} strokeWidth={46} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - s} />
      <circle cx={0} cy={140} r={30 * s} fill={C.gold} />
    </g>
  );
};

const Shield: React.FC<VP> = ({t, trig}) => {
  const draw = p(t, 0, 1.2);
  const lit = p(t, trigAt(trig, 1), 0.6);
  return (
    <g>
      <Glow cy={470} r={300 + 60 * lit} o={0.2 + 0.5 * lit} />
      {new Array(7).fill(0).map((_, i) => {
        const ph = ((t * 0.9 + i / 7) % 1);
        const y = 220 + i * 70;
        const x = ph < 0.5 ? 60 + ph * 2 * 230 : 290 - (ph - 0.5) * 2 * 200;
        return <circle key={i} cx={x} cy={y} r={9} fill={C.slate} opacity={0.8} />;
      })}
      <path d="M500,210 L700,280 Q700,560 500,720 Q300,560 300,280 Z" fill={C.navyLift} stroke={C.gold} strokeWidth={14} strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} transform={`translate(500,470) scale(${breathe(t, 1, 0.02)}) translate(-500,-470)`} />
      <circle cx={500} cy={450} r={46 * lit} fill={C.cream} opacity={0.9} />
    </g>
  );
};

const Minyan: React.FC<VP> = ({t, trig}) => {
  const at = trigAt(trig, 1);
  return (
    <g>
      {new Array(10).fill(0).map((_, i) => {
        const row = Math.floor(i / 5);
        const x = 220 + (i % 5) * 140;
        const y = 420 + row * 220;
        const on = p(t, at - 1 + i * 0.12, 0.35);
        const fl = 1 + 0.08 * Math.sin(t * 8 + i * 1.7);
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <circle r={80} fill="url(#glow-gold)" opacity={on * 0.6} />
            <rect x={-12} y={10} width={24} height={70} rx={4} fill={C.cream} opacity={0.85} />
            <path d="M0,-50 Q24,-14 0,8 Q-24,-14 0,-50 Z" fill="url(#flame)" transform={`scale(${on * fl})`} />
          </g>
        );
      })}
    </g>
  );
};

const Screens: React.FC<VP> = ({t}) => {
  const icons = [
    <path key="a" d="M-20,-28 L30,0 L-20,28 Z" fill={C.gold} />,
    <path key="b" d="M-40,-30 H40 V18 H-6 L-26,36 V18 H-40 Z" fill="none" stroke={C.gold} strokeWidth={8} strokeLinejoin="round" />,
    <g key="c" fill="none" stroke={C.gold} strokeWidth={7}><circle r={36} /><ellipse rx={16} ry={36} /><line x1={-36} x2={36} /></g>,
    <g key="d" fill="none" stroke={C.gold} strokeWidth={7}><rect x={-30} y={-30} width={60} height={60} rx={8} />{[-15, 0, 15].map((v) => <g key={v}><line x1={v} y1={-44} x2={v} y2={-30} /><line x1={v} y1={30} x2={v} y2={44} /><line y1={v} x1={-44} y2={v} x2={-30} /><line y1={v} x1={30} y2={v} x2={44} /></g>)}</g>,
  ];
  return (
    <g opacity={0.35 + 0.15 * Math.sin(t * 3)}>
      {icons.map((ic, i) => {
        const x = 300 + (i % 2) * 400;
        const y = 330 + Math.floor(i / 2) * 300;
        const s = p(t, i * 0.4, 0.5);
        return (
          <g key={i} transform={`translate(${x},${y + Math.sin(t * 2 + i) * 8}) scale(${s})`}>
            <rect x={-90} y={-140} width={180} height={280} rx={28} fill={C.navyLift} stroke={C.slate} strokeWidth={6} />
            {ic}
          </g>
        );
      })}
    </g>
  );
};

const Embrace: React.FC<VP> = ({t, trig}) => {
  const close = p(t, trigAt(trig, 0.8) - 0.4, 1.4);
  const gap = 260 - 170 * close;
  return (
    <g>
      <Glow r={180 + 140 * close} o={0.3 + 0.5 * close} />
      <circle cx={500} cy={500} r={60 * breathe(t, 1.5, 0.06)} fill={C.cream} opacity={0.4 + 0.6 * close} />
      <path d={`M${500 - gap},${300} Q${500 - gap - 170},500 ${500 - gap},700`} fill="none" stroke={C.gold} strokeWidth={30} strokeLinecap="round" />
      <path d={`M${500 + gap},${300} Q${500 + gap + 170},500 ${500 + gap},700`} fill="none" stroke={C.gold} strokeWidth={30} strokeLinecap="round" />
    </g>
  );
};

const Wall: React.FC<VP & {crack?: boolean}> = ({t, trig, crack}) => {
  const rows = 7;
  const cr = crack ? p(t, trigAt(trig, 0.6) - 0.2, 1.2) : 0;
  return (
    <g>
      {crack && <Glow cy={500} r={120 + 260 * cr} o={cr * 0.8} color={C.cream} />}
      {new Array(rows).fill(0).map((_, r) =>
        new Array(5).fill(0).map((__, c) => {
          const show = crack ? 1 : p(t, (rows - 1 - r) * 0.18 + c * 0.04, 0.3);
          const x = 190 + c * 130 - (r % 2) * 65;
          const y = 760 - r * 72;
          const side = x + 60 < 500 ? -1 : 1;
          return <rect key={`${r}-${c}`} x={x + side * cr * 26} y={y - (1 - show) * 60} width={122} height={64} rx={6} fill={C.charcoal} stroke={C.slate} strokeWidth={3} opacity={show} />;
        }),
      )}
      {crack && <path d="M500,250 L470,340 L530,420 L480,520 L540,610 L500,760" fill="none" stroke={C.cream} strokeWidth={8} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - cr} />}
    </g>
  );
};

const Candle: React.FC<VP> = ({t}) => {
  const fl = 1 + 0.12 * Math.sin(t * 11) + 0.06 * Math.sin(t * 17);
  const dim = interpolate(t, [0, 6], [1, 0.45], clamp);
  return (
    <g>
      <Glow cy={380} r={260 * dim} o={0.45 * dim} />
      <rect x={455} y={430} width={90} height={330} rx={10} fill={C.cream} opacity={0.75} />
      <path d="M500,250 Q560,350 500,420 Q440,350 500,250 Z" fill="url(#flame)" transform={`translate(500,420) scale(${fl * dim}) translate(-500,-420)`} />
      <path d={`M500,240 Q${520 + Math.sin(t * 2) * 30},170 ${500 + Math.sin(t * 1.3) * 40},90`} fill="none" stroke={C.slate} strokeWidth={6} opacity={0.5 * (1 - dim)} />
    </g>
  );
};

const Chain: React.FC<VP> = ({t}) => {
  const slide = (t * 70) % 200;
  return (
    <g>
      {new Array(7).fill(0).map((_, i) => {
        const x = -100 + i * 200 - slide + 100;
        const vertical = i % 2 === 1;
        const age = interpolate(x, [0, 1000], [0.35, 1], clamp);
        return <rect key={i} x={x - (vertical ? 40 : 110)} y={500 - (vertical ? 70 : 50)} width={vertical ? 80 : 220} height={vertical ? 140 : 100} rx={50} fill="none" stroke={C.gold} strokeWidth={22} opacity={age} />;
      })}
      <path d="M800,700 L900,700 M870,670 L900,700 L870,730" stroke={C.creamDim} strokeWidth={8} fill="none" strokeLinecap="round" opacity={p(t, 1)} />
    </g>
  );
};

const Soul: React.FC<VP> = ({t}) => (
  <g>
    {[0, 1, 2].map((i) => {
      const ph = (t * 0.45 + i / 3) % 1;
      return <circle key={i} cx={500} cy={480} r={90 + ph * 330} fill="none" stroke={C.goldSoft} strokeWidth={4} opacity={(1 - ph) * 0.7} />;
    })}
    <Glow cy={480} r={300 * breathe(t, 1, 0.05)} o={0.9} />
    <circle cx={500} cy={480} r={70 * breathe(t, 1.3, 0.05)} fill={C.cream} />
  </g>
);

const Melt: React.FC<VP> = ({t, trig}) => {
  const m = p(t, trigAt(trig, 1) - 0.8, 3.5);
  const h = 340 * (1 - 0.6 * m);
  return (
    <g>
      <Glow cy={300} r={300} o={0.2 + 0.5 * m} />
      <rect x={330 + 40 * m} y={680 - h} width={340 - 80 * m} height={h} rx={30 + 50 * m} fill={C.ice} opacity={0.85} />
      <rect x={370 + 40 * m} y={700 - h} width={60} height={h * 0.6} rx={20} fill="#ffffff" opacity={0.35} />
      <ellipse cx={500} cy={700} rx={160 + 200 * m} ry={18 + 10 * m} fill={C.ice} opacity={0.35 + 0.3 * m} />
      {new Array(5).fill(0).map((_, i) => {
        const ph = (t * 0.8 + i * 0.21) % 1;
        return <path key={i} d="M0,-26 Q16,0 0,14 Q-16,0 0,-26 Z" fill={C.ice} transform={`translate(${380 + i * 60},${690 - h + 40 + ph * (h + 20)})`} opacity={m * (1 - ph)} />;
      })}
    </g>
  );
};

const Sunrise: React.FC<VP> = ({t, trig}) => {
  const rise = p(t, Math.max(0, trigAt(trig, 0.5) - 1), 2.5);
  const y = 720 - 240 * rise;
  return (
    <g>
      <rect x={0} y={0} width={1000} height={720} fill="url(#sky)" opacity={rise} />
      <Rays t={t} cy={y} n={16} len={700} o={rise * 0.4} spin={3} />
      <Glow cy={y} r={340} o={0.6 + 0.3 * rise} />
      <circle cx={500} cy={y} r={130} fill={C.gold} />
      <rect x={0} y={720} width={1000} height={280} fill={C.navyDeep} />
      <line x1={60} y1={720} x2={940} y2={720} stroke={C.goldSoft} strokeWidth={5} />
    </g>
  );
};

const House: React.FC<{x: number; s: number; lit: number}> = ({x, s, lit}) => (
  <g transform={`translate(${x},640) scale(${s})`}>
    <path d="M-110,0 V-150 L0,-250 L110,-150 V0 Z" fill={C.navyLift} stroke={C.creamDim} strokeWidth={6} strokeLinejoin="round" />
    <rect x={-36} y={-130} width={72} height={66} rx={6} fill={C.gold} opacity={0.2 + 0.8 * lit} />
    <rect x={-28} y={-50} width={56} height={50} rx={4} fill={C.charcoal} />
    <circle cy={-100} r={110} fill="url(#glow-gold)" opacity={lit * 0.5} />
  </g>
);
const Home: React.FC<VP> = ({t}) => (
  <g>
    <line x1={60} y1={640} x2={940} y2={640} stroke={C.slate} strokeWidth={5} />
    <House x={230} s={0.8} lit={p(t, 1.4, 0.6)} />
    <House x={500} s={1.05} lit={p(t, 0.3, 0.6)} />
    <House x={770} s={0.8} lit={p(t, 2.4, 0.6)} />
  </g>
);

const heartD = 'M500,760 C260,600 220,420 320,340 C400,280 470,320 500,380 C530,320 600,280 680,340 C780,420 740,600 500,760 Z';
const Heart: React.FC<VP> = ({t, trig}) => {
  const draw = p(t, 0, 1.4);
  const fill = p(t, trigAt(trig, 1), 0.8);
  const b = 1 + 0.05 * Math.max(0, Math.sin(t * 4)) ** 8;
  return (
    <g transform={`translate(500,540) scale(${b}) translate(-500,-540)`}>
      <Glow cy={520} r={260 + 100 * fill} o={0.2 + 0.6 * fill} />
      <path d={heartD} fill={C.amber} opacity={fill * 0.55} />
      <path d={heartD} fill="none" stroke={C.gold} strokeWidth={18} strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
    </g>
  );
};

const Vessel: React.FC<VP> = ({t, trig}) => {
  const cr = p(t, trigAt(trig, 1) - 0.1, 0.5);
  return (
    <g transform={`translate(${cr > 0 && cr < 1 ? Math.sin(t * 60) * 4 : 0},0)`}>
      <path d="M380,300 H620 Q600,360 650,430 Q720,540 650,680 Q600,760 500,760 Q400,760 350,680 Q280,540 350,430 Q400,360 380,300 Z" fill={C.navyLift} stroke={C.creamDim} strokeWidth={10} strokeLinejoin="round" />
      <path d="M520,300 L490,400 L545,470 L485,560 L520,640" fill="none" stroke={C.cream} strokeWidth={7} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - cr} />
      {new Array(3).fill(0).map((_, i) => {
        const ph = (t * 0.6 + i / 3) % 1;
        return <path key={i} d="M0,-22 Q14,0 0,12 Q-14,0 0,-22 Z" fill={C.slate} transform={`translate(${505 + i * 8},${640 + ph * 230})`} opacity={cr * (1 - ph)} />;
      })}
    </g>
  );
};

const Lantern: React.FC<VP> = ({t, trig}) => {
  const lit = p(t, trigAt(trig, 1) - 0.2, 0.8);
  const sw = Math.sin(t * 1.6) * 5;
  return (
    <g>
      <path d="M500,980 C380,860 620,760 500,640" fill="none" stroke={C.charcoal} strokeWidth={80} strokeLinecap="round" />
      <path d="M500,980 C380,860 620,760 500,640" fill="none" stroke={C.gold} strokeWidth={80} strokeLinecap="round" opacity={0.35 * lit} />
      <g transform={`translate(500,220) rotate(${sw}) translate(-500,-220)`}>
        <line x1={500} y1={120} x2={500} y2={250} stroke={C.creamDim} strokeWidth={6} />
        <Glow cy={380} r={300} o={0.25 + 0.6 * lit} />
        <path d="M420,280 H580 L560,500 H440 Z" fill={C.navyLift} stroke={C.gold} strokeWidth={10} strokeLinejoin="round" />
        <path d="M500,330 Q540,400 500,450 Q460,400 500,330 Z" fill="url(#flame)" transform={`translate(500,450) scale(${(0.3 + 0.7 * lit) * (1 + 0.08 * Math.sin(t * 9))}) translate(-500,-450)`} />
        <rect x={400} y={260} width={200} height={26} rx={8} fill={C.gold} />
        <rect x={420} y={496} width={160} height={22} rx={8} fill={C.gold} />
      </g>
    </g>
  );
};

const Seed: React.FC<VP> = ({t, trig}) => {
  const g = p(t, Math.max(0, trigAt(trig, 1) - 1.6), 3);
  const sway = Math.sin(t * 1.5) * 4 * g;
  const h = 330 * g;
  return (
    <g>
      <Glow cy={300} r={260} o={0.3 + 0.3 * g} />
      <path d="M120,700 Q500,640 880,700 L880,860 H120 Z" fill={C.charcoal} />
      <ellipse cx={500} cy={720} rx={34} ry={22} fill={C.amber} />
      <g transform={`rotate(${sway},500,700)`}>
        <path d={`M500,700 Q490,${700 - h * 0.5} 500,${700 - h}`} fill="none" stroke="#9DBF7A" strokeWidth={14} strokeLinecap="round" />
        <path d="M0,0 Q60,-60 130,-20 Q60,20 0,0 Z" fill="#9DBF7A" transform={`translate(500,${700 - h * 0.75}) scale(${p(t, Math.max(0, trigAt(trig, 1) - 0.4), 1)})`} />
        <path d="M0,0 Q-60,-60 -130,-20 Q-60,20 0,0 Z" fill="#B5D08F" transform={`translate(500,${700 - h * 0.92}) scale(${p(t, Math.max(0, trigAt(trig, 1)), 1)})`} />
      </g>
    </g>
  );
};

const Rings: React.FC<VP> = ({t}) => (
  <g>
    {new Array(7).fill(0).map((_, i) => {
      const ph = 1 - ((t * 0.3 + i / 7) % 1);
      return <circle key={i} cx={500} cy={500} r={40 + ph * 420} fill="none" stroke={C.goldSoft} strokeWidth={3 + 5 * (1 - ph)} opacity={0.15 + 0.6 * (1 - ph)} />;
    })}
    <Glow r={200 * breathe(t, 1.2, 0.08)} o={0.9} color={C.cream} />
    <circle cx={500} cy={500} r={34} fill={C.cream} />
  </g>
);

const ChainBreak: React.FC<VP> = ({t, trig}) => {
  const br = p(t, trigAt(trig, 0.5) + 0.6, 0.6);
  const links = [-2, -1, 0, 1, 2];
  return (
    <g>
      <Glow r={120 + 260 * br} o={0.6 * br} />
      {links.map((k) => {
        const vertical = k % 2 !== 0;
        const off = k === 0 ? 0 : Math.sign(k) * br * 120;
        const op = k === 0 ? 1 - br : 1;
        return <rect key={k} x={500 + k * 150 + off - (vertical ? 40 : 95)} y={500 - (vertical ? 65 : 45) + (k === 0 ? br * 120 : 0)} width={vertical ? 80 : 190} height={vertical ? 130 : 90} rx={45} fill="none" stroke={C.slate} strokeWidth={22} opacity={op} transform={k === 0 ? `rotate(${br * 40},500,500)` : undefined} />;
      })}
    </g>
  );
};

const Flame: React.FC<VP> = ({t, trig}) => {
  const big = p(t, trigAt(trig, 0.5) - 0.2, 0.8);
  const f1 = 1 + 0.07 * Math.sin(t * 9) + 0.04 * Math.sin(t * 15);
  const s = (0.55 + 0.45 * big) * f1;
  return (
    <g>
      <Glow cy={480} r={260 + 160 * big} o={0.5 + 0.4 * big} />
      <g transform={`translate(500,760) scale(${s},${s * (1 + 0.04 * Math.sin(t * 7))}) translate(-500,-760)`}>
        <path d="M500,250 C640,420 680,560 600,690 C560,750 440,750 400,690 C320,560 360,420 500,250 Z" fill="url(#flame)" />
        <path d="M500,450 C570,540 580,620 540,690 C520,720 480,720 460,690 C420,620 430,540 500,450 Z" fill={C.cream} opacity={0.85} />
      </g>
      {new Array(8).fill(0).map((_, i) => {
        const ph = (t * 0.7 + i / 8) % 1;
        return <circle key={i} cx={460 + random(`e${i}`) * 80 + Math.sin(t * 3 + i) * 30} cy={400 - ph * 300} r={5} fill={C.gold} opacity={(1 - ph) * big} />;
      })}
    </g>
  );
};

const Mountain: React.FC<VP> = ({t}) => {
  const draw = p(t, 0, 1.6);
  return (
    <g>
      <Glow cy={330} r={300} o={0.5} />
      <circle cx={500} cy={330} r={90} fill={C.gold} opacity={0.85} />
      <path d="M60,780 L300,470 L400,560 L560,320 L760,560 L840,490 L960,780 Z" fill={C.navyLift} stroke={C.creamDim} strokeWidth={8} strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
      <path d="M560,320 L500,400 L540,390 L560,420 L590,385 L620,400 Z" fill={C.cream} opacity={draw} />
      <line x1={40} y1={780} x2={960} y2={780} stroke={C.slate} strokeWidth={5} />
    </g>
  );
};

const Globe: React.FC<VP> = ({t}) => {
  const shrink = interpolate(t, [0, 5], [1, 0.7], clamp);
  return (
    <g>
      <Glow cx={760} cy={300} r={240} o={0.5 + 0.3 * p(t, 1.5, 2)} color={C.cream} />
      <g transform={`translate(430,540) scale(${shrink})`} opacity={0.85}>
        <circle r={230} fill={C.navyLift} stroke={C.slate} strokeWidth={8} />
        {[-1, -0.5, 0, 0.5, 1].map((k) => {
          const rx = Math.abs(Math.cos(t * 0.8 + k * 1.2)) * 230;
          return <ellipse key={k} rx={rx} ry={230} fill="none" stroke={C.slate} strokeWidth={4} />;
        })}
        {[-120, 0, 120].map((y) => (
          <line key={y} x1={-Math.sqrt(230 * 230 - y * y)} x2={Math.sqrt(230 * 230 - y * y)} y1={y} y2={y} stroke={C.slate} strokeWidth={4} />
        ))}
      </g>
    </g>
  );
};

const Door: React.FC<VP & {full?: boolean}> = ({t, trig, full}) => {
  const open = full ? 1 : p(t, trigAt(trig, 1) - 0.3, 1.6);
  return (
    <g>
      <path d="M500,980 L380,700 H620 Z" fill={C.gold} opacity={0.18 + 0.35 * open} />
      <Glow cy={520} r={260 + 160 * open} o={0.25 + 0.6 * open} color={C.cream} />
      <rect x={370} y={270} width={260} height={430} rx={8} fill={C.cream} opacity={0.2 + 0.75 * open} />
      <path d={`M370,270 L${370 + 260 * (1 - open * 0.75)},${270 + 40 * open} L${370 + 260 * (1 - open * 0.75)},${700 - 40 * open} L370,700 Z`} fill={C.navyLift} stroke={C.gold} strokeWidth={8} strokeLinejoin="round" />
      <rect x={350} y={250} width={300} height={460} rx={10} fill="none" stroke={C.gold} strokeWidth={14} />
      <circle cx={370 + 260 * (1 - open * 0.75) - 30} cy={490} r={10} fill={C.gold} />
    </g>
  );
};

const SoulRise: React.FC<VP> = ({t, dur}) => {
  const rise = interpolate(t, [0, Math.max(dur, 1)], [0, 1], clamp);
  return (
    <g>
      <Door t={t} trig={null} dur={dur} full />
      <g transform={`translate(0,${-rise * 220})`}>
        <Glow cy={600} r={180} o={0.9} color={C.cream} />
        <circle cx={500} cy={600} r={42 * breathe(t, 1.3, 0.08)} fill={C.cream} />
      </g>
    </g>
  );
};

/** Pressure gauge: tension rising; needle jumps into the red on the trigger word. */
const Gauge: React.FC<VP> = ({t, trig}) => {
  const at = trigAt(trig, 3);
  const base = interpolate(t, [0, at], [0.08, 0.45], clamp);
  const jump = p(t, at - 0.05, 0.45);
  const v = Math.min(0.97, base + jump * 0.45) + Math.sin(t * 13) * 0.012 * (0.3 + jump);
  const ang = -120 + v * 240; // degrees, 0 = straight up
  const cx = 500, cy = 560, R = 300;
  const arc = (a0: number, a1: number, r: number) => {
    const P = (a: number) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
    const [x0, y0] = P(a0), [x1, y1] = P(a1);
    return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`;
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={R + 160} fill="url(#glow-gold)" opacity={0.15 + jump * 0.35} />
      <circle cx={cx} cy={cy} r={R + 30} fill={C.navyLift} stroke={C.creamDim} strokeWidth={10} />
      <path d={arc(-120, 40, R - 30)} fill="none" stroke={C.slate} strokeWidth={34} />
      <path d={arc(40, 120, R - 30)} fill="none" stroke={C.amber} strokeWidth={34} opacity={0.45 + 0.55 * jump * (0.75 + 0.25 * Math.sin(t * 10))} />
      {new Array(13).fill(0).map((_, i) => {
        const a = ((-120 + i * 20) * Math.PI) / 180;
        return <line key={i} x1={cx + (R - 70) * Math.sin(a)} y1={cy - (R - 70) * Math.cos(a)} x2={cx + (R - 100) * Math.sin(a)} y2={cy - (R - 100) * Math.cos(a)} stroke={C.creamDim} strokeWidth={6} strokeLinecap="round" />;
      })}
      <g transform={`rotate(${ang},${cx},${cy})`}>
        <path d={`M${cx - 14},${cy} L${cx},${cy - R + 60} L${cx + 14},${cy} Z`} fill={jump > 0.5 ? C.gold : C.cream} />
      </g>
      <circle cx={cx} cy={cy} r={34} fill={C.gold} />
    </g>
  );
};

/** Flat illustration: older man (60s, black hat, grey beard) watching a 14-year-old daven fast at the amud. */
const Shul: React.FC<VP> = ({t, trig}) => {
  const at = trigAt(trig, 5);
  const anger = Math.max(interpolate(t, [0, at], [0, 0.45], clamp), p(t, at - 0.1, 0.5));
  const manIn = p(t, 0, 0.7);
  const sway = Math.sin(t * 9) * 5; // the boy davens fast
  const tap = Math.max(0, Math.sin(t * (6 + 6 * anger))) * 10 * anger;
  const brow = 6 + 20 * anger;
  const skin = '#E6C29C';
  return (
    <g transform="translate(0,35)">
      {/* shul: arched window + light */}
      <path d="M580,195 L580,385 L820,385 L820,195 A120,120 0 0 0 580,195 Z" fill={C.navyLift} stroke={C.goldSoft} strokeWidth={6} opacity={0.9} />
      <path d="M700,75 L700,385 M580,285 L820,285" stroke={C.goldSoft} strokeWidth={4} opacity={0.5} />
      <circle cx={700} cy={265} r={200} fill="url(#glow-cream)" opacity={0.35} />
      <line x1={40} y1={860} x2={960} y2={860} stroke={C.slate} strokeWidth={5} />

      {/* boy at the amud (from behind, swaying quickly) */}
      <g transform={`rotate(${sway},740,860)`}>
        <rect x={700} y={500} width={84} height={190} rx={30} fill={C.cream} />
        <rect x={705} y={680} width={74} height={180} rx={14} fill={C.charcoal} />
        <circle cx={742} cy={455} r={48} fill={skin} />
        <path d="M700,440 Q742,395 784,440 Q742,425 700,440 Z" fill={C.navyDeep} />
        <path d="M698,455 Q690,490 700,505" stroke="#5A3E2B" strokeWidth={6} fill="none" />
      </g>
      {/* amud */}
      <path d="M640,600 L860,560 L860,600 L840,860 L660,860 L640,600 Z" fill="#7A4E2D" stroke={C.gold} strokeWidth={6} strokeLinejoin="round" />
      <rect x={705} y={545} width={90} height={22} rx={4} fill={C.cream} transform="rotate(-10,750,556)" />
      <rect x={690} y={680} width={120} height={90} rx={8} fill="none" stroke={C.gold} strokeWidth={4} opacity={0.7} />

      {/* older man, seated, arms crossed */}
      <g transform={`translate(${(1 - manIn) * -60},0)`} opacity={manIn}>
        <rect x={110} y={660} width={330} height={30} rx={8} fill="#5E3B22" />
        <rect x={120} y={690} width={20} height={170} fill="#5E3B22" />
        <rect x={410} y={690} width={20} height={170} fill="#5E3B22" />
        {/* legs + tapping foot */}
        <path d="M230,650 L390,650 L390,700 L230,700 Z" fill={C.charcoal} />
        <rect x={360} y={690} width={34} height={150} fill={C.charcoal} />
        <g transform={`rotate(${-tap},380,850)`}><path d="M350,840 L430,840 Q440,860 420,862 L350,862 Z" fill={C.navyDeep} /></g>
        {/* torso (black suit, white shirt) */}
        <path d="M195,660 Q190,500 250,470 L330,470 Q380,500 375,660 Z" fill={C.navyDeep} stroke={C.slate} strokeWidth={4} />
        <path d="M280,472 L300,472 L298,560 L282,560 Z" fill={C.cream} />
        {/* crossed arms */}
        <path d="M205,560 Q280,530 368,575 L362,610 Q280,575 212,600 Z" fill="#141F30" stroke={C.slate} strokeWidth={3} />
        <circle cx={360} cy={585} r={17} fill={skin} />
        <circle cx={215} cy={588} r={17} fill={skin} />
        {/* head */}
        <circle cx={292} cy={400} r={64} fill={skin} />
        <circle cx={292} cy={400} r={64} fill="#D8574A" opacity={0.42 * anger} />
        <path d="M352,398 Q372,412 352,422" fill={skin} />
        {/* grey beard */}
        <path d="M232,405 Q236,520 300,540 Q356,515 352,428 Q330,455 292,452 Q255,450 232,405 Z" fill="#C9CCD1" />
        <path d="M300,462 Q318,470 334,462" stroke="#8C8F95" strokeWidth={5} fill="none" />
        {/* glasses + eye + brow */}
        <circle cx={322} cy={396} r={17} fill="none" stroke={C.charcoal} strokeWidth={4} />
        <line x1={305} y1={393} x2={262} y2={386} stroke={C.charcoal} strokeWidth={4} />
        <circle cx={326} cy={398} r={4.5} fill={C.navyDeep} />
        <path d={`M304,${374 - 2} L344,${374 + brow * 0.6}`} stroke="#8C8F95" strokeWidth={8} strokeLinecap="round" />
        {/* black hat */}
        <ellipse cx={292} cy={350} rx={96} ry={16} fill={C.navyDeep} />
        <path d="M234,350 L240,280 Q292,262 344,280 L350,350 Z" fill={C.navyDeep} />
        <path d="M262,276 Q292,292 322,276" stroke="#1D2A3E" strokeWidth={6} fill="none" />
        <rect x={236} y={330} width={112} height={12} fill="#1D2A3E" />
        {/* agitation marks */}
        <g opacity={p(t, at - 0.1, 0.3)}>
          {[0, 1, 2].map((i) => {
            const a = (-60 + i * 45) * (Math.PI / 180);
            const r0 = 140 + Math.sin(t * 14 + i) * 6;
            return <line key={i} x1={300 + Math.cos(a) * r0} y1={330 + Math.sin(a) * r0 * 0.7} x2={300 + Math.cos(a) * (r0 + 45)} y2={330 + Math.sin(a) * (r0 + 45) * 0.7} stroke={C.amber} strokeWidth={10} strokeLinecap="round" />;
          })}
        </g>
      </g>
    </g>
  );
};

export const VISUALS: Record<string, React.FC<VP>> = {
  siddur: Siddur,
  speed: Speed,
  generations: Generations,
  gauge: Gauge,
  shul: Shul,
  storm: Storm,
  spark: Spark,
  path: Path,
  rays: RaysV,
  question: Question,
  shield: Shield,
  minyan: Minyan,
  screens: Screens,
  embrace: Embrace,
  wall: (pp) => <Wall {...pp} />,
  wallcrack: (pp) => <Wall {...pp} crack />,
  candle: Candle,
  chain: Chain,
  soul: Soul,
  melt: Melt,
  sunrise: Sunrise,
  home: Home,
  heart: Heart,
  vessel: Vessel,
  lantern: Lantern,
  seed: Seed,
  rings: Rings,
  chainbreak: ChainBreak,
  flame: Flame,
  mountain: Mountain,
  globe: Globe,
  door: Door,
  soulrise: SoulRise,
};
