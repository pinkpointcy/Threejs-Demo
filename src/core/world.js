import {
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  Group,
  SphereGeometry,
  Mesh,
  Color,
  AdditiveBlending,
  Vector3
} from '../../three.module.js';
import { getScene } from './scene.js';
import {
  PLANET_VERTEX_SHADER,
  PLANET_FRAGMENT_SHADER,
  STAR_VERTEX_SHADER,
  STAR_FRAGMENT_SHADER,
  NEBULA_FRAGMENT_SHADER,
  PLANET_MESH_VERTEX_SHADER,
  PLANET_MESH_FRAGMENT_SHADER
} from '../shaders/lightsaberShaders.js';

const PARTICLE_COUNT = 120000;
const R_PLANET = 14;
const PLANET_OBLATENESS = 0.92;
const PLANET_AXIS_TILT = 24.5 * (Math.PI / 180);

const STAR_COUNT = 45000;
const STAR_RADIUS_MIN = 500;
const STAR_RADIUS_MAX = 3600;

const NEBULA_COUNT = 110;
const NEBULA_RADIUS_MIN = 900;
const NEBULA_RADIUS_MAX = 2600;

const PLANET_SPHERE_SEG = 48;
const PLANET_LIGHT_DIR = new Vector3(1, 0.5, 1);

const createdObjects = [];
const planetEntries = [];

let planetParticles = null;
let g_planet = null;
let m_planet = null;
let uniformsPlanet = null;

let stars = null;
let g_stars = null;
let m_stars = null;
let uniformsStars = null;

let nebula = null;
let g_nebula = null;
let m_nebula = null;

let planetGroup = null;

function createPlanetGeometry() {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const opacities = new Float32Array(PARTICLE_COUNT);
  const orbitSpeeds = new Float32Array(PARTICLE_COUNT);
  const isRings = new Float32Array(PARTICLE_COUNT);
  const isAtmos = new Float32Array(PARTICLE_COUNT);
  const randomIds = new Float32Array(PARTICLE_COUNT);
  const phases = new Float32Array(PARTICLE_COUNT);

  const bodyColors = [
    new Color('#ff6ad5'),
    new Color('#8a5cff'),
    new Color('#4fc3ff'),
    new Color('#ffcc66'),
    new Color('#ff5a8a')
  ];

  const atmoColors = [
    new Color('#b080ff'),
    new Color('#7fe3ff'),
    new Color('#ffa0d0')
  ];

  const ringColors = [
    { rmin: 1.3, rmax: 1.55, c1: new Color('#24142e'), c2: new Color('#3a1f4a'), dense: 0.18 },
    { rmin: 1.55, rmax: 2.05, c1: new Color('#ffd4f2'), c2: new Color('#a9c7ff'), dense: 0.48 },
    { rmin: 2.05, rmax: 2.15, c1: new Color('#06060c'), c2: new Color('#120a1e'), dense: 0.05 },
    { rmin: 2.15, rmax: 2.55, c1: new Color('#c0a8ff'), c2: new Color('#80ffea'), dense: 0.22 },
    { rmin: 2.55, rmax: 2.7, c1: new Color('#fff0a8'), c2: new Color('#ffb480'), dense: 0.05 },
    { rmin: 2.7, rmax: 2.75, c1: new Color('#e0ffe8'), c2: new Color('#c0f0ff'), dense: 0.02 }
  ];

  let cumWeight = 0;
  const ringWeights = ringColors.map((r) => {
    const w = r.dense * (r.rmax - r.rmin);
    cumWeight += w;
    return cumWeight;
  });
  const ringTotal = ringWeights[ringWeights.length - 1];

  function pickRing(seed) {
    const v = seed * ringTotal;
    for (let i = 0; i < ringWeights.length; i++) {
      if (v <= ringWeights[i]) return { idx: i, t: i === 0 ? v / ringWeights[0] : (v - ringWeights[i - 1]) / (ringWeights[i] - (i === 0 ? 0 : ringWeights[i - 1])) };
    }
    return { idx: ringColors.length - 1, t: 1 };
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let x, y, z, r, g, b, size, opacity, speed, isRingVal, isAtmoVal;
    randomIds[i] = Math.random();
    phases[i] = Math.random();
    const tier = Math.random();

    if (tier < 0.22) {
      isRingVal = 0;
      isAtmoVal = 0;
      speed = 0;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const rad = R_PLANET * (0.98 + Math.random() * 0.04);
      x = rad * Math.sin(phi) * Math.cos(theta);
      const rawY = rad * Math.cos(phi);
      z = rad * Math.sin(phi) * Math.sin(theta);
      y = rawY * PLANET_OBLATENESS;

      const lat = (rawY / rad + 1.0) * 0.5;
      const bandNoise = Math.cos(lat * 32.0) * 0.7 + Math.cos(lat * 11.0) * 0.5 + Math.sin(u * 50.0) * 0.25;
      let colIndex = Math.floor(lat * 5 + bandNoise) % 5;
      if (colIndex < 0) colIndex += 5;
      const baseCol = bodyColors[colIndex].clone().lerp(bodyColors[(colIndex + 2) % 5], Math.random() * 0.3);

      r = baseCol.r; g = baseCol.g; b = baseCol.b;
      size = 1.05 + Math.random() * 0.8;
      opacity = 0.82;
    } else if (tier < 0.37) {
      isRingVal = 0;
      isAtmoVal = 1;
      speed = 0;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const atmoShell = R_PLANET * (1.08 + Math.random() * 0.35);
      x = atmoShell * Math.sin(phi) * Math.cos(theta);
      const rawY = atmoShell * Math.cos(phi);
      z = atmoShell * Math.sin(phi) * Math.sin(theta);
      y = rawY * (PLANET_OBLATENESS + 0.02);

      const colIdx = Math.floor(Math.random() * atmoColors.length);
      const atmoT = Math.random();
      const atmoCol = atmoColors[colIdx].clone().lerp(atmoColors[(colIdx + 1) % atmoColors.length], atmoT);

      r = atmoCol.r; g = atmoCol.g; b = atmoCol.b;
      size = 1.2 + Math.random() * 0.9;
      opacity = 0.22 + Math.random() * 0.2;
    } else {
      isRingVal = 1;
      isAtmoVal = 0;
      const { idx, t } = pickRing(Math.random());
      const rc = ringColors[idx];
      const ringRadius = R_PLANET * (rc.rmin + t * (rc.rmax - rc.rmin));
      const ringCol = rc.c1.clone().lerp(rc.c2, Math.pow(Math.random(), 1.2));
      const theta = Math.random() * Math.PI * 2;
      x = ringRadius * Math.cos(theta);
      z = ringRadius * Math.sin(theta);

      let thickness = 0.12;
      if (ringRadius > R_PLANET * 2.3) thickness = 0.35;
      else if (ringRadius < R_PLANET * 1.6) thickness = 0.18;
      y = (Math.random() - 0.5) * thickness;

      if (idx === 1 && Math.sin(ringRadius * 2.8) > 0.85) {
        ringCol.multiplyScalar(1.4);
      }
      if (idx === 3 && ringRadius > R_PLANET * 2.4 && ringRadius < R_PLANET * 2.42) {
        opacity = 0.08;
      }

      r = ringCol.r; g = ringCol.g; b = ringCol.b;
      size = (idx === 5 ? 1.1 : 0.7) + Math.random() * 0.6;
      opacity = rc.dense > 0.3
        ? 0.65 + Math.random() * 0.3
        : (rc.dense > 0.1 ? 0.35 + Math.random() * 0.25 : 0.15 + Math.random() * 0.15);
      speed = 9.5 / Math.sqrt(Math.max(ringRadius, 0.001));
    }

    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    sizes[i] = size; opacities[i] = opacity;
    orbitSpeeds[i] = speed; isRings[i] = isRingVal; isAtmos[i] = isAtmoVal;
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new BufferAttribute(colors, 3));
  geometry.setAttribute('size', new BufferAttribute(sizes, 1));
  geometry.setAttribute('opacityAttr', new BufferAttribute(opacities, 1));
  geometry.setAttribute('orbitSpeed', new BufferAttribute(orbitSpeeds, 1));
  geometry.setAttribute('aIsRing', new BufferAttribute(isRings, 1));
  geometry.setAttribute('aIsAtmo', new BufferAttribute(isAtmos, 1));
  geometry.setAttribute('aRandomId', new BufferAttribute(randomIds, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));

  return geometry;
}

function createPlanetParticles(scene) {
  g_planet = createPlanetGeometry();
  uniformsPlanet = {
    uTime: { value: 0 },
    uScale: { value: 1.0 },
    uRotationX: { value: 0.15 }
  };
  m_planet = new ShaderMaterial({
    depthWrite: false,
    blending: AdditiveBlending,
    vertexColors: true,
    uniforms: uniformsPlanet,
    vertexShader: PLANET_VERTEX_SHADER,
    fragmentShader: PLANET_FRAGMENT_SHADER,
    transparent: true
  });
  planetParticles = new Points(g_planet, m_planet);
  planetParticles.rotation.z = PLANET_AXIS_TILT;
  scene.add(planetParticles);
  createdObjects.push(planetParticles);
}

function createStarfield(scene) {
  g_stars = new BufferGeometry();
  const pos = new Float32Array(STAR_COUNT * 3);
  const cols = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);

  const starColors = [
    new Color('#9bb0ff'), new Color('#ffffff'),
    new Color('#ffddaa'), new Color('#ff7b7b'),
    new Color('#aaddff'), new Color('#ddbbff')
  ];

  for (let i = 0; i < STAR_COUNT; i++) {
    const r = STAR_RADIUS_MIN + Math.random() * (STAR_RADIUS_MAX - STAR_RADIUS_MIN);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const t = Math.random();
    let c;
    if (t > 0.9) c = starColors[0];
    else if (t > 0.55) c = starColors[1];
    else if (t > 0.3) c = starColors[2];
    else if (t > 0.15) c = starColors[3];
    else if (t > 0.05) c = starColors[4];
    else c = starColors[5];
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    sizes[i] = 1.0 + Math.random() * 3.0;
  }
  g_stars.setAttribute('position', new BufferAttribute(pos, 3));
  g_stars.setAttribute('customColor', new BufferAttribute(cols, 3));
  g_stars.setAttribute('size', new BufferAttribute(sizes, 1));

  uniformsStars = { uTime: { value: 0 } };
  m_stars = new ShaderMaterial({
    uniforms: uniformsStars,
    vertexShader: STAR_VERTEX_SHADER,
    fragmentShader: STAR_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending
  });
  stars = new Points(g_stars, m_stars);
  scene.add(stars);
  createdObjects.push(stars);

  g_nebula = new BufferGeometry();
  const nebPos = new Float32Array(NEBULA_COUNT * 3);
  const nebCols = new Float32Array(NEBULA_COUNT * 3);
  const nebSizes = new Float32Array(NEBULA_COUNT);
  for (let i = 0; i < NEBULA_COUNT; i++) {
    const r = NEBULA_RADIUS_MIN + Math.random() * (NEBULA_RADIUS_MAX - NEBULA_RADIUS_MIN);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    nebPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    nebPos[i * 3 + 1] = r * Math.cos(phi);
    nebPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const hue = 0.7 + (Math.random() - 0.5) * 0.35;
    const nc = new Color().setHSL(hue, 0.9, 0.07);
    nebCols[i * 3] = nc.r; nebCols[i * 3 + 1] = nc.g; nebCols[i * 3 + 2] = nc.b;
    nebSizes[i] = 450.0 + Math.random() * 700.0;
  }
  g_nebula.setAttribute('position', new BufferAttribute(nebPos, 3));
  g_nebula.setAttribute('customColor', new BufferAttribute(nebCols, 3));
  g_nebula.setAttribute('size', new BufferAttribute(nebSizes, 1));
  m_nebula = new ShaderMaterial({
    uniforms: {},
    vertexShader: STAR_VERTEX_SHADER,
    fragmentShader: NEBULA_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending
  });
  nebula = new Points(g_nebula, m_nebula);
  scene.add(nebula);
  createdObjects.push(nebula);
}

function createPlanet(group, c1, c2, nScale, pos, radius, atmo) {
  const g_planetMesh = new SphereGeometry(radius, PLANET_SPHERE_SEG, PLANET_SPHERE_SEG);
  const m_planetMesh = new ShaderMaterial({
    uniforms: {
      color1: { value: c1 },
      color2: { value: c2 },
      noiseScale: { value: nScale },
      lightDir: { value: PLANET_LIGHT_DIR.clone() },
      atmosphere: { value: atmo }
    },
    vertexShader: PLANET_MESH_VERTEX_SHADER,
    fragmentShader: PLANET_MESH_FRAGMENT_SHADER
  });
  const mesh = new Mesh(g_planetMesh, m_planetMesh);
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.receiveShadow = true;
  group.add(mesh);
  planetEntries.push({ mesh, geo: g_planetMesh, mat: m_planetMesh });
  createdObjects.push(mesh);
}

function createPlanets(scene) {
  planetGroup = new Group();
  scene.add(planetGroup);
  createdObjects.push(planetGroup);

  createPlanet(planetGroup,
    new Color('#3d1765'), new Color('#c066ff'), 9.0,
    { x: -440, y: 170, z: -660 }, 24, 0.75
  );
  createPlanet(planetGroup,
    new Color('#002f4d'), new Color('#7fe8ff'), 6.0,
    { x: 500, y: -150, z: -800 }, 32, 0.9
  );
  createPlanet(planetGroup,
    new Color('#5f2a10'), new Color('#ffb06a'), 13.0,
    { x: -260, y: -320, z: -500 }, 15, 0.22
  );
}

export function createWorld() {
  const scene = getScene();
  if (!scene) return;
  createPlanetParticles(scene);
  createStarfield(scene);
  createPlanets(scene);
  return { planetParticles, stars, nebula, planetGroup };
}

export function getPlanetUniforms() {
  return uniformsPlanet;
}

export function getStarUniforms() {
  return uniformsStars;
}

export function updateWorld(delta = 0, params = {}) {
  const {
    time = 0,
    scale = 1.0,
    rotX = 0.15
  } = params;

  if (uniformsPlanet) {
    uniformsPlanet.uTime.value = time;
    uniformsPlanet.uScale.value = scale;
    uniformsPlanet.uRotationX.value = rotX;
  }
  if (uniformsStars) uniformsStars.uTime.value = time;

  if (stars) stars.rotation.y = time * 0.004;
  if (nebula) nebula.rotation.y = time * 0.0025;

  if (planetGroup) {
    planetGroup.children.forEach((planet, idx) => {
      planet.rotation.y = time * (0.045 + idx * 0.018);
    });
    planetGroup.rotation.y = Math.sin(time * 0.045) * 0.025;
  }
}

export function disposeWorld() {
  const scene = getScene();
  if (scene) {
    createdObjects.forEach((obj) => { scene.remove(obj); });
  }
  createdObjects.length = 0;

  if (g_planet) { g_planet.dispose(); g_planet = null; }
  if (m_planet) { m_planet.dispose(); m_planet = null; }
  if (g_stars) { g_stars.dispose(); g_stars = null; }
  if (m_stars) { m_stars.dispose(); m_stars = null; }
  if (g_nebula) { g_nebula.dispose(); g_nebula = null; }
  if (m_nebula) { m_nebula.dispose(); m_nebula = null; }

  planetEntries.forEach(({ geo, mat }) => {
    if (geo) geo.dispose();
    if (mat) mat.dispose();
  });
  planetEntries.length = 0;

  planetParticles = null;
  stars = null;
  nebula = null;
  planetGroup = null;
  uniformsPlanet = null;
  uniformsStars = null;
}
