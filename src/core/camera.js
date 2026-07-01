import { PerspectiveCamera, Vector3 } from '../../three.module.js';

const FOV = 60;
const NEAR = 0.1;
const FAR = 10000;
const DEFAULT_POS = new Vector3(0, 2, 14);
const LOOK_AT = new Vector3(0, 1, 0);

const LERP_FACTOR = 0.08;
const IDLE_SCALE_AMP = 0.22;
const IDLE_ROT_AMP = 0.18;
const IDLE_SCALE_BASE = 1.0;
const IDLE_ROT_BASE = 0.15;
const IDLE_STEP = 0.005;

let c_camera = null;
let targetScale = IDLE_SCALE_BASE;
let targetRotX = IDLE_ROT_BASE;
let currentScale = IDLE_SCALE_BASE;
let currentRotX = IDLE_ROT_BASE;
let isHandDetected = false;
let autoIdleTime = 0;

export function createCamera(aspect) {
  c_camera = new PerspectiveCamera(FOV, aspect, NEAR, FAR);
  c_camera.position.copy(DEFAULT_POS);
  c_camera.lookAt(LOOK_AT);
  targetScale = IDLE_SCALE_BASE;
  targetRotX = IDLE_ROT_BASE;
  currentScale = IDLE_SCALE_BASE;
  currentRotX = IDLE_ROT_BASE;
  autoIdleTime = 0;
  isHandDetected = false;
  return c_camera;
}

export function getCamera() {
  return c_camera;
}

export function setViewInput(detected, scale, rotX) {
  isHandDetected = !!detected;
  if (isHandDetected) {
    targetScale = scale;
    targetRotX = rotX;
  }
}

export function isViewHandActive() {
  return isHandDetected;
}

export function getCurrentScale() {
  return currentScale;
}

export function getCurrentRotX() {
  return currentRotX;
}

export function updateCamera(delta = 0) {
  if (!c_camera) return { autoMode: !isHandDetected };

  if (!isHandDetected) {
    autoIdleTime += IDLE_STEP;
    targetScale = IDLE_SCALE_BASE + Math.sin(autoIdleTime) * IDLE_SCALE_AMP;
    targetRotX = IDLE_ROT_BASE + Math.sin(autoIdleTime * 0.3) * IDLE_ROT_AMP;
  }

  currentScale += (targetScale - currentScale) * LERP_FACTOR;
  currentRotX += (targetRotX - currentRotX) * LERP_FACTOR;

  return { autoMode: !isHandDetected };
}

export function resizeCamera(aspect) {
  if (!c_camera) return;
  c_camera.aspect = aspect;
  c_camera.updateProjectionMatrix();
}

export function disposeCamera() {
  c_camera = null;
}
