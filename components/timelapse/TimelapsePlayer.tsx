"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import Image from "next/image";
import { media } from "@/lib/media";
import type { TimelapseMark } from "@/data/projects";

export interface TimelapsePlayerHandle {
  /** Start (or jump) playback at `t` seconds, loading the video if needed. */
  playFrom: (t: number) => void;
}

interface TimelapsePlayerProps {
  /** Video time -> real date points (see Project.timelapseDates). */
  marks: TimelapseMark[];
  /** Still shown until the viewer presses play. */
  poster: string;
  /** Called about once a second of video time while playing/scrubbing. */
  onProgress?: (t: number) => void;
  handleRef?: Ref<TimelapsePlayerHandle>;
}

const SPEEDS = [0.5, 1, 1.5, 2, 4, 8];
/** Wheel distance (px) per speed step - trackpads fire many small events. */
const WHEEL_STEP = 80;
/** Pointer travel (px) before a press on the video counts as a drag. */
const DRAG_THRESHOLD = 5;

const toMs = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
const fmtTime = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Pt = { t: number; ms: number };

/** Real date shown by the camera at video time `t` (linear between marks). */
function dateAt(points: Pt[], t: number) {
  if (!points.length) return null;
  if (t <= points[0].t) return points[0].ms;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.t) return a.ms + ((t - a.t) / (b.t - a.t)) * (b.ms - a.ms);
  }
  return points[points.length - 1].ms;
}

/** Video time at which each calendar month starts, for the timeline ticks. */
function monthMarkers(points: Pt[]) {
  if (points.length < 2) return [];
  const first = new Date(points[0].ms);
  const lastMs = points[points.length - 1].ms;
  const out: { label: string; t: number }[] = [];
  for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d.getTime() <= lastMs; d.setMonth(d.getMonth() + 1)) {
    const ms = d.getTime();
    let t = 0;
    if (ms > points[0].ms) {
      const i = points.findIndex((p) => p.ms >= ms);
      const a = points[i - 1];
      const b = points[i];
      t = a.t + ((ms - a.ms) / (b.ms - a.ms)) * (b.t - a.t);
    }
    out.push({ label: d.toLocaleDateString("en-IN", { month: "short" }), t });
  }
  return out;
}

function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}
const PlayIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </Icon>
);
const PauseIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </Icon>
);

/**
 * Inline timelapse player. Nothing downloads until the viewer presses play
 * (the stream is large). Then they can move through the build their own way:
 * drag across the video to scrub, click/drag the month-marked timeline, pick a
 * speed, or scroll over the video in full screen to change speed. A live
 * readout shows the real date on camera.
 *
 * Playback: hls.js for Chrome/Firefox/Edge, native HLS for Safari/iOS.
 * Per-frame UI (progress, time, date) is written straight to the DOM from a
 * rAF loop so scrubbing stays smooth without re-rendering React every frame.
 */
export function TimelapsePlayer({ marks, poster, onProgress, handleRef }: TimelapsePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const pendingStart = useRef(0);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [flash, setFlash] = useState(0); // bumps to re-trigger the speed badge animation
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const points = useMemo(() => marks.map((m) => ({ t: m.t, ms: toMs(m.date) })), [marks]);
  const months = useMemo(() => monthMarkers(points), [points]);
  // Until the video's metadata loads, the last date mark stands in for its
  // length so the timeline (month labels, total time) lays out correctly.
  const total = duration || (points.length ? points[points.length - 1].t : 0);

  const video = () => videoRef.current;

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(Math.max(t, 0), v.duration - 0.05);
  }, []);

  const playFrom = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (v && Number.isFinite(v.duration)) {
        seek(t);
        void v.play();
      } else {
        pendingStart.current = t;
        setStarted(true);
      }
    },
    [seek]
  );
  useImperativeHandle(handleRef, () => ({ playFrom }), [playFrom]);

  const applySpeed = useCallback((next: number) => {
    setSpeed(next);
    setFlash((n) => n + 1);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }, []);

  const stepSpeed = useCallback(
    (dir: 1 | -1) => {
      const current = videoRef.current?.playbackRate ?? 1;
      const idx = SPEEDS.indexOf(current);
      applySpeed(SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, (idx === -1 ? 1 : idx) + dir))]);
    },
    [applySpeed]
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return setStarted(true);
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // --- Source setup, only once the viewer has pressed play ---
  useEffect(() => {
    if (!started) return;
    const v = videoRef.current;
    if (!v) return;
    setBuffering(true);
    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    (async () => {
      const src = media.hlsMaster();
      if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = src;
        return;
      }
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (!Hls.isSupported()) return setError("Video playback isn't supported in this browser.");
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) setError("Couldn't load the video. Please check your connection and try again.");
      });
    })();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [started]);

  // --- Per-frame UI: progress, time, live date ---
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    let lastSecond = -1;
    const tick = () => {
      const v = videoRef.current;
      if (v && Number.isFinite(v.duration) && v.duration > 0) {
        const pct = (v.currentTime / v.duration) * 100;
        if (fillRef.current) fillRef.current.style.width = `${pct}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
        if (timeRef.current) timeRef.current.textContent = `${fmtTime(v.currentTime)} / ${fmtTime(v.duration)}`;
        const ms = dateAt(points, v.currentTime);
        if (dateRef.current && ms !== null) dateRef.current.textContent = fmtDate(ms);
        const second = Math.floor(v.currentTime);
        if (second !== lastSecond) {
          lastSecond = second;
          onProgressRef.current?.(v.currentTime);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, points]);

  // --- Wheel = speed, in full screen only (inline it would hijack page scroll) ---
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !fullscreen) return;
    let acc = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < WHEEL_STEP) return;
      stepSpeed(acc < 0 ? 1 : -1); // scroll up = faster
      acc = 0;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [fullscreen, stepSpeed]);

  // --- Keyboard, while the player has focus ---
  const onKeyDown = (e: ReactKeyboardEvent) => {
    const v = video();
    const handled: Record<string, () => void> = {
      " ": togglePlay,
      k: togglePlay,
      ArrowRight: () => v && seek(v.currentTime + 5),
      ArrowLeft: () => v && seek(v.currentTime - 5),
      ArrowUp: () => stepSpeed(1),
      ArrowDown: () => stepSpeed(-1),
      f: toggleFullscreen,
      m: () => v && (v.muted = !v.muted),
    };
    const fn = handled[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  };

  // --- Drag across the video to scrub; a press without movement toggles play ---
  const drag = useRef<{ x: number; t: number; wasPlaying: boolean; moved: boolean } | null>(null);
  const onStageDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    shellRef.current?.focus({ preventScroll: true });
    const v = video();
    if (!v || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, t: v.currentTime, wasPlaying: !v.paused, moved: false };
  };
  const onStageMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const v = video();
    if (!d || !v || !Number.isFinite(v.duration)) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setScrubbing(true);
      v.pause();
    }
    // Dragging the full width of the video moves through the whole build.
    seek(d.t + (dx / e.currentTarget.getBoundingClientRect().width) * v.duration);
  };
  const onStageUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) togglePlay();
    else {
      setScrubbing(false);
      if (d.wasPlaying) void video()?.play();
    }
  };

  // --- Timeline: click or drag to seek, hover to preview the date ---
  const trackTime = (clientX: number) => {
    const el = trackRef.current;
    const v = video();
    if (!el || !v || !Number.isFinite(v.duration)) return null;
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return { x: frac * r.width, t: frac * v.duration };
  };
  const trackDrag = useRef<{ wasPlaying: boolean } | null>(null);
  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const v = video();
    const p = trackTime(e.clientX);
    if (!v || !p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    trackDrag.current = { wasPlaying: !v.paused };
    setScrubbing(true);
    v.pause();
    seek(p.t);
  };
  const onTrackMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = trackTime(e.clientX);
    setHover(p);
    if (trackDrag.current && p) seek(p.t);
  };
  const onTrackUp = () => {
    const d = trackDrag.current;
    trackDrag.current = null;
    if (!d) return;
    setScrubbing(false);
    if (d.wasPlaying) void video()?.play();
  };

  const hoverDate = hover ? dateAt(points, hover.t) : null;

  return (
    <div
      ref={shellRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      aria-label="Construction timelapse player"
      className={`flex flex-col gap-3 rounded-3xl bg-[#0b0e1a] p-2.5 shadow-2xl outline-none sm:p-3 ${
        fullscreen ? "h-full justify-center rounded-none p-6" : ""
      }`}
    >
      {/* Video stage */}
      <div
        ref={stageRef}
        onPointerDown={started ? onStageDown : undefined}
        onPointerMove={started ? onStageMove : undefined}
        onPointerUp={started ? onStageUp : undefined}
        onPointerCancel={started ? onStageUp : undefined}
        className={`group relative w-full select-none overflow-hidden rounded-2xl bg-black ${
          fullscreen ? "min-h-0 flex-1" : "aspect-video"
        } ${started ? `touch-none ${scrubbing ? "cursor-grabbing" : "cursor-grab"}` : ""}`}
      >
        {started && (
          <video
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration);
              // Loading a new source resets the rate; keep the chosen one.
              e.currentTarget.playbackRate = speed;
              if (pendingStart.current > 0) e.currentTarget.currentTime = pendingStart.current;
            }}
            className="pointer-events-none h-full w-full object-contain"
          />
        )}

        {!started ? (
          <button
            type="button"
            onClick={() => playFrom(0)}
            aria-label="Play the timelapse"
            className="absolute inset-0 block"
          >
            <Image src={poster} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-85 transition duration-700 group-hover:scale-[1.03]" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
            <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-foreground shadow-xl transition-transform duration-300 group-hover:scale-110 sm:h-24 sm:w-24">
              <PlayIcon className="ml-1 h-9 w-9 sm:h-10 sm:w-10" />
            </span>
          </button>
        ) : (
          <>
            {/* Live date on camera */}
            <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-black/55 px-3 py-2 backdrop-blur-md sm:left-4 sm:top-4">
              <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-white/60">On site</p>
              <span ref={dateRef} className="font-display text-base text-white tabular-nums sm:text-xl">
                {points.length ? fmtDate(points[0].ms) : ""}
              </span>
            </div>

            <span
              key={flash}
              aria-live="polite"
              className="pointer-events-none absolute right-3 top-3 animate-[speed-flash_1.2s_ease-out] rounded-full bg-black/55 px-3 py-1.5 font-sans text-sm font-medium text-white backdrop-blur-md sm:right-4 sm:top-4"
            >
              {speed}×
            </span>

            {error ? (
              <p className="absolute inset-0 flex items-center justify-center p-8 text-center font-sans text-white/70">{error}</p>
            ) : buffering ? (
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            ) : (
              !playing &&
              !scrubbing && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-xl sm:h-20 sm:w-20">
                  <PlayIcon className="ml-1 h-8 w-8" />
                </span>
              )
            )}

            <span className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1 font-sans text-xs text-white/80 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 sm:block">
              {fullscreen ? "Drag to move through time · Scroll to change speed" : "Drag across the video to move through time"}
            </span>
          </>
        )}
      </div>

      {/* Timeline */}
      <div className={`px-2 ${started ? "" : "pointer-events-none opacity-50"}`}>
        <div
          ref={trackRef}
          onPointerDown={onTrackDown}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
          onPointerLeave={() => !trackDrag.current && setHover(null)}
          className="group/track relative flex h-6 cursor-pointer touch-none items-center"
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15 transition-[height] group-hover/track:h-2">
            <div ref={fillRef} className="absolute inset-y-0 left-0 w-0 rounded-full bg-gradient-to-r from-accent to-accent-cyan" />
          </div>
          {total > 0 &&
            months.map((m) => (
              <span
                key={m.label}
                className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/40"
                style={{ left: `${(m.t / total) * 100}%` }}
              />
            ))}
          <div
            ref={thumbRef}
            className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform group-hover/track:scale-110"
          />
          {hover && hoverDate !== null && (
            <span
              className="pointer-events-none absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 font-sans text-xs font-medium text-foreground shadow-lg"
              style={{ left: hover.x }}
            >
              {fmtDate(hoverDate)} · {fmtTime(hover.t)}
            </span>
          )}
        </div>
        <div className="relative h-5">
          {months.map((m, i) => (
            <span
              key={m.label}
              // A label sitting close to the next one is hidden on narrow
              // screens (e.g. Jan right before Feb) so they don't overlap.
              className={`absolute top-0 -translate-x-1/2 font-sans text-[11px] text-white/50 first:translate-x-0 ${
                total > 0 && i < months.length - 1 && (months[i + 1].t - m.t) / total < 0.1 ? "hidden sm:inline" : ""
              }`}
              style={{ left: `${total > 0 ? (m.t / total) * 100 : 0}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 pb-1 text-white">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground transition-transform hover:scale-105"
        >
          {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
        </button>
        <span ref={timeRef} className="font-sans text-sm tabular-nums text-white/70">
          0:00 / {fmtTime(total)}
        </span>

        <div role="group" aria-label="Playback speed" className="ml-auto flex items-center gap-0.5 rounded-full bg-white/10 p-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => applySpeed(s)}
              aria-pressed={speed === s}
              className={`rounded-full px-2 py-1 font-sans text-xs font-medium transition-colors sm:px-2.5 ${
                speed === s ? "bg-white text-foreground" : "text-white/70 hover:text-white"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const v = video();
            if (v) v.muted = !v.muted;
            else setMuted((m) => !m);
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <Icon className="h-[18px] w-[18px]">
            {muted ? (
              <path d="M4 9h3.5L12 5v14l-4.5-4H4zm12.3.3 1.4-1.4L19.8 10l2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1z" />
            ) : (
              <path d="M4 9h3.5L12 5v14l-4.5-4H4zm11.5-1.8a6.5 6.5 0 0 1 0 9.6l-1.4-1.4a4.5 4.5 0 0 0 0-6.8zm2.8-2.8a10.5 10.5 0 0 1 0 15.2l-1.4-1.4a8.5 8.5 0 0 0 0-12.4z" />
            )}
          </Icon>
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <Icon className="h-[18px] w-[18px]">
            <path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z" />
          </Icon>
        </button>
      </div>
    </div>
  );
}
