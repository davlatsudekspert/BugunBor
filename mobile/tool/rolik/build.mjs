// Builds the BugunBor videos with an Uzbek voice: the phone from the guide
// videos (public/qollanma) on the frames cards.py drew, one narration line per
// step read by Gemini TTS, cut so every step lasts as long as its narration.
//
//   node build.mjs --layout yt|ig [--silent] [--work DIR]
//
// yt: 1920×1080, every guide (the YouTube video). ig: 1080×1920, the short
// cut (Instagram Reels). The voice: TTS_ENGINE=edge (default; Microsoft's free
// Uzbek voices through the edge-tts command, TTS_VOICE=uz-UZ-MadinaNeural or
// uz-UZ-SardorNeural, TTS_RATE like -5%) or TTS_ENGINE=gemini (GEMINI_API_KEY,
// GEMINI_TTS_MODEL, GEMINI_TTS_VOICE, GEMINI_TTS_STYLE). --silent makes the
// same video with silence instead.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..', '..', '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const layout = option('layout', 'yt');
const silent = args.includes('--silent');
const work = path.resolve(option('work', path.join(here, 'work')));
const frames = path.join(work, 'frames', layout);
const ttsDir = path.join(work, 'tts');
const clips = path.join(work, 'clips', layout);
for (const dir of [ttsDir, clips]) fs.mkdirSync(dir, { recursive: true });
fs.rmSync(clips, { recursive: true, force: true });
fs.mkdirSync(clips, { recursive: true });

const plan = JSON.parse(fs.readFileSync(path.join(here, 'plan.json'), 'utf8'));
const PHONE = { yt: { x: 140, y: 80, w: 436, h: 920 }, ig: { x: 204, y: 180, w: 672, h: 1417 } }[layout];
const SOURCE = (slug) => path.join(root, 'public', 'qollanma', `${slug}.mp4`);
const ff = (list) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...list], { stdio: ['ignore', 'inherit', 'inherit'] });
const ENC = ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000'];

// ---- the voice ------------------------------------------------------------

const engine = silent ? 'silent' : process.env.TTS_ENGINE || 'edge';
const model = engine === 'edge' ? 'edge-tts' : process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const voice = engine === 'edge' ? process.env.TTS_VOICE || 'uz-UZ-MadinaNeural' : process.env.GEMINI_TTS_VOICE || 'Kore';
const style = engine === 'edge' ? process.env.TTS_RATE || '+0%' : process.env.GEMINI_TTS_STYLE || '';
const apiKey = process.env.GEMINI_API_KEY;
if (engine === 'gemini' && !apiKey) { console.error('GEMINI_API_KEY is not set (or pass --silent)'); process.exit(2); }

const wavHeader = (pcmBytes, rate = 24000) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcmBytes, 4); header.write('WAVE', 8); header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcmBytes, 40);
  return header;
};
const silence = (seconds) => Buffer.concat([wavHeader(Math.round(seconds * 24000) * 2), Buffer.alloc(Math.round(seconds * 24000) * 2)]);
/** Seconds of a 16-bit mono WAV, from its header. */
const wavSeconds = (buffer) => (buffer.length - 44) / (buffer.readUInt32LE(24) * buffer.readUInt16LE(22) * 2);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function geminiAudio(text) {
  // The interactions API first (newer models), then generateContent (gemini-2.5 TTS).
  const attempts = [
    {
      url: `https://generativelanguage.googleapis.com/v1beta/interactions`,
      body: {
        model,
        input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      },
      pick: (json) => [...(json.steps ?? [])].filter((step) => step.type === 'model_output').flatMap((step) => step.content ?? []).filter((part) => part.type === 'audio').at(-1)?.data,
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      body: {
        contents: [{ parts: [{ text: style ? `${style}: ${text}` : text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      },
      pick: (json) => json.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData?.data,
    },
  ];
  let lastError = 'no answer';
  for (const attempt of attempts) {
    for (let retry = 0; retry < 3; retry++) {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify(attempt.body),
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 429 || response.status >= 500) { lastError = `HTTP ${response.status}`; await sleep(1500 * 2 ** retry); continue; }
      if (!response.ok) { lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`; break; }
      const data = attempt.pick(await response.json());
      if (!data) { lastError = 'no audio in the answer'; break; }
      const bytes = Buffer.from(data, 'base64');
      return bytes.subarray(0, 4).toString() === 'RIFF' ? bytes : Buffer.concat([wavHeader(bytes.length), bytes]);
    }
  }
  throw new Error(`Gemini TTS failed: ${lastError}`);
}

/** Microsoft's voice through the edge-tts command (pip install edge-tts): an MP3, turned into the WAV the cut needs. */
function edgeAudio(text, file) {
  const mp3 = `${file}.mp3`;
  const extra = process.env.HTTPS_PROXY ? ['--proxy', process.env.HTTPS_PROXY] : [];
  execFileSync(process.env.EDGE_TTS || 'edge-tts', ['--voice', voice, `--rate=${style}`, '--text', text, '--write-media', mp3, ...extra], { stdio: ['ignore', 'ignore', 'inherit'] });
  ff(['-i', mp3, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', file]);
  fs.unlinkSync(mp3);
}

async function narration(text) {
  const key = createHash('sha256').update(`${engine}|${model}|${voice}|${style}|${text}`).digest('hex');
  const file = path.join(ttsDir, `${key}.wav`);
  if (fs.existsSync(file)) return file;
  if (engine === 'silent') fs.writeFileSync(file, silence(0.9 + text.length / 16));
  else if (engine === 'edge') edgeAudio(text, file);
  else fs.writeFileSync(file, await geminiAudio(text));
  return file;
}

// ---- the scenes -----------------------------------------------------------

const scenes = [];
scenes.push({ kind: 'card', image: 'intro.png', seconds: 4, say: plan.intro.say, line: plan.intro.say });
const sections = layout === 'yt' ? plan.full : plan.short;
const ordinal = ['Birinchi', 'Ikkinchi', 'Uchinchi', 'To‘rtinchi', 'Beshinchi', 'Oltinchi'];
sections.forEach((key, index) => {
  const section = plan.sections[key];
  const say = layout === 'yt' ? `${ordinal[index]} qism. ${section.title}.` : `${section.who} uchun: ${section.title.toLowerCase()}.`;
  scenes.push({ kind: 'card', image: `section-${key}.png`, seconds: 2.2, say, line: `— ${section.title} —` });
  plan.cues[key].forEach((cue, cueIndex) => {
    if (layout === 'ig' && !cue.short) return;
    scenes.push({ kind: 'clip', src: SOURCE(section.src), from: cue.from, to: cue.to, image: `cue-${key}-${cueIndex}.png`, say: cue.say, line: cue.say });
  });
});
scenes.push({ kind: 'card', image: 'outro.png', seconds: 5, say: plan.outro.say, line: plan.outro.say });

const list = [];
let index = 0;
for (const scene of scenes) {
  const audio = await narration(scene.say);
  const spoken = wavSeconds(fs.readFileSync(audio));
  const out = path.join(clips, `s${String(index++).padStart(3, '0')}.mp4`);
  const image = path.join(frames, scene.image);
  if (scene.kind === 'card') {
    const seconds = Math.max(scene.seconds, spoken + 0.8);
    ff(['-loop', '1', '-t', seconds.toFixed(3), '-i', image, '-i', audio,
      '-filter_complex', `[0:v]fade=t=in:st=0:d=0.4,fade=t=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4,format=yuv420p[v];[1:a]adelay=400|400,apad[a]`,
      '-map', '[v]', '-map', '[a]', '-t', seconds.toFixed(3), ...ENC, out]);
  } else {
    const shown = scene.to - scene.from;
    const seconds = Math.max(shown, spoken + 0.5);
    ff(['-ss', String(scene.from), '-t', shown.toFixed(3), '-i', scene.src, '-loop', '1', '-i', image, '-loop', '1', '-i', path.join(frames, 'mask.png'), '-i', audio,
      '-filter_complex',
      `[0:v]crop=672:1417:204:180,scale=${PHONE.w}:${PHONE.h}:flags=lanczos,format=rgba[p];[2:v]format=gray[m];[p][m]alphamerge[pm];` +
      `[1:v][pm]overlay=${PHONE.x}:${PHONE.y}:format=auto,format=yuv420p,tpad=stop_mode=clone:stop_duration=${(seconds - shown + 1).toFixed(3)}[v];[3:a]apad[a]`,
      '-map', '[v]', '-map', '[a]', '-t', seconds.toFixed(3), ...ENC, out]);
  }
  list.push(out);
  console.log(`${path.basename(out)} ${scene.kind} ${spoken.toFixed(1)}s voice`);
}

fs.writeFileSync(path.join(clips, 'list.txt'), list.map((file) => `file '${file}'`).join('\n') + '\n');
const name = layout === 'yt' ? 'BugunBor-YouTube-16x9' : 'BugunBor-Instagram-9x16';
const video = path.join(work, `${name}.mp4`);
ff(['-f', 'concat', '-safe', '0', '-i', path.join(clips, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', video]);
ff(['-ss', '1.2', '-i', video, '-frames:v', '1', '-q:v', '2', path.join(work, `${name}-muqova.jpg`)]);
fs.writeFileSync(path.join(work, `${name}-matn.txt`), scenes.map((scene) => scene.line).join('\n\n') + '\n');
const total = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString().trim();
console.log(`${name}.mp4: ${Number(total).toFixed(1)} s, ${(fs.statSync(video).size / 1e6).toFixed(1)} MB (${engine}${engine === 'silent' ? '' : `: ${voice}`})`);
