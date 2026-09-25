/**
 * Single source of truth for every media URL on the site.
 *
 * Today, assets are served from `web/public/` (model, frames, HLS, posters, video).
 * When the project outgrows Vercel's free-plan bandwidth, the same folder layout
 * gets uploaded to a Cloudflare R2 bucket and `NEXT_PUBLIC_MEDIA_BASE_URL` is set to
 * that bucket's public URL - no code changes needed, only the env var.
 */

const RAW_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? '';
// Strip any trailing slash so `${BASE}${path}` never produces a double slash.
const MEDIA_BASE_URL = RAW_BASE.replace(/\/$/, '');

/** Prefixes a root-relative path (e.g. "/models/house.glb") with the media base URL. */
function assetUrl(rootRelativePath: string): string {
  const clean = rootRelativePath.startsWith('/') ? rootRelativePath : `/${rootRelativePath}`;
  return `${MEDIA_BASE_URL}${clean}`;
}

export const FRAME_COUNT = 150;

/** Zero-pads a 1-based frame index to the `frame_0001.webp` naming used by the pipeline. */
function frameFileName(index: number): string {
  return `frame_${String(index).padStart(4, '0')}.webp`;
}

export const media = {
  logo: {
    /** Full "BOOTES" lockup (mark + wordmark), transparent PNG. */
    full: () => assetUrl('/logo/bootes-logo.png'),
    /** Mark only (the "B"), for tight spaces / favicon-adjacent uses. */
    mark: () => assetUrl('/logo/bootes-mark.png'),
  },

  /** Compressed house model (see scripts/convert-model.mjs). */
  houseModel: () => assetUrl('/models/house.glb'),

  /** Draco decoder files, self-hosted from three/examples (see app root layout). */
  dracoDecoderPath: () => assetUrl('/draco/'),

  /** Hero environment lighting, self-hosted rather than fetched from a CDN at
   * runtime (was drei's "sunset" preset, ~1.4MB, cached after first load). */
  environmentHdri: () => assetUrl('/hdri/venice_sunset_1k.hdr'),

  posters: {
    start: () => assetUrl('/media/posters/poster-start.jpg'),
    end: () => assetUrl('/media/posters/poster-end.jpg'),
  },

  /** Stage photos for the project journey (see data/projects.ts `journey`).
   * `bg` is a tiny version used as a blurred backdrop behind the photo. */
  journey: (name: string, variant: 'full' | 'bg' = 'full') =>
    assetUrl(`/media/journey/${name}${variant === 'bg' ? '-bg' : ''}.webp`),

  /** Short muted looping clip for non-hero backgrounds. */
  bgLoop: () => assetUrl('/media/video/bg-loop.mp4'),

  /** Adaptive HLS package for the full "watch full timelapse" modal player. */
  hlsMaster: () => assetUrl('/media/hls/master.m3u8'),

  /**
   * Scroll-scrubbed image sequence (see scripts/extract-frames.mjs). `device` picks
   * the pre-generated resolution set; `index` is 1-based, 1..FRAME_COUNT.
   */
  frame: (device: 'desktop' | 'mobile', index: number) =>
    assetUrl(`/media/frames/${device}/${frameFileName(index)}`),

  frameCount: FRAME_COUNT,
};

export type MediaDevice = 'desktop' | 'mobile';
