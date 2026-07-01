import {
  Scene,
  WebGLRenderer,
  Color,
  SRGBColorSpace,
  PCFShadowMap,
  AmbientLight,
  DirectionalLight,
  FogExp2
} from '../../three.module.js';

const BG_COLOR = 0x02030a;
const FOG_COLOR = 0x020205;
const FOG_DENSITY = 0.00018;

const AMBIENT_COLOR = 0x202030;
const AMBIENT_INTENSITY = 0.35;

const DIR_COLOR = 0xbfd4ff;
const DIR_INTENSITY = 0.6;
const DIR_POS_X = 8;
const DIR_POS_Y = 12;
const DIR_POS_Z = 6;

let s_scene = null;
let renderer = null;
let lightAmbient = null;
let lightDir = null;

export function createScene(container) {
  s_scene = new Scene();
  s_scene.background = new Color(BG_COLOR);
  s_scene.fog = new FogExp2(FOG_COLOR, FOG_DENSITY);

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  lightAmbient = new AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY);
  s_scene.add(lightAmbient);

  lightDir = new DirectionalLight(DIR_COLOR, DIR_INTENSITY);
  lightDir.position.set(DIR_POS_X, DIR_POS_Y, DIR_POS_Z);
  lightDir.castShadow = true;
  lightDir.shadow.mapSize.width = 2048;
  lightDir.shadow.mapSize.height = 2048;
  lightDir.shadow.camera.near = 0.5;
  lightDir.shadow.camera.far = 200;
  lightDir.shadow.camera.left = -40;
  lightDir.shadow.camera.right = 40;
  lightDir.shadow.camera.top = 40;
  lightDir.shadow.camera.bottom = -40;
  s_scene.add(lightDir);

  return { scene: s_scene, renderer };
}

export function getScene() {
  return s_scene;
}

export function getRenderer() {
  return renderer;
}

export function resizeScene(width, height) {
  if (!renderer) return;
  renderer.setSize(width, height);
}

export function disposeScene() {
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  s_scene = null;
  lightAmbient = null;
  lightDir = null;
}
