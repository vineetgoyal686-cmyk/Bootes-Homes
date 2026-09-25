#!/usr/bin/env node
/**
 * Copies the Draco decoder (used to load house.glb's compressed geometry) from
 * three.js's examples into public/draco/, so it's self-hosted rather than pulled
 * from a CDN at runtime. Re-run after bumping the `three` package version.
 *
 * Usage: node scripts/copy-draco-decoder.mjs
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, '..');

const SRC = path.join(WEB, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
const OUT = path.join(WEB, 'public', 'draco');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(SRC, OUT, { recursive: true });

console.log(`Copied Draco decoder from ${path.relative(WEB, SRC)} to ${path.relative(WEB, OUT)}`);
