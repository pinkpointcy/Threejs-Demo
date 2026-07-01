import { Timer } from '../three.module.js';
import { createScene, getScene, getRenderer, resizeScene, disposeScene } from './core/scene.js';
import {
  createCamera, getCamera, updateCamera, resizeCamera, disposeCamera,
  setViewInput, isViewHandActive, getCurrentScale, getCurrentRotX
} from './core/camera.js';
import { createWorld, updateWorld, disposeWorld } from './core/world.js';

const CONTAINER_ID = 'app';
const VIDEO_CLASS = 'input_video';
const STATUS_ID = 'status-indicator';
const LOADING_ID = 'loading';

const SCALE_MIN = 0.15;
const SCALE_MAX = 2.5;
const SCALE_RANGE = SCALE_MAX - SCALE_MIN;
const PINCH_MIN = 0.02;
const PINCH_MAX = 0.27;
const PINCH_RANGE = PINCH_MAX - PINCH_MIN;

const ROTX_MIN = -0.6;
const ROTX_MAX = 1.0;
const ROTX_RANGE = ROTX_MAX - ROTX_MIN;
const PALM_Y_MIN = 0.1;
const PALM_Y_MAX = 0.9;
const PALM_Y_RANGE = PALM_Y_MAX - PALM_Y_MIN;

let container = null;
let timer = null;
let rafId = null;
let running = false;

let statusEl = null;
let loadingEl = null;
let handsInstance = null;
let cameraUtilsInstance = null;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function getViewportSize() {
  const w = container ? (container.clientWidth || window.innerWidth) : window.innerWidth;
  const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
  return { width: w, height: h };
}

function onResize() {
  const { width, height } = getViewportSize();
  resizeScene(width, height);
  resizeCamera(width / height);
}

function updateStatusUI(autoMode) {
  if (!statusEl) return;
  if (autoMode) {
    statusEl.innerHTML = '系统状态: 自动巡航<br>输入信号: 等待中...';
    statusEl.style.color = '#667788';
  } else {
    statusEl.innerHTML = '系统状态: 手动接管<br>输入信号: <span class="highlight">已锁定</span>';
    statusEl.style.color = '#ff7be0';
  }
}

function hideLoading() {
  if (!loadingEl) return;
  loadingEl.style.display = 'none';
}

function showLoadingError(msg) {
  if (!loadingEl) return;
  loadingEl.innerText = msg;
}

function onHandResults(results) {
  hideLoading();
  if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const hand = results.multiHandLandmarks[0];
    const p1 = hand[4];
    const p2 = hand[8];
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normDist = clamp01((dist - PINCH_MIN) / PINCH_RANGE);
    const scale = SCALE_MIN + normDist * SCALE_RANGE;

    const palm = hand[9];
    const normY = clamp01((palm.y - PALM_Y_MIN) / PALM_Y_RANGE);
    const rotX = ROTX_MIN + normY * ROTX_RANGE;

    setViewInput(true, scale, rotX);
  } else {
    setViewInput(false, 0, 0);
  }
}

function initHandsTracking() {
  if (typeof window === 'undefined') return;
  const HandsCtor = window.Hands;
  const CameraCtor = window.Camera;
  const videoEl = document.getElementsByClassName(VIDEO_CLASS)[0];
  if (!HandsCtor || !CameraCtor || !videoEl) return;

  try {
    handsInstance = new HandsCtor({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    handsInstance.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });
    handsInstance.onResults(onHandResults);

    cameraUtilsInstance = new CameraCtor(videoEl, {
      onFrame: async () => {
        if (handsInstance) await handsInstance.send({ image: videoEl });
      },
      width: 640,
      height: 480
    });
    cameraUtilsInstance.start().catch(() => {
      showLoadingError('摄像头启动失败，切换至自动演示');
    });
  } catch (e) {
    showLoadingError('手势模块加载失败，切换至自动演示');
  }
}

function animate() {
  if (!running) return;
  rafId = requestAnimationFrame(animate);

  timer.update();
  const delta = Math.min(timer.getDelta(), 0.1);
  const elapsed = timer.getElapsed();

  const camRes = updateCamera(delta);
  const autoMode = camRes ? camRes.autoMode : true;
  updateStatusUI(autoMode);

  const scale = getCurrentScale();
  const rotX = getCurrentRotX();

  updateWorld(delta, {
    time: elapsed,
    scale: scale,
    rotX: rotX
  });

  const renderer = getRenderer();
  const scene = getScene();
  const camera = getCamera();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function toggleFullScreen() {
  if (typeof document === 'undefined') return;
  if (!document.fullscreenElement) {
    const el = document.documentElement;
    if (el && el.requestFullscreen) el.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

export function start() {
  if (running) return;

  if (typeof document === 'undefined') return;
  container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  statusEl = document.getElementById(STATUS_ID);
  loadingEl = document.getElementById(LOADING_ID);
  if (typeof window !== 'undefined') window.toggleFullScreen = toggleFullScreen;

  const { width, height } = getViewportSize();

  createScene(container);
  createCamera(width / height);
  createWorld();

  timer = new Timer();
  running = true;

  setTimeout(hideLoading, 350);

  animate();
  window.addEventListener('resize', onResize);
  initHandsTracking();
}

export function stop() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onResize);
    if (window.toggleFullScreen) delete window.toggleFullScreen;
  }
  if (cameraUtilsInstance && typeof cameraUtilsInstance.stop === 'function') {
    try { cameraUtilsInstance.stop(); } catch (e) { /* noop */ }
  }
  if (handsInstance && typeof handsInstance.close === 'function') {
    try { handsInstance.close(); } catch (e) { /* noop */ }
  }
  cameraUtilsInstance = null;
  handsInstance = null;
  disposeWorld();
  disposeCamera();
  disposeScene();
  container = null;
  timer = null;
  statusEl = null;
  loadingEl = null;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
