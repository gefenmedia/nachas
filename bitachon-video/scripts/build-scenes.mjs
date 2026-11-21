// Resolves the human-authored plan (src/data/plan.json) against the word-timed
// captions (src/data/captions.json) and writes:
//   src/data/chunks.json   – on-screen caption groups (2–4 words, target 3)
//   src/data/scenes.json   – shot list with startMs/endMs, line, chunks, stamps
//   src/data/episode.json  – episode meta (hook, duration, music, cta)
//   scene-list.md          – readable shot list
// Usage: node scripts/build-scenes.mjs <narration.mp3>
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const audio = process.argv[2] ?? 'public/narration.mp3';
const plan = JSON.parse(fs.readFileSync('src/data/plan.json', 'utf8'));
const caps = JSON.parse(fs.readFileSync('src/data/captions.json', 'utf8'));
const durationMs = Math.round(
  1000 * Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]).toString().trim()),
);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' -]/g, '').replace(/-/g, ' ').trim();
const words = caps.map((c) => norm(c.text));
// expand hyphenated tokens for matching: keep a token->index map
const flat = [];
words.forEach((w, i) => w.split(/\s+/).filter(Boolean).forEach((p) => flat.push({p, i})));

function find(phrase, fromIdx = 0, toIdx = caps.length) {
  const target = norm(phrase).split(/\s+/).filter(Boolean);
  for (let k = 0; k < flat.length; k++) {
    if (flat[k].i < fromIdx || flat[k].i >= toIdx) continue;
    let ok = true;
    for (let j = 0; j < target.length; j++) {
      if (!flat[k + j] || flat[k + j].p !== target[j]) { ok = false; break; }
    }
    if (ok) return flat[k].i;
  }
  return -1;
}

// ---------- caption grouping ----------
function groupChunks(c) {
  const out = [];
  let cur = [];
  const flush = () => { if (cur.length) out.push(cur); cur = []; };
  for (let i = 0; i < c.length; i++) {
    const w = c[i];
    const next = c[i + 1];
    cur.push(w);
    const text = w.text.trim();
    const gap = next ? next.startMs - w.endMs : 9999;
    const dur = w.endMs - cur[0].startMs;
    const sentenceEnd = /[.?!]$/.test(text);
    const clauseEnd = /[,;:]$/.test(text);
    const long = text.length > 11;
    if (cur.length >= 4) flush();
    else if (sentenceEnd && (cur.length >= 1)) flush();
    else if (gap > 380) flush();
    else if (clauseEnd && cur.length >= 2) flush();
    else if (cur.length >= 3 && (dur > 650 || gap > 120 || long)) flush();
    else if (cur.length >= 2 && dur > 1000) flush();
  }
  flush();
  // merge lonely single words into neighbours when not at a pause
  const merged = [];
  for (const g of out) {
    const prev = merged[merged.length - 1];
    if (g.length === 1 && prev && prev.length < 3 && !/[.?!]$/.test(prev[prev.length - 1].text.trim()) && g[0].startMs - prev[prev.length - 1].endMs < 250) {
      prev.push(g[0]);
    } else merged.push([...g]);
  }
  return merged.map((g) => ({
    startMs: g[0].startMs,
    endMs: g[g.length - 1].endMs,
    words: g.map((w) => ({text: w.text.trim(), startMs: w.startMs, endMs: w.endMs})),
  }));
}
const chunks = groupChunks(caps);
// Each chunk stays on screen until the next one starts (no flicker), max +600ms in pauses.
chunks.forEach((ch, i) => {
  const n = chunks[i + 1];
  ch.showUntilMs = n ? Math.min(n.startMs, ch.endMs + 600) : ch.endMs + 600;
});

// ---------- scenes ----------
const anchors = [];
let cursor = 0;
for (const s of plan.scenes) {
  const idx = find(s.anchor, cursor);
  if (idx < 0) throw new Error(`Anchor not found: "${s.anchor}" (after word ${cursor})`);
  anchors.push(idx);
  cursor = idx + 1;
}

const warnings = [];
const scenes = plan.scenes.map((s, n) => {
  const a = anchors[n];
  const b = n + 1 < anchors.length ? anchors[n + 1] : caps.length;
  const startMs = n === 0 ? 0 : caps[a].startMs;
  const endMs = n + 1 < anchors.length ? caps[b].startMs : durationMs;
  const resolve = (phrase) => {
    const i = find(phrase, a, b);
    if (i < 0) { warnings.push(`scene ${n + 1}: "${phrase}" not found in scene`); return null; }
    return caps[i].startMs;
  };
  const triggerMs = s.trigger ? resolve(s.trigger) : null;
  // Word stamps land as a takeaway the moment their caption group leaves the
  // screen (so they never duplicate the live caption); numbers/chips land on the word.
  const stamps = (s.stamps ?? []).map((st) => {
    const style = st.style ?? 'word';
    let atMs = resolve(st.at);
    if (atMs !== null && style === 'word') {
      const ch = chunks.find((c) => atMs >= c.startMs && atMs < c.showUntilMs);
      if (ch) atMs = Math.min(ch.showUntilMs, endMs - 400);
    }
    return {atMs, text: st.text, style};
  }).filter((x) => x.atMs !== null);
  const pulsesMs = (s.pulses ?? []).map(resolve).filter((x) => x !== null);
  const line = caps.slice(a, b).map((c) => c.text).join('').trim();
  const sceneChunks = chunks.filter((c) => c.startMs >= startMs && c.startMs < endMs).map((c) => c.words.map((w) => w.text).join(' '));
  return {
    id: `s${String(n + 1).padStart(2, '0')}`,
    startMs, endMs, line,
    visual: s.visual,
    trigger: s.trigger ?? null,
    triggerMs,
    stamps, pulsesMs,
    sfx: s.sfx ?? null,
    captionChunks: sceneChunks,
  };
});

// hook
const hookEndIdx = find(plan.hook.untilAnchor);
const episode = {
  title: plan.title,
  slug: plan.slug,
  hook: {text: plan.hook.text, startMs: 0, endMs: hookEndIdx >= 0 ? caps[hookEndIdx].startMs : 3000},
  narrationDurationMs: durationMs,
  lastWordEndMs: caps[caps.length - 1].endMs,
  endCardMs: 2000,
  cta: plan.cta,
  music: plan.music,
};

fs.writeFileSync('src/data/chunks.json', JSON.stringify(chunks));
fs.writeFileSync('src/data/scenes.json', JSON.stringify(scenes, null, 1));
fs.writeFileSync('src/data/episode.json', JSON.stringify(episode, null, 1));

const t = (ms) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}`;
let md = `# Scene list — ${plan.title}\n\nHook (0:00–${t(episode.hook.endMs)}): **${plan.hook.text}**\n\n| # | start–end | visual | trigger | stamps | line |\n|---|---|---|---|---|---|\n`;
for (const s of scenes) {
  md += `| ${s.id} | ${t(s.startMs)}–${t(s.endMs)} | ${s.visual} | ${s.trigger ?? ''}${s.triggerMs != null ? ` @${t(s.triggerMs)}` : ''} | ${s.stamps.map((x) => `${x.text} @${t(x.atMs)}`).join('; ')} | ${s.line.replace(/\|/g, '/')} |\n`;
}
md += `\nEnd card: ${t(durationMs)}–${t(durationMs + 2000)} — "Bulletproof Bitachon" + "${plan.cta}"\n`;
fs.writeFileSync('scene-list.md', md);

const sizes = chunks.map((c) => c.words.length);
console.log(`${chunks.length} caption chunks (avg ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2)} words; 1w=${sizes.filter((x) => x === 1).length})`);
console.log(`${scenes.length} scenes, duration ${t(durationMs)}`);
if (warnings.length) console.log('WARN\n' + warnings.join('\n'));
