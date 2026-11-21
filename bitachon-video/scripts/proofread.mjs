// Proofread pass: applies the Bulletproof Bitachon glossary to the raw
// transcript and writes src/data/captions.json + transcript.txt.
// Usage: node scripts/proofread.mjs
// Add new terms to GLOSSARY as you hear them. Keys are matched against the
// word with punctuation stripped, case-insensitive.
import fs from 'node:fs';

const GLOSSARY = {
  darvening: 'davening',
  darving: 'davening',
  minion: 'minyan',
  chazako: "Chazak",
  trechocha: 'tochacha',
  neshoma: 'neshama',
  neshama: 'neshama',
  novi: 'navi',
  toy: 'Torah', // Yeshivish "Toyreh" heard as "toy"
  hakarish: 'HaKadosh',
  borku: 'Baruch Hu',
  rebbe: 'Rebbe',
};

// Pairs fixed as phrases: [index-independent match of two words] -> replacements
const PHRASES = [
  [['chazak', 'baruch'], ['Chazak', "u'Baruch"]],
];

// From this time on, he/him/his refer to Hashem -> capitalize (episode-specific).
const HASHEM_PRONOUNS_FROM_MS = Number(process.env.HASHEM_PRONOUNS_FROM_MS ?? 197000);

const raw = JSON.parse(fs.readFileSync('src/data/captions.raw.json', 'utf8'));
const caps = raw.map((c) => ({ ...c }));

const split = (t) => {
  const m = t.match(/^(\s*)([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/);
  return { lead: m[1], pre: m[2], core: m[3], post: m[4] };
};

for (const c of caps) {
  const { lead, pre, core, post } = split(c.text);
  const key = core.toLowerCase();
  let out = core;
  if (GLOSSARY[key]) {
    out = GLOSSARY[key];
    if (/^[A-Z]/.test(core) && /^[a-z]/.test(out) && !['davening', 'tochacha', 'minyan', 'neshama'].includes(out)) out = out[0].toUpperCase() + out.slice(1);
    if (['davening', 'tochacha', 'minyan', 'neshama', 'navi'].includes(out)) out = out; // keep lowercase
  }
  if (c.startMs >= HASHEM_PRONOUNS_FROM_MS && ['he', 'him', 'his'].includes(key)) {
    out = key[0].toUpperCase() + key.slice(1);
  }
  c.text = lead + pre + out + post;
}

for (let i = 0; i < caps.length - 1; i++) {
  for (const [from, to] of PHRASES) {
    const a = split(caps[i].text), b = split(caps[i + 1].text);
    if (a.core.toLowerCase() === from[0] && b.core.toLowerCase() === from[1]) {
      caps[i].text = a.lead + a.pre + to[0] + a.post;
      caps[i + 1].text = b.lead + b.pre + to[1] + b.post;
    }
  }
}

// "fourteen year old" -> "14-year-old" for consistency on screen
for (let i = 0; i < caps.length - 2; i++) {
  if (/fourteen$/i.test(caps[i].text.trim()) && /^year$/i.test(caps[i + 1].text.trim()) && /^old/i.test(caps[i + 2].text.trim())) {
    caps[i].text = caps[i].text.replace(/fourteen/i, '14-year-old');
    caps[i].endMs = caps[i + 2].endMs;
    caps.splice(i + 1, 2);
  }
}

fs.writeFileSync('src/data/captions.json', JSON.stringify(caps, null, 1));

// Readable transcript, one sentence per line with timings
let line = '', t0 = 0, txt = '';
for (const w of caps) {
  if (!line) t0 = w.startMs;
  line += w.text;
  if (/[.?!]$/.test(w.text)) {
    const s = t0 / 1000;
    txt += `[${String(Math.floor(s / 60)).padStart(1, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}] ${line.trim()}\n`;
    line = '';
  }
}
if (line) txt += line.trim() + '\n';
fs.writeFileSync('transcript.txt', txt);
console.log(`${caps.length} captions written`);
