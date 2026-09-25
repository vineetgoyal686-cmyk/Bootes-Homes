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

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrbitControlsHandle = any;
import { useHouseLoader } from "@/lib/store/house-loader";
import {
  cloneSceneWithMaterials,
  isGlassMaterial,
  applyGlassTint,
} from "@/lib/three/model-utils";
import { computeFraming } from "@/lib/three/frame-camera";
import { media } from "@/lib/media";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

const BLUEPRINT_LINE = new THREE.Color("#2d4fd1");
const CLAY_COLOR = new THREE.Color("#efe9dd");
// Written straight into gl_FragColor (after tone mapping/colour-space
// conversion), so it's raw display RGB rather than a hex-converted Color.
const CUT_COLOR = new THREE.Color().setRGB(0.98, 0.55, 0.22);

// Build timeline (t: 0-1 over BUILD_SECONDS, plays once on mount):
//  - blueprint lines + clay shell rise with the clip plane
//  - the real textures/colours fade in once the structure is up
// The camera auto-orbits the whole time (OrbitControls autoRotate) and can be
// dragged with a mouse at any point.
const START_DELAY = 0.8; // s - lets the hero's fade-in finish first
const BUILD_SECONDS = 8;
const SWEEP_START = 0;
const SWEEP_END = 0.7;
const AUTO_ROTATE_SPEED = 0.35; // OrbitControls units (1 = one turn per 30s)
const AUTO_ROTATE_RAD_PER_S = ((2 * Math.PI) / 60) * AUTO_ROTATE_SPEED; // same, for touch
const BASE_AZIMUTH = 0.35;
const ELEVATION = 0.4;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

interface SolidEntry {
  mat: THREE.Material;
}

interface GlassEntry {
  mat: THREE.Material;
  baseOpacity: number;
}

/**
 * The hero's house, building itself from the ground up when it mounts:
 *  - a horizontal clipping plane that sweeps bottom-to-top over BUILD_SECONDS
 *    (skipped straight to the finished house under reduced motion)
 *  - blueprint edge lines -> clay shell -> the model's real textures, blended
 *    in the shader via one shared uniform
 *  - the cut itself glowing: solids are double-sided, and back faces seen
 *    through the clip opening are painted a hot orange, so the "construction
 *    line" hugs exactly the walls being cut instead of a floating plane
 */
export function BuildScene() {
  const gltf = useHouseLoader((s) => s.gltf);
  const { camera, gl, size } = useThree();
  const reducedMotion = useReducedMotion();

  // Drag-to-rotate only with a mouse/trackpad: on touch screens the canvas
  // fills the hero, and OrbitControls grabbing touches would stop the page
  // from scrolling - there the orbit is driven manually in useFrame instead.
  const finePointer = useMediaQuery("(pointer: fine)");
  const controlsRef = useRef<OrbitControlsHandle>(null);
  const startRef = useRef<number | null>(null);
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
      const mats = Array.isArray(node.material)
        ? node.material
        : [node.material];

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
        mat.onBeforeCompile = (
          shader: THREE.WebGLProgramParametersWithUniforms,
        ) => {
          Object.assign(shader.uniforms, uniforms);
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "void main() {",
              "uniform vec3 uClay;\nuniform float uReal;\nuniform vec3 uCut;\nuniform float uCutAmt;\nvoid main() {",
            )
            .replace(
              "#include <color_fragment>",
              "#include <color_fragment>\ndiffuseColor.rgb = mix(uClay, diffuseColor.rgb, uReal);",
            )
            .replace(
              "#include <dithering_fragment>",
              "#include <dithering_fragment>\nif (!gl_FrontFacing) gl_FragColor.rgb = mix(gl_FragColor.rgb, uCut, uCutAmt);",
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
          const mats = Array.isArray(node.material)
            ? node.material
            : [node.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, [built]);

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  // Re-fit to the canvas's real aspect so a narrow/portrait viewport doesn't
  // crop the house. The fit is sphere-based, which already leaves slack around
  // a box-shaped house at any orbit angle, so only a small margin is added.
  const framing = useMemo(() => {
    if (!built) return null;
    const f = computeFraming(built.box, 32, 1.02, size.width / size.height);
    return { target: f.center.clone(), distance: f.distance, radius: f.radius };
  }, [built, size.width, size.height]);

  // Initial camera placement; after this the orbit (OrbitControls, or the
  // manual one below on touch screens) moves it.
  useEffect(() => {
    if (!framing) return;
    const d = framing.distance;
    camera.position.set(
      framing.target.x + d * Math.sin(BASE_AZIMUTH) * Math.cos(ELEVATION),
      framing.target.y + d * Math.sin(ELEVATION),
      framing.target.z + d * Math.cos(BASE_AZIMUTH) * Math.cos(ELEVATION),
    );
    camera.lookAt(framing.target);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(framing.target);
      controls.update();
    }
  }, [framing, camera, finePointer]);

  const lightDir = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    if (!built || !framing) return;
    if (!finePointer && !reducedMotion) {
      camera.position.sub(framing.target);
      camera.position.applyAxisAngle(
        THREE.Object3D.DEFAULT_UP,
        AUTO_ROTATE_RAD_PER_S * delta,
      );
      camera.position.add(framing.target);
      camera.lookAt(framing.target);
    }
    if (startRef.current === null)
      startRef.current = clock.elapsedTime + START_DELAY;
    const elapsed = clock.elapsedTime - startRef.current;
    const t = reducedMotion
      ? 1
      : THREE.MathUtils.clamp(elapsed / BUILD_SECONDS, 0, 1);
    const { box, center } = built;
    const height = box.max.y - box.min.y || 1;
    const margin = height * 0.02;

    // Key light follows the camera round (from above and a little to one
    // side), so whichever face is towards the viewer is lit - a fixed light
    // left the far side of the house almost black once it rotated round.
    const d = framing.distance;
    if (keyLightRef.current) {
      lightDir
        .set(camera.position.x - center.x, 0, camera.position.z - center.z)
        .normalize();
      lightDir.applyAxisAngle(THREE.Object3D.DEFAULT_UP, 0.6);
      keyLightRef.current.position.set(
        center.x + lightDir.x * d * 0.7,
        center.y + d * 0.9,
        center.z + lightDir.z * d * 0.7,
      );
      keyLightRef.current.target.position.copy(center);
      keyLightRef.current.target.updateMatrixWorld();
    }

    // Clip plane sweep.
    const sweep = smoothstep(SWEEP_START, SWEEP_END, t);
    const planeY = THREE.MathUtils.lerp(box.min.y, box.max.y + margin, sweep);
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
    const cutAmt =
      smoothstep(SWEEP_START, SWEEP_START + 0.05, t) *
      (1 - smoothstep(SWEEP_END - 0.06, SWEEP_END, t));
    built.uniforms.uCutAmt.value = cutAmt;

    if (glowLightRef.current) {
      glowLightRef.current.position.set(
        center.x,
        THREE.MathUtils.clamp(planeY, box.min.y, box.max.y) + height * 0.05,
        center.z,
      );
      glowLightRef.current.intensity = cutAmt * 6;
    }
  });

  if (!built || !framing) return null;

  return (
    <>
      {/* Strong shadowed key light + moderate fill/IBL, so the finished house
          reads with saturated colours rather than a flat, washed-out grey. */}
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
        <Environment
          files={media.environmentHdri()}
          environmentIntensity={0.7}
        />
      </Suspense>

      <primitive object={built.root} />

      {finePointer && (
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          autoRotate={!reducedMotion}
          autoRotateSpeed={AUTO_ROTATE_SPEED}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.1}
        />
      )}

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
