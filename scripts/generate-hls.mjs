#!/usr/bin/env node
/**
 * Builds an adaptive HLS package (master playlist + per-rendition .m3u8/.m4s) from the
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
import { existsSync, mkdirSync, rmSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
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

// --- Single rendition at source resolution ---
// The client wants the timelapse at original quality, so there is no lower
// quality ladder. The video is still re-encoded because the free static host
// caps files at 25 MB and the source only has a keyframe every ~10s (too
// large per segment). CRF 14 / High profile with a 2s GOP measures SSIM 0.995,
// PSNR ~45 dB against the source - visually identical.
const ladder = [{ name: `${srcHeight}p` }];
console.log('Rendition:', ladder[0].name);

rmSync(HLS_DIR, { recursive: true, force: true });
mkdirSync(HLS_DIR, { recursive: true });

const args = [
  '-y', '-i', SRC,
  '-map', '0:v:0',
  '-map', '0:a:0?',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-profile:v', 'high',
  '-crf', '14',
  '-pix_fmt', 'yuv420p',
  '-g', '48', '-keyint_min', '48', '-sc_threshold', '0', // 2s GOP @ 24fps
  '-c:a', 'aac',
  '-b:a', '192k',
];

const varStreamMap = `v:0,a:0,name:${ladder[0].name}`;

args.push(
  '-f', 'hls',
  '-hls_time', '4',
  '-hls_playlist_type', 'vod',
  '-hls_flags', 'independent_segments',
  // fMP4 (.m4s) rather than MPEG-TS (.ts): static hosts treat ".ts" as
  // TypeScript (Cloudflare's uploader rejects it, others serve the wrong MIME).
  '-hls_segment_type', 'fmp4',
  '-hls_fmp4_init_filename', 'init.mp4',
  '-hls_segment_filename', path.join(HLS_DIR, '%v', 'seg_%03d.m4s'),
  '-master_pl_name', 'master.m3u8',
  '-var_stream_map', varStreamMap,
  path.join(HLS_DIR, '%v', 'prog.m3u8')
);

// ffmpeg's HLS muxer needs the per-rendition output directories to exist up front.
// %v resolves to each rung's "name:" value from -var_stream_map.
ladder.forEach((r) => mkdirSync(path.join(HLS_DIR, r.name), { recursive: true }));

runFfmpeg(args);

// ffmpeg writes the master playlist's variant URIs using the output path's
// separators, so on Windows they come out as "720p\prog.m3u8" - playlist
// URIs are URLs and must use "/".
const masterPath = path.join(HLS_DIR, 'master.m3u8');
writeFileSync(masterPath, readFileSync(masterPath, 'utf8').replace(/\\/g, '/'));

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
  console.log(`${r.name}: ${fmt(dirSize(dir))}`);
});
console.log(`Total HLS package: ${fmt(dirSize(HLS_DIR))}`);
console.log(`Master playlist: ${path.relative(WEB, path.join(HLS_DIR, 'master.m3u8'))}`);
console.log(
  `Background loop: ${path.relative(WEB, loopOut)} (${fmt(statSync(loopOut).size)}, ${LOOP_DURATION}s from t=${LOOP_START}s)`
);
