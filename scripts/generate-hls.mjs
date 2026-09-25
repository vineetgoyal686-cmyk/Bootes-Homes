#!/usr/bin/env node
/**
 * Builds an adaptive HLS package (master playlist + per-rendition .m3u8/.ts) from the
 * full construction timelapse, plus a short muted background-loop MP4.
 *
 * Source is 1280x720 - "keep original quality" plus lower renditions "only if below
 * source" means the ladder here is 720p (source, high bitrate) + 480p (down-res, low
 * bitrate). 1080p is skipped because it would be upscaling past the source.
 *
 * Never touches the source video - reads it, writes only into web/public/media/.
 *
 * Usage: node scripts/generate-hls.mjs
 */
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ffprobeJson, runFfmpeg } from './lib/ffmpeg.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.resolve(__dirname, '..');

const SRC = path.join(ROOT, 'timelapse_20250530_720p.mp4');
const HLS_DIR = path.join(WEB, 'public', 'media', 'hls');
const VIDEO_DIR = path.join(WEB, 'public', 'media', 'video');

if (!existsSync(SRC)) {
  console.error(`Source video not found at ${SRC}`);
  process.exit(1);
}

const probe = ffprobeJson([
  '-show_entries', 'format=duration',
  '-show_entries', 'stream=width,height,codec_type',
  SRC,
]);
const vStream = probe.streams.find((s) => s.codec_type === 'video');
const duration = parseFloat(probe.format.duration);
const srcWidth = vStream.width;
const srcHeight = vStream.height;

console.log(`Source: ${srcWidth}x${srcHeight}, ${duration.toFixed(1)}s`);

// --- Rendition ladder ---
// Only include rungs at or below source resolution.
const CANDIDATE_LADDER = [
  { name: '1080p', height: 1080, videoBitrate: '8000k', maxrate: '8560k', bufsize: '12000k', audioBitrate: '160k' },
  { name: '720p', height: 720, videoBitrate: '5000k', maxrate: '5350k', bufsize: '7500k', audioBitrate: '128k' },
  { name: '480p', height: 480, videoBitrate: '1800k', maxrate: '1926k', bufsize: '2700k', audioBitrate: '96k' },
];
const ladder = CANDIDATE_LADDER.filter((r) => r.height <= srcHeight);
// Always include the source resolution itself at the high end, even if it doesn't
// exactly match a named rung (here it happens to match 720p).
if (!ladder.some((r) => r.height === srcHeight)) {
  ladder.unshift({
    name: `${srcHeight}p-source`,
    height: srcHeight,
    videoBitrate: '6000k',
    maxrate: '6420k',
    bufsize: '9000k',
    audioBitrate: '128k',
  });
}

console.log('Rendition ladder:', ladder.map((r) => r.name).join(', '));

rmSync(HLS_DIR, { recursive: true, force: true });
mkdirSync(HLS_DIR, { recursive: true });

// Build a -filter_complex that splits the input into N scaled outputs, one per rung.
const splitLabels = ladder.map((_, i) => `[v${i}]`).join('');
const scaleFilters = ladder
  .map((r, i) => `[v${i}]scale=-2:${r.height}:flags=lanczos[v${i}out]`)
  .join(';');
const filterComplex = `[0:v]split=${ladder.length}${splitLabels};${scaleFilters}`;

const args = ['-y', '-i', SRC, '-filter_complex', filterComplex];

ladder.forEach((r, i) => {
  args.push(
    '-map', `[v${i}out]`,
    '-map', '0:a:0?',
    `-c:v:${i}`, 'libx264',
    '-preset', 'veryfast',
    '-profile:v', 'main',
    '-g', '96', '-keyint_min', '96', '-sc_threshold', '0', // 4s GOP @ 24fps
    `-b:v:${i}`, r.videoBitrate,
    `-maxrate:${i}`, r.maxrate,
    `-bufsize:${i}`, r.bufsize,
    `-c:a:${i}`, 'aac',
    `-b:a:${i}`, r.audioBitrate,
    '-ac', '2',
  );
});

const varStreamMap = ladder.map((_, i) => `v:${i},a:${i},name:${ladder[i].name}`).join(' ');

args.push(
  '-f', 'hls',
  '-hls_time', '4',
  '-hls_playlist_type', 'vod',
  '-hls_flags', 'independent_segments',
  '-hls_segment_type', 'mpegts',
  '-hls_segment_filename', path.join(HLS_DIR, '%v', 'seg_%03d.ts'),
  '-master_pl_name', 'master.m3u8',
  '-var_stream_map', varStreamMap,
  path.join(HLS_DIR, '%v', 'prog.m3u8')
);

// ffmpeg's HLS muxer needs the per-rendition output directories to exist up front.
// %v resolves to each rung's "name:" value from -var_stream_map.
ladder.forEach((r) => mkdirSync(path.join(HLS_DIR, r.name), { recursive: true }));

runFfmpeg(args);

// --- Short muted background loop (for hero/other non-fullscreen backgrounds) ---
mkdirSync(VIDEO_DIR, { recursive: true });
const loopOut = path.join(VIDEO_DIR, 'bg-loop.mp4');
const LOOP_START = Math.min(55, Math.max(0, duration - 8));
const LOOP_DURATION = 6;

runFfmpeg([
  '-y',
  '-ss', String(LOOP_START),
  '-i', SRC,
  '-t', String(LOOP_DURATION),
  '-vf', `scale=-2:${Math.min(720, srcHeight)}:flags=lanczos`,
  '-an',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '28',
  '-profile:v', 'main',
  '-movflags', '+faststart',
  loopOut,
]);

// --- Report ---
function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(p);
    else total += statSync(p).size;
  }
  return total;
}
function fmt(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

console.log('\n--- HLS generation report ---');
ladder.forEach((r) => {
  const dir = path.join(HLS_DIR, r.name);
  console.log(`${r.name}: ${fmt(dirSize(dir))} (target ${r.videoBitrate} video)`);
});
console.log(`Total HLS package: ${fmt(dirSize(HLS_DIR))}`);
console.log(`Master playlist: ${path.relative(WEB, path.join(HLS_DIR, 'master.m3u8'))}`);
console.log(
  `Background loop: ${path.relative(WEB, loopOut)} (${fmt(statSync(loopOut).size)}, ${LOOP_DURATION}s from t=${LOOP_START}s)`
);
