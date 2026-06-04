import * as THREE from 'three';
import type { ProceduralAssetType, ScatterLayerConfig } from '@/game/types.ts';

// --- Seeded RNG ---

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// --- Geometry generators ---

function createRockGeometry(rng: () => number): THREE.BufferGeometry {
  const detail = 1;
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i);
    const ny = pos.getY(i);
    const nz = pos.getZ(i);
    const noise = 0.7 + rng() * 0.6;
    pos.setXYZ(i, nx * noise, ny * noise * 0.7, nz * noise);
  }
  geo.computeVertexNormals();
  return geo;
}

function createPineTreeGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  const trunk = new THREE.CylinderGeometry(0.08, 0.12, 1, 6);
  trunk.translate(0, 0.5, 0);
  const canopy = new THREE.ConeGeometry(0.6, 1.8, 7);
  canopy.translate(0, 1.7, 0);
  return { trunk, canopy };
}

function createPalmTreeGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  const trunk = new THREE.CylinderGeometry(0.06, 0.1, 2.0, 6);
  trunk.translate(0, 1.0, 0);
  const canopy = new THREE.SphereGeometry(0.8, 6, 4);
  canopy.scale(1.3, 0.6, 1.3);
  canopy.translate(0, 2.3, 0);
  return { trunk, canopy };
}

function createBuildingGeometry(rng: () => number): THREE.BufferGeometry {
  const w = 0.5 + rng() * 1.0;
  const h = 1.0 + rng() * 3.0;
  const d = 0.5 + rng() * 1.0;
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  return geo;
}

function createCactusGeometry(): THREE.BufferGeometry {
  const main = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 5);
  main.translate(0, 0.6, 0);
  const arm1 = new THREE.CylinderGeometry(0.07, 0.09, 0.5, 5);
  arm1.rotateZ(Math.PI / 3);
  arm1.translate(0.25, 0.9, 0);
  const arm2 = new THREE.CylinderGeometry(0.07, 0.09, 0.4, 5);
  arm2.rotateZ(-Math.PI / 4);
  arm2.translate(-0.2, 0.7, 0);
  return mergeGeometries([main, arm1, arm2]);
}

function createTowerGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 6);
  base.translate(0, 0.25, 0);
  const pole = new THREE.CylinderGeometry(0.08, 0.1, 4.0, 6);
  pole.translate(0, 2.5, 0);
  const top = new THREE.OctahedronGeometry(0.3, 0);
  top.translate(0, 4.7, 0);
  return mergeGeometries([base, pole, top]);
}

function createMesaGeometry(rng: () => number): THREE.BufferGeometry {
  const topRadius = 0.6 + rng() * 0.4;
  const bottomRadius = topRadius + 0.3 + rng() * 0.4;
  const height = 1.0 + rng() * 0.8;
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 7);
  geo.translate(0, height / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) + (rng() - 0.5) * 0.1);
    pos.setZ(i, pos.getZ(i) + (rng() - 0.5) * 0.1);
  }
  geo.computeVertexNormals();
  return geo;
}

function createSandDuneGeometry(rng: () => number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 8, 5);
  geo.scale(1.0 + rng() * 1.0, 0.2 + rng() * 0.15, 0.6 + rng() * 0.6);
  geo.translate(0, 0, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) pos.setY(i, 0);
  }
  geo.computeVertexNormals();
  return geo;
}

function createRuinsGeometry(rng: () => number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const wallCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < wallCount; i++) {
    const w = 0.8 + rng() * 1.5;
    const h = 0.5 + rng() * 2.0;
    const d = 0.1 + rng() * 0.15;
    const wall = new THREE.BoxGeometry(w, h, d);
    wall.rotateY(rng() * Math.PI);
    wall.translate((rng() - 0.5) * 2, h / 2, (rng() - 0.5) * 2);
    parts.push(wall);
  }
  const pillar = new THREE.CylinderGeometry(0.12, 0.15, 1.5 + rng(), 6);
  pillar.translate(rng() * 1.5, 0.75, rng() * 1.5);
  parts.push(pillar);
  return mergeGeometries(parts);
}

function createWreckGeometry(rng: () => number): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1.5 + rng() * 0.5, 0.4, 0.6 + rng() * 0.3);
  body.translate(0, 0.2, 0);
  const wheel1 = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
  wheel1.rotateZ(Math.PI / 2);
  wheel1.translate(-0.5, 0.15, 0.35);
  const wheel2 = wheel1.clone();
  wheel2.translate(1.0, 0, 0);
  const tilt = (rng() - 0.5) * 0.2;
  body.rotateZ(tilt);
  return mergeGeometries([body, wheel1, wheel2]);
}

function createSailboatGeometry(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(0.3, 0.2, 1.2);
  hull.translate(0, -0.05, 0);
  const pos = hull.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const taper = 1.0 - Math.abs(z) * 0.3;
    pos.setX(i, pos.getX(i) * taper);
    if (pos.getY(i) < -0.05) {
      pos.setX(i, pos.getX(i) * 0.6);
    }
  }
  hull.computeVertexNormals();
  const mast = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 5);
  mast.translate(0, 0.6, 0);
  const sail = new THREE.PlaneGeometry(0.5, 0.9);
  sail.translate(0.25, 0.55, 0);
  return mergeGeometries([hull, mast, sail]);
}

function createCargoShipGeometry(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(0.6, 0.35, 2.5);
  hull.translate(0, 0.0, 0);
  const pos = hull.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (Math.abs(z) > 0.8) {
      pos.setX(i, pos.getX(i) * (1.0 - (Math.abs(z) - 0.8) * 0.4));
    }
    if (pos.getY(i) < 0) pos.setX(i, pos.getX(i) * 0.7);
  }
  hull.computeVertexNormals();
  const bridge = new THREE.BoxGeometry(0.4, 0.4, 0.5);
  bridge.translate(0, 0.37, -0.7);
  const container1 = new THREE.BoxGeometry(0.45, 0.25, 0.6);
  container1.translate(0, 0.3, 0.3);
  const container2 = new THREE.BoxGeometry(0.45, 0.25, 0.5);
  container2.translate(0, 0.3, 0.9);
  return mergeGeometries([hull, bridge, container1, container2]);
}

function createWhaleGeometry(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(1, 8, 6);
  body.scale(0.4, 0.3, 1.2);
  body.translate(0, -0.05, 0);
  const tail = new THREE.BoxGeometry(0.6, 0.05, 0.3);
  tail.rotateX(-0.2);
  tail.translate(0, 0.05, -1.3);
  const fin1 = new THREE.BoxGeometry(0.5, 0.04, 0.2);
  fin1.rotateZ(-0.3);
  fin1.translate(0.3, -0.05, 0.2);
  const fin2 = fin1.clone();
  fin2.translate(-0.6, 0, 0);
  return mergeGeometries([body, tail, fin1, fin2]);
}

function createBuoyGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
  base.translate(0, 0.1, 0);
  const pole = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5);
  pole.translate(0, 0.7, 0);
  const top = new THREE.SphereGeometry(0.12, 6, 4);
  top.translate(0, 1.15, 0);
  return mergeGeometries([base, pole, top]);
}

function createLighthouseGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 8);
  base.translate(0, 1.25, 0);
  const gallery = new THREE.CylinderGeometry(0.35, 0.3, 0.2, 8);
  gallery.translate(0, 2.6, 0);
  const lamp = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
  lamp.translate(0, 2.9, 0);
  const roof = new THREE.ConeGeometry(0.3, 0.3, 8);
  roof.translate(0, 3.25, 0);
  const island = new THREE.CylinderGeometry(1.0, 1.5, 0.4, 8);
  island.translate(0, -0.2, 0);
  return mergeGeometries([base, gallery, lamp, roof, island]);
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  for (const g of geos) totalVerts += g.attributes.position.count;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  const indices: number[] = [];

  for (const g of geos) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      positions[(offset + i) * 3] = p.getX(i);
      positions[(offset + i) * 3 + 1] = p.getY(i);
      positions[(offset + i) * 3 + 2] = p.getZ(i);
      normals[(offset + i) * 3] = n.getX(i);
      normals[(offset + i) * 3 + 1] = n.getY(i);
      normals[(offset + i) * 3 + 2] = n.getZ(i);
    }
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + offset);
      }
    }
    offset += p.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (indices.length > 0) merged.setIndex(indices);

  for (const g of geos) g.dispose();
  return merged;
}

// --- Materials ---

const MATERIALS: Record<ProceduralAssetType, () => THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]> = {
  rock: () => new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.95, metalness: 0.05, flatShading: true }),
  pine_tree: () => [
    new THREE.MeshStandardMaterial({ color: 0x3b2517, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.85, flatShading: true }),
  ],
  palm_tree: () => [
    new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.8 }),
  ],
  building: () => new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.8, metalness: 0.1 }),
  cactus: () => new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.85, flatShading: true }),
  tower: () => new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.6 }),
  mesa: () => new THREE.MeshStandardMaterial({ color: 0xb07040, roughness: 0.92, metalness: 0.02, flatShading: true }),
  sand_dune: () => new THREE.MeshStandardMaterial({ color: 0xd4b87a, roughness: 0.95, metalness: 0.0 }),
  ruins: () => new THREE.MeshStandardMaterial({ color: 0xa09070, roughness: 0.9, metalness: 0.05, flatShading: true }),
  wreck: () => new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.85, metalness: 0.3, flatShading: true }),
  sailboat: () => new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.7, metalness: 0.05 }),
  cargo_ship: () => new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6, metalness: 0.4 }),
  whale: () => new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.7, metalness: 0.1 }),
  buoy: () => new THREE.MeshStandardMaterial({ color: 0xdd3333, roughness: 0.6, metalness: 0.2 }),
  lighthouse: () => new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7, metalness: 0.1 }),
};

// --- Poisson-disk scatter ---

function poissonScatter(count: number, radius: number, minDistance: number, rng: () => number): [number, number][] {
  const points: [number, number][] = [];
  let attempts = 0;
  const maxAttempts = count * 15;

  while (points.length < count && attempts < maxAttempts) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * radius;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    let tooClose = false;
    for (const [px, pz] of points) {
      const dx = x - px;
      const dz = z - pz;
      if (dx * dx + dz * dz < minDistance * minDistance) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) points.push([x, z]);
  }

  return points;
}

// --- Public API ---

export interface ScatterResult {
  meshes: THREE.Object3D[];
  collisionVolumes: Array<{ center: THREE.Vector3; radius: number; label: string }>;
  dispose: () => void;
}

export function buildScatterLayers(scene: THREE.Scene, layers: ScatterLayerConfig[], seed = 42): ScatterResult {
  const rng = seededRng(seed);
  const allMeshes: THREE.Object3D[] = [];
  const allGeometries: THREE.BufferGeometry[] = [];
  const allMaterials: THREE.Material[] = [];
  const collisionVolumes: Array<{ center: THREE.Vector3; radius: number; label: string }> = [];

  const maybeAddCollision = (layer: ScatterLayerConfig, x: number, z: number, y: number, scale: number) => {
    if (!layer.collision || scale < layer.collision.minScale) return;
    const radius = Math.max(8, scale * layer.collision.radiusMultiplier);
    collisionVolumes.push({
      center: new THREE.Vector3(x, y + radius * 0.42, z),
      radius,
      label: layer.collision.label ?? layer.type.replace(/_/g, ' '),
    });
  };

  for (const layer of layers) {
    try {
      const points = poissonScatter(layer.count, layer.radius, layer.minDistance, rng);
      if (points.length === 0) continue;

      switch (layer.type) {
        case 'rock': {
          const geo = createRockGeometry(rng);
          const mat = MATERIALS.rock() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();

          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            const y = (layer.yOffset ?? 0) + s * 0.3;
            dummy.position.set(x, y, z);
            dummy.rotation.set(rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3);
            dummy.scale.set(s, s * (0.5 + rng() * 0.5), s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, y, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          im.receiveShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'pine_tree':
        case 'palm_tree': {
          const isPine = layer.type === 'pine_tree';
          const parts = isPine ? createPineTreeGeometry() : createPalmTreeGeometry();
          const mats = (isPine ? MATERIALS.pine_tree() : MATERIALS.palm_tree()) as THREE.MeshStandardMaterial[];

          const islandGeo = new THREE.CylinderGeometry(1.5, 2.0, 0.4, 8);
          islandGeo.translate(0, -0.2, 0);
          const islandMat = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.9 });

          const trunkMesh = new THREE.InstancedMesh(parts.trunk, mats[0], points.length);
          const canopyMesh = new THREE.InstancedMesh(parts.canopy, mats[1], points.length);
          const islandMesh = new THREE.InstancedMesh(islandGeo, islandMat, points.length);
          const dummy = new THREE.Object3D();

          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, layer.yOffset ?? 0, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            trunkMesh.setMatrixAt(i, dummy.matrix);
            canopyMesh.setMatrixAt(i, dummy.matrix);
            islandMesh.setMatrixAt(i, dummy.matrix);
          }
          trunkMesh.instanceMatrix.needsUpdate = true;
          canopyMesh.instanceMatrix.needsUpdate = true;
          islandMesh.instanceMatrix.needsUpdate = true;
          trunkMesh.castShadow = true;
          canopyMesh.castShadow = true;
          islandMesh.receiveShadow = true;
          scene.add(trunkMesh);
          scene.add(canopyMesh);
          scene.add(islandMesh);
          allMeshes.push(trunkMesh, canopyMesh, islandMesh);
          allGeometries.push(parts.trunk, parts.canopy, islandGeo);
          allMaterials.push(...mats, islandMat);
          break;
        }

        case 'building': {
          const geo = createBuildingGeometry(rng);
          const mat = MATERIALS.building() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();

          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, layer.yOffset ?? 0, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, layer.yOffset ?? 0, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          im.receiveShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'cactus': {
          const geo = createCactusGeometry();
          const mat = MATERIALS.cactus() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();

          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, layer.yOffset ?? 0, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, layer.yOffset ?? 0, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'tower': {
          const geo = createTowerGeometry();
          const mat = MATERIALS.tower() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();

          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, layer.yOffset ?? 0, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, layer.yOffset ?? 0, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'mesa': {
          const geo = createMesaGeometry(rng);
          const mat = MATERIALS.mesa() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, layer.yOffset ?? 0, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.set(s, s * (0.6 + rng() * 0.6), s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, layer.yOffset ?? 0, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          im.receiveShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'sand_dune': {
          const geo = createSandDuneGeometry(rng);
          const mat = MATERIALS.sand_dune() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, (layer.yOffset ?? 0) - 0.5, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.set(s, s * 0.4, s * (0.6 + rng() * 0.5));
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
          }
          im.instanceMatrix.needsUpdate = true;
          im.receiveShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'ruins': {
          const geo = createRuinsGeometry(rng);
          const mat = MATERIALS.ruins() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, layer.yOffset ?? 0, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, layer.yOffset ?? 0, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          im.receiveShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'wreck': {
          const geo = createWreckGeometry(rng);
          const mat = MATERIALS.wreck() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            const y = (layer.yOffset ?? 0) + s * 0.1;
            dummy.position.set(x, y, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, (rng() - 0.5) * 0.15);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, y, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'sailboat': {
          const geo = createSailboatGeometry();
          const mat = MATERIALS.sailboat() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            const y = (layer.yOffset ?? 0) + 0.5;
            dummy.position.set(x, y, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, (rng() - 0.5) * 0.05);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, y, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'cargo_ship': {
          const geo = createCargoShipGeometry();
          const mat = MATERIALS.cargo_ship() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            const y = (layer.yOffset ?? 0) + 1.0;
            dummy.position.set(x, y, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, y, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'whale': {
          const geo = createWhaleGeometry();
          const mat = MATERIALS.whale() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, (layer.yOffset ?? 0) - s * 0.1, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
          }
          im.instanceMatrix.needsUpdate = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'buoy': {
          const geo = createBuoyGeometry();
          const mat = MATERIALS.buoy() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, (layer.yOffset ?? 0) + 0.3, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
          }
          im.instanceMatrix.needsUpdate = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }

        case 'lighthouse': {
          const geo = createLighthouseGeometry();
          const mat = MATERIALS.lighthouse() as THREE.MeshStandardMaterial;
          const im = new THREE.InstancedMesh(geo, mat, points.length);
          const dummy = new THREE.Object3D();
          for (let i = 0; i < points.length; i++) {
            const [x, z] = points[i];
            const s = layer.scaleRange[0] + rng() * (layer.scaleRange[1] - layer.scaleRange[0]);
            dummy.position.set(x, layer.yOffset ?? 0, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            maybeAddCollision(layer, x, z, layer.yOffset ?? 0, s);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true;
          im.receiveShadow = true;
          scene.add(im);
          allMeshes.push(im);
          allGeometries.push(geo);
          allMaterials.push(mat);
          break;
        }
      }
    } catch (err) {
      console.error(`[ProceduralWorld] Failed to build layer type="${layer.type}":`, err);
    }
  }

  return {
    meshes: allMeshes,
    collisionVolumes,
    dispose: () => {
      for (const m of allMeshes) {
        scene.remove(m);
      }
      for (const g of allGeometries) g.dispose();
      for (const m of allMaterials) m.dispose();
    },
  };
}
