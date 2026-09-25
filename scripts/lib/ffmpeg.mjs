import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// Fallback when ffmpeg/ffprobe aren't on PATH yet (e.g. just installed via
// `winget install Gyan.FFmpeg` in a shell that hasn't picked up the PATH
// change): FFMPEG_BIN if set, else the winget package folder under the
// current user's LOCALAPPDATA.
function wingetFfmpegBin() {
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  const packages = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Microsoft/WinGet/Packages');
  if (!packages || !existsSync(packages)) return null;
  const pkg = readdirSync(packages).find((d) => d.startsWith('Gyan.FFmpeg'));
  if (!pkg) return null;
  const build = readdirSync(join(packages, pkg)).find((d) => d.startsWith('ffmpeg-'));
  return build ? join(packages, pkg, build, 'bin') : null;
}

function resolveBinary(name) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], { stdio: 'ignore' });
    return name; // on PATH
  } catch {
    const bin = wingetFfmpegBin();
    const fallback = bin && join(bin, process.platform === 'win32' ? `${name}.exe` : name);
    if (fallback && existsSync(fallback)) return fallback;
    throw new Error(
      `${name} not found on PATH or at the expected winget install location. ` +
        `Install it with: winget install --id Gyan.FFmpeg -e`
    );
  }
}

export const FFMPEG = resolveBinary('ffmpeg');
export const FFPROBE = resolveBinary('ffprobe');

export function ffprobeJson(args) {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-print_format', 'json', ...args], {
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

export function runFfmpeg(args, opts = {}) {
  console.log('> ffmpeg', args.join(' '));
  execFileSync(FFMPEG, args, { stdio: 'inherit', ...opts });
}
