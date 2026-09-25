#!/usr/bin/env node
/**
 * Extracts an evenly-spaced image sequence from the construction timelapse for the
 * scroll-scrubbed "Apple-style" canvas section. Produces two sets:
 *   - desktop: source width (capped at 1920px)
 *   - mobile:  ~960px wide
 * Also writes two poster stills (first + last frame) for fast first paint / OG images.
 *
 * Never touches the source video - reads it, writes only into web/public/media/.
 *
 * Usage: node scripts/extract-frames.mjs [--frames=150]
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ffprobeJson, runFfmpeg } from './lib/ffmpeg.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // d:/Homes
const WEB = path.resolve(__dirname, '..'); // d:/Homes/web

const SRC = path.join(ROOT, 'timelapse_20250530_720p.mp4');
const FRAMES_ROOT = path.join(WEB, 'public', 'media', 'frames');
const POSTERS_DIR = path.join(WEB, 'public', 'media', 'posters');

const frameCountArg = process.argv.find((a) => a.startsWith('--frames='));
const FRAME_COUNT = frameCountArg ? parseInt(frameCountArg.split('=')[1], 10) : 150;

if (!existsSync(SRC)) {
  console.error(`Source video not found at ${SRC}`);
  process.exit(1);
}

// --- probe source ---
const probe = ffprobeJson([
  '-show_entries', 'format=duration',
  '-show_entries', 'stream=width,height,codec_type',
  SRC,
]);
const vStream = probe.streams.find((s) => s.codec_type === 'video');
const duration = parseFloat(probe.format.duration);
const srcWidth = vStream.width;
const srcHeight = vStream.height;

console.log(`Source: ${srcWidth}x${srcHeight}, ${duration.toFixed(2)}s`);

// NOTE: spec asked for "1920px wide or source width if smaller" (source is 1280px
// here) at WebP q~80, but this footage is a noisy real photo/timelapse (dust, gravel,
// fine texture) rather than a clean render - at 1280px/q80 each frame came out
// ~230KB, i.e. ~34MB for the 150-frame desktop set alone before the user has
// scrolled at all. That directly conflicts with the "mobile 4G in India" performance
// requirement, so this deliberately trims resolution/quality instead: 1024px/q50
// (~108KB/frame) for desktop and 640px/q50 (~45KB/frame) for mobile. Combined with
// progressive/windowed loading (only frames near the current scroll position are
// fetched, see Phase 3) this keeps the section fast without a visible quality hit at
// typical viewport sizes. Revisit if the client wants sharper frames and accepts the
// extra weight.
const desktopWidth = Math.min(1024, srcWidth);
const mobileWidth = 640;
const WEBP_QUALITY = 50;

const fps = FRAME_COUNT / duration;

function extractSet(name, width) {
  const outDir = path.join(FRAMES_ROOT, name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  runFfmpeg([
    '-y',
    '-i', SRC,
    '-vf', `fps=${fps},scale=${width}:-2:flags=lanczos`,
    '-frames:v', String(FRAME_COUNT),
    '-c:v', 'libwebp',
    '-q:v', String(WEBP_QUALITY),
    '-compression_level', '6',
    '-an',
    path.join(outDir, 'frame_%04d.webp'),
  ]);

  const files = readdirSync(outDir).filter((f) => f.endsWith('.webp'));
  const totalBytes = files.reduce((sum, f) => sum + statSync(path.join(outDir, f)).size, 0);
  return { count: files.length, totalBytes, outDir };
}

function extractPosters() {
  mkdirSync(POSTERS_DIR, { recursive: true });
  const startOut = path.join(POSTERS_DIR, 'poster-start.jpg');
  const endOut = path.join(POSTERS_DIR, 'poster-end.jpg');

  // Posters use the full source width/quality (they're single, cacheable images, not
  // a 150x-multiplied set) for the best first-paint / OG-image impression.
  const posterWidth = Math.min(1920, srcWidth);

  // First frame
  runFfmpeg([
    '-y', '-i', SRC,
    '-vf', `scale=${posterWidth}:-2`,
    '-frames:v', '1', '-update', '1', '-q:v', '3',
    startOut,
  ]);
  // Last frame: seek near the end and grab the last decodable frame
  runFfmpeg([
    '-y',
    '-sseof', '-2',
    '-i', SRC,
    '-vf', `scale=${posterWidth}:-2`,
    '-frames:v', '1', '-update', '1',
    '-q:v', '3',
    endOut,
  ]);

  return { startOut, endOut };
}

const desktop = extractSet('desktop', desktopWidth);
const mobile = extractSet('mobile', mobileWidth);
const posters = extractPosters();

function fmt(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

console.log('\n--- Frame extraction report ---');
console.log(`Requested frame count: ${FRAME_COUNT} (fps=${fps.toFixed(4)})`);
console.log(`Desktop (${desktopWidth}px wide): ${desktop.count} frames, ${fmt(desktop.totalBytes)} total`);
console.log(`Mobile  (${mobileWidth}px wide): ${mobile.count} frames, ${fmt(mobile.totalBytes)} total`);
console.log(`Poster start: ${path.relative(WEB, posters.startOut)} (${fmt(statSync(posters.startOut).size)})`);
console.log(`Poster end:   ${path.relative(WEB, posters.endOut)} (${fmt(statSync(posters.endOut).size)})`);
