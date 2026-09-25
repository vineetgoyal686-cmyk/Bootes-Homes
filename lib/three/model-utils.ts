import * as THREE from "three";

/**
 * Deep-clones a loaded glTF scene including per-mesh materials (Object3D.clone()
 * only clones the node hierarchy - materials/geometries stay shared by reference).
 * Each 3D section (hero, build-reveal, future x-ray view) needs its own material
 * instances so animating one doesn't affect the others. Geometry is left shared
 * since nothing here mutates it.
 */
export function cloneSceneWithMaterials(scene: THREE.Object3D): THREE.Object3D {
  const clone = scene.clone(true);
  clone.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.material = Array.isArray(node.material)
        ? node.material.map((m) => m.clone())
        : node.material.clone();
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return clone;
}

/**
 * The source model's window/curtain-panel glass survives optimization as a
 * distinct transparent (alphaMode BLEND) material rather than named meshes, so we
 * detect it by that material flag instead of relying on node names.
 */
export function isGlassMaterial(material: THREE.Material): boolean {
  return material.transparent === true;
}

export function tagGlassMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const glassMeshes: THREE.Mesh[] = [];
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const isGlass = materials.some(isGlassMaterial);
    node.userData.isGlass = isGlass;
    if (isGlass) glassMeshes.push(node);
  });
  return glassMeshes;
}

/**
 * Tints a mesh's glass sub-material(s) (identified via isGlassMaterial) a soft
 * blue and pushes them toward a more reflective look, per the brief's "tint
 * glass slightly blue & reflective" request. No-op on non-glass materials, and
 * safe on multi-material meshes (some optimized primitives share a geometry with
 * a material array).
 */
export function applyGlassTint(mesh: THREE.Mesh, color = "#bfe0f2") {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!isGlassMaterial(material)) continue;
    const mat = material as THREE.MeshStandardMaterial;
    mat.color = new THREE.Color(color);
    mat.roughness = 0.05;
    mat.metalness = 0.15;
    mat.envMapIntensity = 1.5;
  }
}

/** World-space bounding box, computed after ensuring matrices are up to date. */
export function computeBoundingBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
}
