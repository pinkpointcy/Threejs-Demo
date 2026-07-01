import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  Group,
  SphereGeometry,
  Mesh,
  FogExp2,
  Color,
  Vector3,
  AdditiveBlending,
  Timer
} from '../../three.module.js';

const SATURN_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  attribute float opacityAttr;
  attribute float orbitSpeed;
  attribute float isRing;
  attribute float aRandomId;

  varying vec3 vColor;
  varying float vDist;
  varying float vOpacity;
  varying float vScaleFactor;
  varying float vIsRing;

  uniform float uTime;
  uniform float uScale;
  uniform float uRotationX;

  mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
  }

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float normScaleLOD = clamp((uScale - 0.15) / 2.35, 0.0, 1.0);
    float visibilityThreshold = 0.9 + pow(normScaleLOD, 1.2) * 0.1;

    if (aRandomId > visibilityThreshold) {
      gl_Position = vec4(0.0);
      gl_PointSize = 0.0;
      return;
    }

    vec3 pos = position;

    if (isRing > 0.5) {
      float angleOffset = uTime * orbitSpeed * 0.2;
      vec2 rotatedXZ = rotate2d(angleOffset) * pos.xz;
      pos.x = rotatedXZ.x;
      pos.z = rotatedXZ.y;
    } else {
      float bodyAngle = uTime * 0.03;
      vec2 rotatedXZ = rotate2d(bodyAngle) * pos.xz;
      pos.x = rotatedXZ.x;
      pos.z = rotatedXZ.y;
    }

    float cx = cos(uRotationX);
    float sx = sin(uRotationX);
    float ry = pos.y * cx - pos.z * sx;
    float rz = pos.y * sx + pos.z * cx;
    pos.y = ry;
    pos.z = rz;

    vec4 mvPosition = modelViewMatrix * vec4(pos * uScale, 1.0);
    float dist = -mvPosition.z;
    vDist = dist;

    float chaosThreshold = 25.0;
    if (dist < chaosThreshold && dist > 0.1) {
      float chaosIntensity = 1.0 - (dist / chaosThreshold);
      chaosIntensity = pow(chaosIntensity, 3.0);
      float highFreqTime = uTime * 40.0;
      float noiseX = sin(highFreqTime + pos.x * 10.0) * hash(pos.y);
      float noiseY = cos(highFreqTime + pos.y * 10.0) * hash(pos.x);
      float noiseZ = sin(highFreqTime * 0.5) * hash(pos.z);
      vec3 noiseVec = vec3(noiseX, noiseY, noiseZ) * chaosIntensity * 3.0;
      mvPosition.xyz += noiseVec;
    }

    gl_Position = projectionMatrix * mvPosition;

    float pointSize = size * (350.0 / dist);
    pointSize *= 0.55;

    if (isRing < 0.5 && dist < 50.0) {
      pointSize *= 0.8;
    }

    gl_PointSize = clamp(pointSize, 0.0, 300.0);

    vColor = customColor;
    vOpacity = opacityAttr;
    vScaleFactor = uScale;
    vIsRing = isRing;
  }
`;

const SATURN_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vDist;
  varying float vOpacity;
  varying float vScaleFactor;
  varying float vIsRing;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;

    float glow = smoothstep(1.0, 0.4, r);

    float t = clamp((vScaleFactor - 0.15) / 2.35, 0.0, 1.0);

    vec3 deepGold = vec3(0.35, 0.22, 0.05);
    float colorMix = smoothstep(0.1, 0.9, t);
    vec3 baseColor = mix(deepGold, vColor, colorMix);

    float brightness = 0.2 + 1.0 * t;
    float densityAlpha = 0.25 + 0.45 * smoothstep(0.0, 0.5, t);
    vec3 finalColor = baseColor * brightness;

    if (vDist < 40.0) {
      float closeMix = 1.0 - (vDist / 40.0);
      if (vIsRing < 0.5) {
        vec3 deepTexture = pow(vColor, vec3(1.4)) * 1.5;
        finalColor = mix(finalColor, deepTexture, closeMix * 0.8);
      } else {
        finalColor += vec3(0.15, 0.12, 0.1) * closeMix;
      }
    }

    float depthAlpha = 1.0;
    if (vDist < 10.0) depthAlpha = smoothstep(0.0, 10.0, vDist);

    float alpha = glow * vOpacity * densityAlpha * depthAlpha;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const STAR_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  uniform float uTime;

  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    gl_PointSize = size * (1000.0 / dist);
    gl_PointSize = clamp(gl_PointSize, 1.0, 8.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  uniform float uTime;
  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float noise = random(gl_FragCoord.xy);
    float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + noise * 10.0);
    float glow = 1.0 - r;
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColor * twinkle, glow * 0.8);
  }
`;

const NEBULA_FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if(r > 1.0) discard;
    float glow = pow(1.0 - r, 2.0);
    gl_FragColor = vec4(vColor, glow * 0.1);
  }
`;

const PLANET_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PLANET_FRAGMENT_SHADER = `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float noiseScale;
  uniform vec3 lightDir;
  uniform float atmosphere;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float n = fbm(vUv * noiseScale);
    vec3 albedo = mix(color1, color2, n);
    vec3 normal = normalize(vNormal);
    vec3 light = normalize(lightDir);
    float diff = max(dot(normal, light), 0.05);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 finalColor = albedo * diff + atmosphere * vec3(0.5, 0.6, 1.0) * fresnel;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const FOG_COLOR = 0x020202;
const FOG_DENSITY = 0.00015;

const CAMERA_FOV = 60;
const CAMERA_NEAR = 1;
const CAMERA_FAR = 10000;
const CAMERA_Z = 100;
const CAMERA_LOOKAT = new Vector3(0, 0, 0);

const PARTICLE_COUNT = 200000;
const R_PLANET = 18;
const SATURN_AXIS_TILT = 26.73 * (Math.PI / 180);

const STAR_COUNT = 50000;
const STAR_RADIUS_MIN = 400;
const STAR_RADIUS_MAX = 3000;

const NEBULA_COUNT = 100;
const NEBULA_RADIUS_MIN = 800;
const NEBULA_RADIUS_MAX = 2000;

const PLANET_SPHERE_SEG = 48;
const PLANET_LIGHT_DIR = new Vector3(1, 0.5, 1);

const LERP_FACTOR = 0.08;
const IDLE_SCALE_AMP = 0.2;
const IDLE_ROT_AMP = 0.15;
const IDLE_SCALE_BASE = 1.0;
const IDLE_ROT_BASE = 0.4;
const IDLE_STEP = 0.005;

const createdObjects = [];

let s_scene = null;
let c_camera = null;
let renderer = null;
let timer = null;

let particles = null;
let g_particles = null;
let m_particles = null;
let uniformsSaturn = null;

let stars = null;
let g_stars = null;
let m_stars = null;
let uniformsStars = null;

let nebula = null;
let g_nebula = null;
let m_nebula = null;

let planetGroup = null;
let planetMeshes = [];

let targetScale = IDLE_SCALE_BASE;
let targetRotX = IDLE_ROT_BASE;
let currentScale = IDLE_SCALE_BASE;
let currentRotX = IDLE_ROT_BASE;
let isHandDetected = false;
let autoIdleTime = 0;
let running = false;

function createSaturn() {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const opacities = new Float32Array(PARTICLE_COUNT);
  const orbitSpeeds = new Float32Array(PARTICLE_COUNT);
  const isRings = new Float32Array(PARTICLE_COUNT);
  const randomIds = new Float32Array(PARTICLE_COUNT);

  const bodyColors = [
    new Color('#E3DAC5'),
    new Color('#C9A070'),
    new Color('#E3DAC5'),
    new Color('#B08D55')
  ];

  const colorRingC = new Color('#2A2520');
  const colorRingB_Inner = new Color('#CDBFA0');
  const colorRingB_Outer = new Color('#DCCBBA');
  const colorCassini = new Color('#050505');
  const colorRingA = new Color('#989085');
  const colorRingF = new Color('#AFAFA0');

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let x, y, z, r, g, b, size, opacity, speed, isRingVal;
    randomIds[i] = Math.random();

    if (i < PARTICLE_COUNT * 0.25) {
      isRingVal = 0.0;
      speed = 0.0;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const rad = R_PLANET;

      x = rad * Math.sin(phi) * Math.cos(theta);
      const rawY = rad * Math.cos(phi);
      z = rad * Math.sin(phi) * Math.sin(theta);
      y = rawY * 0.9;

      const lat = (rawY / rad + 1.0) * 0.5;
      const bandNoise = Math.cos(lat * 40.0) * 0.8 + Math.cos(lat * 15.0) * 0.4;
      let colIndex = Math.floor(lat * 4 + bandNoise) % 4;
      if (colIndex < 0) colIndex = 0;
      const baseCol = bodyColors[colIndex];

      r = baseCol.r; g = baseCol.g; b = baseCol.b;
      size = 1.0 + Math.random() * 0.8;
      opacity = 0.8;
    } else {
      isRingVal = 1.0;
      const zoneRand = Math.random();
      let ringRadius;
      let ringCol;

      if (zoneRand < 0.15) {
        ringRadius = R_PLANET * (1.235 + Math.random() * (1.525 - 1.235));
        ringCol = colorRingC;
        size = 0.5; opacity = 0.3;
      } else if (zoneRand < 0.65) {
        const t = Math.random();
        ringRadius = R_PLANET * (1.525 + t * (1.95 - 1.525));
        ringCol = colorRingB_Inner.clone().lerp(colorRingB_Outer, t);
        size = 0.8 + Math.random() * 0.6; opacity = 0.85;
        if (Math.sin(ringRadius * 2.0) > 0.8) opacity *= 1.2;
      } else if (zoneRand < 0.69) {
        ringRadius = R_PLANET * (1.95 + Math.random() * (2.025 - 1.95));
        ringCol = colorCassini;
        size = 0.3; opacity = 0.1;
      } else if (zoneRand < 0.99) {
        ringRadius = R_PLANET * (2.025 + Math.random() * (2.27 - 2.025));
        ringCol = colorRingA;
        size = 0.7; opacity = 0.6;
        if (ringRadius > R_PLANET * 2.2 && ringRadius < R_PLANET * 2.21) opacity = 0.1;
      } else {
        ringRadius = R_PLANET * (2.32 + Math.random() * 0.02);
        ringCol = colorRingF;
        size = 1.0; opacity = 0.7;
      }

      const theta = Math.random() * Math.PI * 2;
      x = ringRadius * Math.cos(theta);
      z = ringRadius * Math.sin(theta);

      let thickness = 0.15;
      if (ringRadius > R_PLANET * 2.3) thickness = 0.4;
      y = (Math.random() - 0.5) * thickness;

      r = ringCol.r; g = ringCol.g; b = ringCol.b;
      speed = 8.0 / Math.sqrt(ringRadius);
    }

    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    sizes[i] = size; opacities[i] = opacity;
    orbitSpeeds[i] = speed; isRings[i] = isRingVal;
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new BufferAttribute(colors, 3));
  geometry.setAttribute('size', new BufferAttribute(sizes, 1));
  geometry.setAttribute('opacityAttr', new BufferAttribute(opacities, 1));
  geometry.setAttribute('orbitSpeed', new BufferAttribute(orbitSpeeds, 1));
  geometry.setAttribute('isRing', new BufferAttribute(isRings, 1));
  geometry.setAttribute('aRandomId', new BufferAttribute(randomIds, 1));

  uniformsSaturn = {
    uTime: { value: 0 },
    uScale: { value: IDLE_SCALE_BASE },
    uRotationX: { value: IDLE_ROT_BASE }
  };

  const material = new ShaderMaterial({
    depthWrite: false,
    blending: AdditiveBlending,
    vertexColors: true,
    uniforms: uniformsSaturn,
    vertexShader: SATURN_VERTEX_SHADER,
    fragmentShader: SATURN_FRAGMENT_SHADER,
    transparent: true
  });

  const pts = new Points(geometry, material);
  pts.rotation.z = SATURN_AXIS_TILT;
  s_scene.add(pts);

  g_particles = geometry;
  m_particles = material;
  particles = pts;
  createdObjects.push(pts);
}

function createStarfield() {
  const geo = new BufferGeometry();
  const pos = new Float32Array(STAR_COUNT * 3);
  const cols = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);

  const starColors = [
    new Color('#9bb0ff'), new Color('#ffffff'),
    new Color('#ffcc6f'), new Color('#ff7b7b')
  ];

  for (let i = 0; i < STAR_COUNT; i++) {
    const r = STAR_RADIUS_MIN + Math.random() * (STAR_RADIUS_MAX - STAR_RADIUS_MIN);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const colorType = Math.random();
    let c;
    if (colorType > 0.9) c = starColors[0];
    else if (colorType > 0.6) c = starColors[1];
    else if (colorType > 0.3) c = starColors[2];
    else c = starColors[3];

    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    sizes[i] = 1.0 + Math.random() * 3.0;
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('customColor', new BufferAttribute(cols, 3));
  geo.setAttribute('size', new BufferAttribute(sizes, 1));

  uniformsStars = { uTime: { value: 0 } };
  const mat = new ShaderMaterial({
    uniforms: uniformsStars,
    vertexShader: STAR_VERTEX_SHADER,
    fragmentShader: STAR_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending
  });
  const starPts = new Points(geo, mat);
  s_scene.add(starPts);

  g_stars = geo;
  m_stars = mat;
  stars = starPts;
  createdObjects.push(starPts);

  const nebGeo = new BufferGeometry();
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
    const nc = new Color().setHSL(0.6 + Math.random() * 0.2, 0.8, 0.05);
    nebCols[i * 3] = nc.r; nebCols[i * 3 + 1] = nc.g; nebCols[i * 3 + 2] = nc.b;
    nebSizes[i] = 400.0 + Math.random() * 600.0;
  }
  nebGeo.setAttribute('position', new BufferAttribute(nebPos, 3));
  nebGeo.setAttribute('customColor', new BufferAttribute(nebCols, 3));
  nebGeo.setAttribute('size', new BufferAttribute(nebSizes, 1));
  const nebShaderMat = new ShaderMaterial({
    uniforms: {},
    vertexShader: STAR_VERTEX_SHADER,
    fragmentShader: NEBULA_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending
  });
  const nebPts = new Points(nebGeo, nebShaderMat);
  s_scene.add(nebPts);

  g_nebula = nebGeo;
  m_nebula = nebShaderMat;
  nebula = nebPts;
  createdObjects.push(nebPts);
}

function createPlanet(group, c1, c2, nScale, pos, radius, atmo) {
  const geo = new SphereGeometry(radius, PLANET_SPHERE_SEG, PLANET_SPHERE_SEG);
  const mat = new ShaderMaterial({
    uniforms: {
      color1: { value: c1 },
      color2: { value: c2 },
      noiseScale: { value: nScale },
      lightDir: { value: PLANET_LIGHT_DIR.clone() },
      atmosphere: { value: atmo }
    },
    vertexShader: PLANET_VERTEX_SHADER,
    fragmentShader: PLANET_FRAGMENT_SHADER
  });
  const mesh = new Mesh(geo, mat);
  mesh.position.set(pos.x, pos.y, pos.z);
  group.add(mesh);
  planetMeshes.push({ mesh, geo, mat });
  createdObjects.push(mesh);
}

function createPlanets() {
  planetGroup = new Group();
  s_scene.add(planetGroup);
  createdObjects.push(planetGroup);

  createPlanet(planetGroup,
    new Color('#b33a00'), new Color('#d16830'), 8.0,
    { x: -300, y: 120, z: -450 }, 10, 0.3
  );
  createPlanet(planetGroup,
    new Color('#001e4d'), new Color('#ffffff'), 5.0,
    { x: 380, y: -100, z: -600 }, 14, 0.6
  );
  createPlanet(planetGroup,
    new Color('#666666'), new Color('#aaaaaa'), 15.0,
    { x: -180, y: -220, z: -350 }, 6, 0.1
  );
}

export function createTest1(container) {
  s_scene = new Scene();
  s_scene.fog = new FogExp2(FOG_COLOR, FOG_DENSITY);

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  c_camera = new PerspectiveCamera(CAMERA_FOV, width / height, CAMERA_NEAR, CAMERA_FAR);
  c_camera.position.z = CAMERA_Z;
  c_camera.lookAt(CAMERA_LOOKAT);

  createSaturn();
  createStarfield();
  createPlanets();

  renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  timer = new Timer();
  running = true;
  targetScale = IDLE_SCALE_BASE;
  targetRotX = IDLE_ROT_BASE;
  currentScale = IDLE_SCALE_BASE;
  currentRotX = IDLE_ROT_BASE;
  autoIdleTime = 0;
  isHandDetected = false;

  return { scene: s_scene, camera: c_camera, renderer };
}

export function setHandInput(detected, scale, rotX) {
  isHandDetected = !!detected;
  if (isHandDetected) {
    targetScale = scale;
    targetRotX = rotX;
  }
}

export function isHandActive() {
  return isHandDetected;
}

export function updateTest1() {
  if (!running || !timer) return { autoMode: !isHandDetected };

  timer.update();
  const elapsedTime = timer.getElapsed();

  if (uniformsSaturn) uniformsSaturn.uTime.value = elapsedTime;
  if (uniformsStars) uniformsStars.uTime.value = elapsedTime;

  if (stars) stars.rotation.y = elapsedTime * 0.005;
  if (nebula) nebula.rotation.y = elapsedTime * 0.003;

  if (planetGroup) {
    planetGroup.children.forEach((planet, idx) => {
      planet.rotation.y = elapsedTime * (0.05 + idx * 0.02);
    });
    planetGroup.rotation.y = Math.sin(elapsedTime * 0.05) * 0.02;
  }

  if (!isHandDetected) {
    autoIdleTime += IDLE_STEP;
    targetScale = IDLE_SCALE_BASE + Math.sin(autoIdleTime) * IDLE_SCALE_AMP;
    targetRotX = IDLE_ROT_BASE + Math.sin(autoIdleTime * 0.3) * IDLE_ROT_AMP;
  }

  currentScale += (targetScale - currentScale) * LERP_FACTOR;
  currentRotX += (targetRotX - currentRotX) * LERP_FACTOR;

  if (uniformsSaturn) {
    uniformsSaturn.uScale.value = currentScale;
    uniformsSaturn.uRotationX.value = currentRotX;
  }

  if (renderer && s_scene && c_camera) {
    renderer.render(s_scene, c_camera);
  }

  return { autoMode: !isHandDetected };
}

export function resizeTest1(width, height) {
  if (!c_camera || !renderer) return;
  c_camera.aspect = width / height;
  c_camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

export function disposeTest1() {
  running = false;
  if (s_scene) {
    createdObjects.forEach((obj) => { s_scene.remove(obj); });
  }
  createdObjects.length = 0;
  planetMeshes.length = 0;

  if (g_particles) { g_particles.dispose(); g_particles = null; }
  if (m_particles) { m_particles.dispose(); m_particles = null; }
  if (g_stars) { g_stars.dispose(); g_stars = null; }
  if (m_stars) { m_stars.dispose(); m_stars = null; }
  if (g_nebula) { g_nebula.dispose(); g_nebula = null; }
  if (m_nebula) { m_nebula.dispose(); m_nebula = null; }

  planetMeshes.forEach(({ geo, mat }) => {
    geo.dispose();
    mat.dispose();
  });
  planetMeshes = [];

  particles = null;
  stars = null;
  nebula = null;
  planetGroup = null;
  uniformsSaturn = null;
  uniformsStars = null;

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  s_scene = null;
  c_camera = null;
  timer = null;
}

export function getTest1Scene() { return s_scene; }
export function getTest1Camera() { return c_camera; }
export function getTest1Renderer() { return renderer; }
