/* Flat-illustration characters for story scenes.
 * Coordinates are in the same 1000×1000 stage box as library.tsx.
 * Each figure is drawn around its feet at (0,0), facing right; use `flip` to face left.
 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {colors as C} from '../theme';
import {p, type VP} from './library';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const SKIN = '#E6C29C';

/* ------------------------------------------------------------------ */
/* NARRATOR LOOK — edit only this block to match Daniel's appearance.  */
/* ------------------------------------------------------------------ */
export const NARRATOR = {
  skin: '#E2BB95',
  beard: '#3B2A20', // beard colour
  beardLength: 0.55, // 0 = clean-shaven … 1 = long
  hair: '#3B2A20',
  head: 'kippah' as 'kippah' | 'hat' | 'none',
  kippah: C.navyDeep,
  glasses: false,
  jacket: '#1E3A5F',
  shirt: C.cream,
  pants: C.charcoal,
  placeholder: true, // true until drawn from a reference photo
};

/* ----------------------------- backdrop ----------------------------- */
export const ShulRoom: React.FC<{windowX?: number}> = ({windowX = 700}) => (
  <g>
    <path d={`M${windowX - 120},230 L${windowX - 120},420 L${windowX + 120},420 L${windowX + 120},230 A120,120 0 0 0 ${windowX - 120},230 Z`} fill={C.navyLift} stroke={C.goldSoft} strokeWidth={6} opacity={0.9} />
    <path d={`M${windowX},110 L${windowX},420 M${windowX - 120},320 L${windowX + 120},320`} stroke={C.goldSoft} strokeWidth={4} opacity={0.5} />
    <circle cx={windowX} cy={300} r={200} fill="url(#glow-cream)" opacity={0.35} />
    <line x1={20} y1={895} x2={980} y2={895} stroke={C.slate} strokeWidth={5} />
  </g>
);

/* ------------------------------ boy -------------------------------- */
export const BoyAtAmud: React.FC<{x: number; t: number; swaySpeed?: number; glow?: number}> = ({x, t, swaySpeed = 9, glow = 0}) => {
  const sway = Math.sin(t * swaySpeed) * 5;
  const dx = x - 750;
  return (
    <g transform={`translate(${dx},35)`}>
      <circle cx={742} cy={470} r={170 + 60 * glow} fill="url(#glow-gold)" opacity={glow * 0.9} />
      <g transform={`rotate(${sway},740,860)`}>
        <rect x={700} y={500} width={84} height={190} rx={30} fill={C.cream} />
        <rect x={705} y={680} width={74} height={180} rx={14} fill={C.charcoal} />
        <circle cx={742} cy={455} r={48} fill={SKIN} />
        <path d="M700,440 Q742,395 784,440 Q742,425 700,440 Z" fill={C.navyDeep} />
        <path d="M698,455 Q690,490 700,505" stroke="#5A3E2B" strokeWidth={6} fill="none" />
      </g>
      <path d="M640,600 L860,560 L860,600 L840,860 L660,860 L640,600 Z" fill="#7A4E2D" stroke={C.gold} strokeWidth={6} strokeLinejoin="round" />
      <rect x={705} y={545} width={90} height={22} rx={4} fill={C.cream} transform="rotate(-10,750,556)" />
      <rect x={690} y={680} width={120} height={90} rx={8} fill="none" stroke={C.gold} strokeWidth={4} opacity={0.7} />
    </g>
  );
};

/* --------------------------- generic body --------------------------- */
type BodyProps = {
  x: number;
  y?: number;
  t: number;
  flip?: boolean;
  walk?: number; // 0..1 walking intensity
  walkSpeed?: number;
  lean?: number; // degrees forward
  armAngle?: number; // front arm: 0 = hanging, 100 = pointing forward/up
  crossed?: boolean;
  jacket: string;
  shirt: string;
  pants: string;
  skin: string;
  head: React.ReactNode; // drawn around (0,-430)
  hand?: 'point' | 'open';
};

const Body: React.FC<BodyProps> = ({x, y = 895, t, flip, walk = 0, walkSpeed = 9, lean = 0, armAngle = 0, crossed, jacket, shirt, pants, skin, head, hand = 'point'}) => {
  const swing = Math.sin(t * walkSpeed) * 24 * walk;
  const bob = Math.abs(Math.sin(t * walkSpeed)) * 8 * walk;
  return (
    <g transform={`translate(${x},${y - bob}) scale(${flip ? -1 : 1},1) rotate(${lean},0,-200)`}>
      {/* legs */}
      {[swing, -swing].map((a, i) => (
        <g key={i} transform={`rotate(${a},0,-200)`}>
          <rect x={-22 + i * 8} y={-205} width={36} height={195} rx={10} fill={pants} />
          <path d={`M${-24 + i * 8},-14 L${34 + i * 8},-14 Q${48 + i * 8},4 ${30 + i * 8},6 L${-24 + i * 8},6 Z`} fill={C.navyDeep} />
        </g>
      ))}
      {/* back arm */}
      {!crossed && <rect x={-14} y={-360} width={30} height={160} rx={14} fill={jacket} stroke={C.slate} strokeWidth={3} transform={`rotate(${-swing * 0.8},0,-355)`} />}
      {/* torso */}
      <path d="M-72,-195 Q-80,-330 -56,-375 L56,-375 Q80,-330 72,-195 Z" fill={jacket} stroke={C.slate} strokeWidth={4} />
      <path d="M-16,-375 L16,-375 L0,-300 Z" fill={shirt} />
      {crossed ? (
        <g>
          <path d="M-66,-290 Q0,-320 70,-280 L66,-248 Q0,-285 -60,-258 Z" fill={jacket} stroke={C.slate} strokeWidth={3} filter="brightness(0.8)" />
          <circle cx={64} cy={-268} r={16} fill={skin} />
          <circle cx={-58} cy={-270} r={16} fill={skin} />
        </g>
      ) : (
        <g transform={`rotate(${-armAngle + swing * 0.8},10,-355)`}>
          <rect x={-5} y={-360} width={30} height={165} rx={14} fill={jacket} stroke={C.slate} strokeWidth={3} />
          <circle cx={10} cy={-190} r={17} fill={skin} />
          {hand === 'point' && armAngle > 40 && <rect x={4} y={-185} width={10} height={30} rx={5} fill={skin} />}
          {hand === 'open' && armAngle > 40 && <path d="M-4,-195 L-8,-160 M6,-190 L6,-155 M16,-190 L20,-158" stroke={skin} strokeWidth={9} strokeLinecap="round" />}
        </g>
      )}
      {head}
    </g>
  );
};

/* ---------------------------- old man ------------------------------ */
export const OldManHead: React.FC<{anger: number; t: number}> = ({anger, t}) => {
  const brow = 6 + 20 * anger;
  return (
    <g transform="translate(-292,-830)">
      <circle cx={292} cy={400} r={64} fill={SKIN} />
      <circle cx={292} cy={400} r={64} fill="#D8574A" opacity={0.42 * anger} />
      <path d="M352,398 Q372,412 352,422" fill={SKIN} />
      <path d="M232,405 Q236,520 300,540 Q356,515 352,428 Q330,455 292,452 Q255,450 232,405 Z" fill="#C9CCD1" />
      <path d="M300,462 Q318,470 334,462" stroke="#8C8F95" strokeWidth={5} fill="none" />
      <circle cx={322} cy={396} r={17} fill="none" stroke={C.charcoal} strokeWidth={4} />
      <line x1={305} y1={393} x2={262} y2={386} stroke={C.charcoal} strokeWidth={4} />
      <circle cx={326} cy={398} r={4.5} fill={C.navyDeep} />
      <path d={`M304,372 L344,${374 + brow * 0.6}`} stroke="#8C8F95" strokeWidth={8} strokeLinecap="round" />
      <ellipse cx={292} cy={350} rx={96} ry={16} fill={C.navyDeep} />
      <path d="M234,350 L240,280 Q292,262 344,280 L350,350 Z" fill={C.navyDeep} />
      <path d="M262,276 Q292,292 322,276" stroke="#1D2A3E" strokeWidth={6} fill="none" />
      <rect x={236} y={330} width={112} height={12} fill="#1D2A3E" />
      {anger > 0.6 &&
        [0, 1, 2].map((i) => {
          const a = (-60 + i * 45) * (Math.PI / 180);
          const r0 = 140 + Math.sin(t * 14 + i) * 6;
          return <line key={i} x1={300 + Math.cos(a) * r0} y1={330 + Math.sin(a) * r0 * 0.7} x2={300 + Math.cos(a) * (r0 + 45)} y2={330 + Math.sin(a) * (r0 + 45) * 0.7} stroke={C.amber} strokeWidth={10} strokeLinecap="round" opacity={Math.min(1, (anger - 0.6) * 3)} />;
        })}
    </g>
  );
};

export const OldMan: React.FC<Omit<BodyProps, 'jacket' | 'shirt' | 'pants' | 'skin' | 'head'> & {anger: number}> = ({anger, ...rest}) => (
  <Body {...rest} jacket={C.navyDeep} shirt={C.cream} pants={C.charcoal} skin={SKIN} head={<OldManHead anger={anger} t={rest.t} />} />
);

/* ---------------------------- narrator ----------------------------- */
export const NarratorHead: React.FC<{smile: number}> = ({smile}) => {
  const N = NARRATOR;
  const bl = N.beardLength;
  return (
    <g>
      <circle cx={0} cy={-430} r={60} fill={N.skin} />
      <path d="M58,-432 Q76,-418 58,-406" fill={N.skin} />
      {/* hair at back of head */}
      <path d="M-58,-440 Q-62,-480 -20,-488 Q-50,-470 -52,-430 Z" fill={N.hair} />
      {bl > 0 && <path d={`M-56,-430 Q-54,${-370 + 60 * bl} 6,${-350 + 70 * bl} Q58,${-372 + 40 * bl} 58,-412 Q40,-392 4,-394 Q-36,-396 -56,-430 Z`} fill={N.beard} />}
      <path d={`M18,-402 Q34,${-396 + 8 * smile} 48,-404`} stroke={bl > 0.3 ? C.cream : '#7A4A3A'} strokeWidth={5} fill="none" strokeLinecap="round" opacity={bl > 0.3 ? 0.8 : 1} />
      <circle cx={32} cy={-438} r={5} fill={C.navyDeep} />
      <path d="M18,-458 L46,-460" stroke={N.hair} strokeWidth={7} strokeLinecap="round" />
      {N.glasses && <circle cx={30} cy={-436} r={17} fill="none" stroke={C.charcoal} strokeWidth={4} />}
      {N.head === 'kippah' && <path d="M-42,-476 Q0,-506 42,-476 Q0,-488 -42,-476 Z" fill={N.kippah} />}
      {N.head === 'hat' && (
        <g>
          <ellipse cx={0} cy={-478} rx={92} ry={15} fill={C.navyDeep} />
          <path d="M-56,-478 L-50,-548 Q0,-566 50,-548 L56,-478 Z" fill={C.navyDeep} />
        </g>
      )}
    </g>
  );
};

export const Narrator: React.FC<Omit<BodyProps, 'jacket' | 'shirt' | 'pants' | 'skin' | 'head'> & {smile?: number}> = ({smile = 1, ...rest}) => (
  <Body {...rest} jacket={NARRATOR.jacket} shirt={NARRATOR.shirt} pants={NARRATOR.pants} skin={NARRATOR.skin} head={<NarratorHead smile={smile} />} />
);

/* ----------------------------- scenes ------------------------------ */

/** s04: davening ends; the old man gets up and walks to the boy, finger raised on "rebuke". */
const Approach: React.FC<VP> = ({t, trig}) => {
  const at = trig ?? 4.3;
  const walkP = interpolate(t, [0.6, at - 0.3], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const walking = t > 0.6 && t < at - 0.3 ? 1 : 0;
  const x = 260 + 250 * walkP;
  const point = p(t, at - 0.35, 0.35);
  const cloud = p(t, at - 0.1, 0.6);
  return (
    <g>
      <ShulRoom />
      <rect x={90} y={830} width={300} height={26} rx={8} fill="#5E3B22" opacity={0.8} transform="translate(0,35)" />
      <BoyAtAmud x={760} t={t} swaySpeed={2} />
      {/* small storm cloud gathering over the boy */}
      <g opacity={cloud} transform={`translate(${Math.sin(t * 7) * 3},0)`}>
        {[[690, 300, 50], [750, 280, 62], [810, 300, 50], [720, 320, 44], [780, 322, 46]].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r * cloud} fill={C.charcoal} stroke={C.slate} strokeWidth={3} />
        ))}
      </g>
      <OldMan x={x} t={t} walk={walking} armAngle={110 * point} anger={0.55 + 0.45 * point} lean={walking * 4} />
    </g>
  );
};

/** s05: the narrator rushes in and thanks the boy warmly; the old man is stopped short. */
const Thanks: React.FC<VP> = ({t, trig}) => {
  const at = trig ?? 1.6;
  const run = interpolate(t, [0.05, 1.4], [0, 1], {...clamp, easing: Easing.out(Easing.quad)}); // "I quickly ran over"
  const running = t < 1.4 ? 1 : 0;
  const nx = 1120 - 260 * run;
  const wave = p(t, at - 0.15, 0.4);
  const glow = p(t, at, 1.2);
  const settle = p(t, at, 1.5);
  return (
    <g>
      <ShulRoom windowX={560} />
      <BoyAtAmud x={630} t={t} swaySpeed={2} glow={glow} />
      <OldMan x={300 - 30 * settle} t={t} crossed={settle > 0.5} armAngle={110 * (1 - settle)} anger={0.95 - 0.35 * settle} />
      <Narrator x={nx} t={t} flip walk={running} walkSpeed={13} lean={running * 10} armAngle={150 * wave} hand="open" smile={1} />
      {NARRATOR.placeholder && (
        <text x={nx} y={940} textAnchor="middle" fontSize={26} fill={C.creamDim} opacity={0.6} fontFamily="Montserrat">stand-in</text>
      )}
    </g>
  );
};

export const CHARACTER_SCENES: Record<string, React.FC<VP>> = {
  approach: Approach,
  thanks: Thanks,
};
