#!/usr/bin/env node
/**
 * Converts the raw GT_gltf/1.gltf export (SimLab/Revit export, spec/gloss materials,
 * ~4 MB of loose files) into a single compressed .glb for the web.
 *
 * Pipeline:
 *   1. metalrough  - convert KHR_materials_pbrSpecularGlossiness -> metallic/roughness
 *                    (spec/gloss is deprecated and not what three.js/R3F expects)
 *   2. optimize    - dedup, weld, instance repeated meshes (doors/windows repeat
 *                    hundreds of times in this model), Draco-compress geometry,
 *                    resize + WebP-compress textures, prune unused data
 *
 * Never touches the source GT_gltf/ folder - reads it, writes only into
 * web/public/models/ and a scratch tmp file that gets deleted after.
 *
 * Usage: node scripts/convert-model.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // d:/Homes
const WEB = path.resolve(__dirname, '..'); // d:/Homes/web

const SRC = path.join(ROOT, 'GT_gltf', '1.gltf');
const OUT_DIR = path.join(WEB, 'public', 'models');
const PRUNED = path.join(OUT_DIR, '_tmp_pruned.glb');
const TMP = path.join(OUT_DIR, '_tmp_metalrough.glb');
const OUT = path.join(OUT_DIR, 'house.glb');

// Revit/SimLab exports carry annotation and helper elements that aren't part of
// the physical building - text callouts, room-separation planning lines, camera
// helpers. They're invisible/irrelevant in a walkthrough, but worse: their
// geometry can sit far outside the building envelope (a text label positioned
// well above the roof, a camera target dozens of units away), which silently
// blows up the model's bounding box. Anything downstream that fits a camera or
// a clipping plane to that bbox - the build-reveal scroll section in
// particular - breaks in a way that's easy to miss visually until you scrub
// through it. Strip these node categories before optimizing.
const ANNOTATION_NAME_PATTERNS = [
  /^Model (Text|Lines)/i,
  /^<Room Separation>/i,
  /^Camera-/i,
];

function isAnnotationNode(name) {
  return Boolean(name) && ANNOTATION_NAME_PATTERNS.some((p) => p.test(name));
}

// Invoke the CLI's JS entry point directly with `node`, rather than the .cmd/.sh
// shim, so we never need shell:true (which would leave args unescaped on Windows).
const CLI_JS = path.join(WEB, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');

function run(args) {
  console.log('>', 'gltf-transform', args.join(' '));
  execFileSync(process.execPath, [CLI_JS, ...args], { stdio: 'inherit' });
}

function sizeOf(p) {
  return statSync(p).size;
}

function fmt(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

if (!existsSync(SRC)) {
  console.error(`Source model not found at ${SRC}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// Sum of the original loose files (.gltf + .bin + all textures) for a fair before/after.
const GT_DIR = path.join(ROOT, 'GT_gltf');
function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(p);
    else total += statSync(p).size;
  }
  return total;
}
const before = dirSize(GT_DIR);

// Step 0: strip annotation/helper nodes (see ANNOTATION_NAME_PATTERNS above)
async function pruneAnnotationNodes() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.read(SRC);
  const root = document.getRoot();

  let removed = 0;
  for (const node of root.listNodes()) {
    if (isAnnotationNode(node.getName())) {
      node.dispose();
      removed += 1;
    }
  }
  console.log(`Removed ${removed} annotation/helper node(s) before optimizing.`);

  await document.transform(prune());
  await io.write(PRUNED, document);
}
await pruneAnnotationNodes();

// Step 1: spec/gloss -> metal/rough
run(['metalrough', PRUNED, TMP]);
rmSync(PRUNED, { force: true });

// Step 2: full optimization pass
run([
  'optimize',
  TMP,
  OUT,
  '--compress', 'draco',
  '--texture-compress', 'webp',
  '--texture-size', '1024',
  // GPU instancing (EXT_mesh_gpu_instancing) is deliberately OFF: on this model
  // it corrupts the transform of at least one instanced mesh, stretching it far
  // above the real roofline (verified: an isolated `--instance true` run alone
  // produced a mesh spanning Y 10.9-45.6 that doesn't exist at that height in
  // the source; disabling it drops the bad geometry and costs only ~35KB extra
  // in the final .glb). Revisit if a future gltf-transform version fixes this.
  '--instance', 'false',
]);

rmSync(TMP, { force: true });

const after = sizeOf(OUT);

console.log('\n--- Model conversion report ---');
console.log(`Source (GT_gltf/ total):  ${fmt(before)}`);
console.log(`Output (house.glb):       ${fmt(after)}`);
console.log(`Reduction:                ${(100 - (after / before) * 100).toFixed(1)}%`);
console.log(`Written to: ${path.relative(WEB, OUT)}`);
