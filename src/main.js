import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const TAU = Math.PI * 2;
const MODEL_URL = "./models/low_poly_earth.glb";

const canvas = document.querySelector("#scene-canvas");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03050a, 0.035);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0.35, 0.45, 3.7);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const earth = new THREE.Group();
earth.rotation.set(-0.12, -0.25, 0.04);
scene.add(earth);

scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x172318, 2.5));

const sun = new THREE.DirectionalLight(0xfff0ca, 4.2);
sun.position.set(3.5, 2.4, 4.8);
scene.add(sun);

const rim = new THREE.DirectionalLight(0x6fb7ff, 1.7);
rim.position.set(-3.2, 1.6, -2.6);
scene.add(rim);

const stars = createStars();
scene.add(stars);

const walker = createWalker();
earth.add(walker.root);

const loader = new GLTFLoader();
let earthRadius = 1;
let targetProgress = 0;
let progress = 0;
let loaded = false;

const vectors = {
  normal: new THREE.Vector3(),
  nextNormal: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  right: new THREE.Vector3(),
  basis: new THREE.Matrix4(),
  worldWalker: new THREE.Vector3(),
  worldNormal: new THREE.Vector3(),
  worldTangent: new THREE.Vector3(),
  cameraGoal: new THREE.Vector3(),
  lookGoal: new THREE.Vector3(),
};

loader.load(
  MODEL_URL,
  (gltf) => {
    const model = gltf.scene;
    prepareEarthModel(model);
    earth.add(model);
    loaded = true;
  },
  undefined,
  (error) => {
    console.error("Failed to load Earth GLB", error);
    earth.add(createFallbackEarth());
    loaded = true;
  },
);

window.addEventListener("resize", resize);
window.addEventListener("scroll", updateScroll, { passive: true });
updateScroll();
resize();
renderer.setAnimationLoop(render);

function prepareEarthModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);
  const scale = maxAxis > 0 ? 2 / maxAxis : 1;

  model.position.sub(center);
  model.scale.setScalar(scale);
  earthRadius = 0.5 * maxAxis * scale;

  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = true;
    object.geometry.computeVertexNormals();

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.flatShading = true;
      material.roughness = 0.82;
      material.metalness = 0;
      material.needsUpdate = true;
    });
  });
}

function createWalker() {
  const root = new THREE.Group();
  root.scale.setScalar(0.32);

  const skin = new THREE.MeshStandardMaterial({ color: 0xffc18e, roughness: 0.75 });
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff6b4a, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x243b8f, roughness: 0.86 });
  const boots = new THREE.MeshStandardMaterial({ color: 0x111521, roughness: 0.8 });
  const visor = new THREE.MeshStandardMaterial({
    color: 0xdff8ff,
    roughness: 0.22,
    metalness: 0.05,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.24, 6, 12), jacket);
  body.position.y = 0.45;
  root.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin);
  head.position.y = 0.75;
  root.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 8), visor);
  face.position.set(0, 0.765, 0.104);
  face.scale.set(1.45, 0.75, 0.34);
  root.add(face);

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.09), pants);
  pack.position.set(0, 0.45, -0.12);
  root.add(pack);

  const leftLeg = makeLimb(pants, boots, -0.06, 0.29, 0.028, 0.26, true);
  const rightLeg = makeLimb(pants, boots, 0.06, 0.29, 0.028, 0.26, true);
  const leftArm = makeLimb(jacket, skin, -0.145, 0.55, 0.025, 0.22, false);
  const rightArm = makeLimb(jacket, skin, 0.145, 0.55, 0.025, 0.22, false);

  root.add(leftLeg.pivot, rightLeg.pivot, leftArm.pivot, rightArm.pivot);

  return {
    root,
    body,
    head,
    leftLeg: leftLeg.pivot,
    rightLeg: rightLeg.pivot,
    leftArm: leftArm.pivot,
    rightArm: rightArm.pivot,
  };
}

function makeLimb(primaryMaterial, endMaterial, x, y, radius, length, hasFoot) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);

  const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 8), primaryMaterial);
  limb.position.y = -length * 0.48;
  pivot.add(limb);

  const end = hasFoot
    ? new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.038, 0.115), endMaterial)
    : new THREE.Mesh(new THREE.SphereGeometry(radius * 1.25, 8, 8), endMaterial);
  end.position.set(0, -length - 0.035, hasFoot ? 0.03 : 0);
  pivot.add(end);

  return { pivot };
}

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const count = 900;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const radius = THREE.MathUtils.randFloat(7, 19);
    const theta = THREE.MathUtils.randFloat(0, TAU);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xbcdfff,
      size: 0.022,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
}

function createFallbackEarth() {
  const group = new THREE.Group();
  const water = new THREE.MeshStandardMaterial({
    color: 0x0c56bc,
    roughness: 0.84,
    flatShading: true,
  });
  const land = new THREE.MeshStandardMaterial({
    color: 0x2aa143,
    roughness: 0.86,
    flatShading: true,
  });

  const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), water);
  group.add(globe);

  for (let i = 0; i < 34; i += 1) {
    const spot = new THREE.Mesh(new THREE.IcosahedronGeometry(THREE.MathUtils.randFloat(0.08, 0.18), 1), land);
    const n = pathNormal(i / 34, new THREE.Vector3());
    spot.position.copy(n).multiplyScalar(1.01);
    spot.scale.y = 0.24;
    spot.lookAt(n.clone().multiplyScalar(2));
    group.add(spot);
  }

  return group;
}

function updateScroll() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  targetProgress = scrollable > 0 ? THREE.MathUtils.clamp(window.scrollY / scrollable, 0, 1) : 0;
}

function pathNormal(t, target) {
  const theta = -0.85 + t * TAU * 1.34;
  const latitude = 0.34 * Math.sin(t * TAU * 0.9 - 0.3) + 0.15 * Math.sin(t * TAU * 2.1 + 1.2);
  const ring = Math.cos(latitude);

  target.set(Math.cos(theta) * ring, Math.sin(latitude), Math.sin(theta) * ring);
  return target.normalize();
}

function updateWalker(t, elapsed) {
  progress = THREE.MathUtils.lerp(progress, targetProgress, 0.08);

  const normal = pathNormal(progress, vectors.normal);
  const nextNormal = pathNormal(Math.min(progress + 0.002, 1), vectors.nextNormal);
  const tangent = vectors.tangent.copy(nextNormal).sub(normal).normalize();
  if (tangent.lengthSq() < 0.0001) {
    tangent.set(0, 0, 1);
  }

  const right = vectors.right.crossVectors(normal, tangent).normalize();
  vectors.basis.makeBasis(right, normal, tangent);

  const stride = progress * TAU * 32;
  const idle = Math.sin(elapsed * 2.2) * 0.015;
  const footLift = Math.abs(Math.sin(stride)) * 0.018;

  walker.root.position.copy(normal).multiplyScalar(earthRadius + 0.02 + footLift);
  walker.root.quaternion.setFromRotationMatrix(vectors.basis);
  walker.body.position.y = 0.45 + idle;
  walker.head.position.y = 0.75 + idle * 1.4;
  walker.leftLeg.rotation.x = Math.sin(stride) * 0.72;
  walker.rightLeg.rotation.x = -Math.sin(stride) * 0.72;
  walker.leftArm.rotation.x = -Math.sin(stride) * 0.52;
  walker.rightArm.rotation.x = Math.sin(stride) * 0.52;

  earth.rotation.y = -0.25 - progress * TAU * 0.18;
  earth.rotation.x = -0.12 + Math.sin(progress * TAU) * 0.06;
}

function updateCamera() {
  earth.updateWorldMatrix(true, true);
  walker.root.getWorldPosition(vectors.worldWalker);
  vectors.worldNormal.copy(vectors.normal).applyQuaternion(earth.quaternion).normalize();
  vectors.worldTangent.copy(vectors.tangent).applyQuaternion(earth.quaternion).normalize();

  const side = Math.sin(progress * TAU * 0.5) * 0.32;
  vectors.cameraGoal
    .copy(vectors.worldNormal)
    .multiplyScalar(window.innerWidth < 720 ? 3.55 : 3.25)
    .addScaledVector(vectors.worldTangent, -0.52)
    .add(new THREE.Vector3(side, window.innerWidth < 720 ? 0.42 : 0.3, 0));

  vectors.lookGoal
    .copy(vectors.worldWalker)
    .addScaledVector(vectors.worldNormal, 0.11)
    .addScaledVector(vectors.worldTangent, 0.08);

  camera.position.lerp(vectors.cameraGoal, 0.075);
  camera.lookAt(vectors.lookGoal);
}

function render(elapsedMs) {
  const elapsed = elapsedMs * 0.001;
  stars.rotation.y = elapsed * 0.018;
  stars.rotation.x = Math.sin(elapsed * 0.08) * 0.04;

  if (loaded) {
    updateWalker(progress, elapsed);
    updateCamera();
  }

  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.fov = width < 720 ? 43 : 38;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  updateScroll();
}
