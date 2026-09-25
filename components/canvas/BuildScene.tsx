"use client";

/**
 * eslint-disable react-hooks/immutability -- `gl.localClippingEnabled`,
 * `scene.background` and per-frame material/uniform/camera writes are
 * standard, necessary imperative three.js/R3F mutations (applied in a mount
 * effect or inside useFrame, which runs in R3F's own render loop). There's no
 * declarative equivalent, and this project does not enable `reactCompiler` in
 * next.config.ts, so the compiler-oriented rule doesn't apply here.
 */
/* eslint-disable react-hooks/immutability */

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useHouseLoader } from "@/lib/store/house-loader";
import {
  cloneSceneWithMaterials,
  isGlassMaterial,
  applyGlassTint,
} from "@/lib/three/model-utils";
import { computeFraming } from "@/lib/three/frame-camera";
import { media } from "@/lib/media";

const BLUEPRINT_LINE = new THREE.Color("#2d4fd1");
const CLAY_COLOR = new THREE.Color("#efe9dd");
const BG_BLUEPRINT = new THREE.Color("#f3f1ea");
const BG_SITE = new THREE.Color("#faf9f6");
// Written straight into gl_FragColor (after tone mapping/colour-space
// conversion), so it's raw display RGB rather than a hex-converted Color.
const CUT_COLOR = new THREE.Color().setRGB(0.98, 0.55, 0.22);

// Scroll timeline (0-1 progress through the section):
//  - blueprint lines + clay shell rise with the clip plane
//  - the real textures/colours fade in once the structure is up
//  - camera swings slowly around the house the whole way
const SWEEP_START = 0;
const SWEEP_END = 0.7;
const ORBIT_SWING = 0.7; // radians of azimuth covered over the whole scroll
const BASE_AZIMUTH = 0.6;
const ELEVATION = 0.4;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

interface BuildSceneProps {
  progressRef: MutableRefObject<number>;
}

interface SolidEntry {
  mat: THREE.Material;
}

interface GlassEntry {
  mat: THREE.Material;
  baseOpacity: number;
}

/**
 * Renders its own clone of the house (independent materials from the Hero
 * instance) with:
 *  - a horizontal clipping plane that sweeps bottom-to-top, driven by scroll
 *    progress from the parent's GSAP ScrollTrigger (read via progressRef so this
 *    updates every rendered frame without extra React state/re-renders)
 *  - blueprint edge lines -> clay shell -> the model's real textures, blended
 *    in the shader via one shared uniform
 *  - the cut itself glowing: solids are double-sided, and back faces seen
 *    through the clip opening are painted a hot orange, so the "construction
 *    line" hugs exactly the walls being cut instead of a floating plane
 */
export function BuildScene({ progressRef }: BuildSceneProps) {
  const gltf = useHouseLoader((s) => s.gltf);
  const { camera, scene: threeScene, gl, size } = useThree();

  const bgColorRef = useRef(new THREE.Color());
  const glowLightRef = useRef<THREE.PointLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);

  const built = useMemo(() => {
    if (!gltf) return null;

    const root = cloneSceneWithMaterials(gltf.scene);

    // Single shared Plane + uniform objects: every material references the
    // same instances, so each frame only mutates them once.
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const uniforms = {
      uClay: { value: CLAY_COLOR },
      uReal: { value: 0 },
      uCut: { value: CUT_COLOR },
      uCutAmt: { value: 0 },
    };

    const solids: SolidEntry[] = [];
    const glass: GlassEntry[] = [];
    const wires: THREE.LineBasicMaterial[] = [];

    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];

      for (const mat of mats) {
        mat.clippingPlanes = [plane];
        mat.clipShadows = true;

        if (isGlassMaterial(mat)) {
          glass.push({ mat, baseOpacity: mat.opacity });
          continue;
        }

        mat.side = THREE.DoubleSide;
        mat.transparent = true;
        mat.opacity = 0;
        mat.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
          Object.assign(shader.uniforms, uniforms);
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "void main() {",
              "uniform vec3 uClay;\nuniform float uReal;\nuniform vec3 uCut;\nuniform float uCutAmt;\nvoid main() {"
            )
            .replace(
              "#include <color_fragment>",
              "#include <color_fragment>\ndiffuseColor.rgb = mix(uClay, diffuseColor.rgb, uReal);"
            )
            .replace(
              "#include <dithering_fragment>",
              "#include <dithering_fragment>\nif (!gl_FrontFacing) gl_FragColor.rgb = mix(gl_FragColor.rgb, uCut, uCutAmt);"
            );
        };
        mat.customProgramCacheKey = () => "build-reveal";
        solids.push({ mat });
      }
      applyGlassTint(node);

      // Blueprint edge lines - a child of the mesh itself (identity local
      // transform) so it inherits the mesh's full world transform for free.
      const edges = new THREE.EdgesGeometry(node.geometry, 30);
      const lineMat = new THREE.LineBasicMaterial({
        color: BLUEPRINT_LINE,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        clippingPlanes: [plane],
      });
      node.add(new THREE.LineSegments(edges, lineMat));
      wires.push(lineMat);
    });

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());

    return { root, solids, glass, wires, box, center, plane, uniforms };
  }, [gltf]);

  useEffect(() => {
    if (!built) return;
    return () => {
      built.root.traverse((node) => {
        if (node instanceof THREE.LineSegments) {
          node.geometry.dispose();
          (node.material as THREE.Material).dispose();
        } else if (node instanceof THREE.Mesh) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, [built]);

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  // Re-fit to the canvas's real aspect so a narrow/portrait viewport doesn't
  // crop the house. Aim a little above centre so the house sits below the
  // section heading overlaid at the top.
  const framing = useMemo(() => {
    if (!built) return null;
    const f = computeFraming(built.box, 38, 1.08, size.width / size.height);
    const target = f.center.clone();
    target.y += f.radius * 0.06;
    return { target, distance: f.distance, radius: f.radius };
  }, [built, size.width, size.height]);

  useFrame(() => {
    if (!built || !framing) return;
    const t = progressRef.current;
    const { box, center } = built;
    const height = box.max.y - box.min.y || 1;
    const margin = height * 0.02;

    // Camera: slow orbit tied to scroll.
    const az = BASE_AZIMUTH + (t - 0.5) * ORBIT_SWING;
    const d = framing.distance;
    camera.position.set(
      framing.target.x + d * Math.sin(az) * Math.cos(ELEVATION),
      framing.target.y + d * Math.sin(ELEVATION),
      framing.target.z + d * Math.cos(az) * Math.cos(ELEVATION)
    );
    camera.lookAt(framing.target);

    if (keyLightRef.current) {
      keyLightRef.current.position.set(
        center.x + d * 0.6,
        center.y + d * 0.9,
        center.z + d * 0.25
      );
      keyLightRef.current.target.position.copy(center);
      keyLightRef.current.target.updateMatrixWorld();
    }

    // Clip plane sweep.
    const sweep = smoothstep(SWEEP_START, SWEEP_END, t);
    // Start a little way up so the site base is already there when the
    // section pins, instead of an empty frame.
    const planeY = THREE.MathUtils.lerp(box.min.y + height * 0.1, box.max.y + margin, sweep);
    built.plane.constant = planeY;

    // Clay shell fades in behind the blueprint lines, then the real
    // textures/colours take over once the structure is complete.
    const solidOpacity = smoothstep(0.06, 0.3, t);
    const opaque = solidOpacity >= 0.999;
    for (const { mat } of built.solids) {
      mat.opacity = solidOpacity;
      if (mat.transparent === opaque) {
        mat.transparent = !opaque;
        mat.needsUpdate = true;
      }
    }
    for (const { mat, baseOpacity } of built.glass) {
      mat.opacity = baseOpacity * solidOpacity;
    }
    built.uniforms.uReal.value = smoothstep(0.6, 0.88, t);

    const wireOpacity = 1 - smoothstep(0.35, 0.7, t);
    for (const mat of built.wires) {
      mat.opacity = wireOpacity;
      mat.visible = wireOpacity > 0.001;
    }

    // Orange cut glow only while the plane is actually inside the model.
    const cutAmt = smoothstep(SWEEP_START, SWEEP_START + 0.05, t) * (1 - smoothstep(SWEEP_END - 0.06, SWEEP_END, t));
    built.uniforms.uCutAmt.value = cutAmt;

    bgColorRef.current.lerpColors(BG_BLUEPRINT, BG_SITE, smoothstep(0, 0.5, t));
    threeScene.background = bgColorRef.current;

    if (glowLightRef.current) {
      glowLightRef.current.position.set(center.x, THREE.MathUtils.clamp(planeY, box.min.y, box.max.y) + height * 0.05, center.z);
      glowLightRef.current.intensity = cutAmt * 6;
    }
  });

  if (!built || !framing) return null;

  return (
    <>
      {/* Same lighting recipe as the hero, so the finished house here reads
          with the same saturated colours rather than a flat grey. */}
      <ambientLight intensity={0.15} />
      <hemisphereLight args={["#fff4e6", "#3a3530", 0.45]} />
      <directionalLight
        ref={keyLightRef}
        color="#ffe2c4"
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-framing.radius * 1.2}
        shadow-camera-right={framing.radius * 1.2}
        shadow-camera-top={framing.radius * 1.2}
        shadow-camera-bottom={-framing.radius * 1.2}
        shadow-camera-far={framing.distance * 3}
      />
      <Suspense fallback={null}>
        <Environment files={media.environmentHdri()} environmentIntensity={0.7} />
      </Suspense>

      <primitive object={built.root} />

      <pointLight
        ref={glowLightRef}
        color="#f08a3c"
        intensity={0}
        distance={framing.radius * 2.5}
        decay={2}
      />
    </>
  );
}
