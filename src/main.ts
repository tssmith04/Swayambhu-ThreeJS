//  gltfpack -i public\models\temple_old.glb -o public\models\temple_opt.glb -cc -kn -km -tc -vp 15 -vt 12 -vn 8 -vc 8
// src/main.ts
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import './styles/global.css';
import {EXRLoader} from "three/examples/jsm/loaders/EXRLoader.js";

// ===================== UI =====================
const app = document.getElementById('app') as HTMLElement;
const progressEl = document.getElementById('progress') as HTMLElement;
const barEl = document.getElementById('bar') as HTMLElement;
const msgEl = document.getElementById('msg') as HTMLElement;

const pauseUi = document.getElementById('pause-ui') as HTMLElement;
const resumeButton = document.getElementById('resume') as HTMLButtonElement;

const introduction = document.getElementById('introduction') as HTMLElement;
const enterButton = document.getElementById('enter-button') as HTMLButtonElement;
const applicationContainer = document.getElementById('application-container') as HTMLElement;
const returnToIntroButton = document.getElementById('return-to-intro') as HTMLButtonElement;

enterButton.onclick = () => {
    applicationContainer.style.display = 'initial';
    introduction.style.display = 'none';
};

returnToIntroButton.onclick = () => {
    applicationContainer.style.display = 'none';
    introduction.style.display = '';
    controls.unlock();
};

resumeButton.onclick = () => controls.lock();

function setProgress(active: boolean, ratio: number, text: string) {
    progressEl.style.opacity = active ? '1' : '0';
    if (ratio != null) barEl.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    msgEl.textContent = text ?? '';
}

// ===================== Renderer =====================
const renderer = new THREE.WebGLRenderer({antialias: false, powerPreference: 'high-performance'});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15; // slightly dimmer than before
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// Even, realistic env lighting for PBR materials
const pmrem = new THREE.PMREMGenerator(renderer);
const sceneEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;


// === Adaptive DPR ===
const HIGH_DPR = 1;
const LOW_DPR = 0.7;
let targetDPR = HIGH_DPR;
renderer.setPixelRatio(targetDPR);

function setDPR(dpr: number) {
    if (Math.abs(renderer.getPixelRatio() - dpr) > 1e-3) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
}

let settleTimer: number | null = null;

function movingStart() {
    if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
    }
    if (targetDPR !== LOW_DPR) {
        targetDPR = LOW_DPR;
        setDPR(targetDPR);
    }
}

function movingStopSoon() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
        if (targetDPR !== HIGH_DPR) {
            targetDPR = HIGH_DPR;
            setDPR(targetDPR);
        }
    }, 250);
}

// ===================== Loaders =====================
const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
const gltfLoader = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);

// ===================== Scene / Camera / Controls =====================
const scene = new THREE.Scene();
scene.background = null;          // sky dome is the background
scene.environment = sceneEnv;     // PBR env lighting

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(4, 3, 8);

const controls = new PointerLockControls(camera, renderer.domElement);
const player = controls.object as THREE.Object3D;

// --- Device detection (stricter to avoid touch laptops) ---
const mqlCoarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
const uaMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
// treat as mobile only if it's truly a phone/tablet
let isMobile = mqlCoarse && uaMobile;

// Desktop: lock on click; Mobile: no pointer lock
if (!isMobile) {
  renderer.domElement.addEventListener('click', () => controls.lock());
}

// Cinematic fly-in
let isCinematic = false;

// Easing helpers
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('dblclick', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);

    const targets: THREE.Object3D[] = [];
    scene.traverse((o) => {
        // @ts-ignore runtime check
        if ((o as any).isMesh) targets.push(o);
    });
    const hit = ray.intersectObjects(targets, true)[0];
    if (hit) {
        const newPos = hit.point.clone();
        newPos.y += 1.7; // eye height
        player.position.copy(newPos); // move the player, not just the camera
    }
});

controls.addEventListener('lock', () => {
    msgEl.textContent = '';
    pauseUi.style.display = 'none';
});
controls.addEventListener('unlock', () => {
    pauseUi.style.display = 'grid';
});

// ===================== Input (Desktop only) =====================
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false, down: false };
if (!isMobile) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'Space') {
        keys.space = true;
        e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true; // sprint
    if (e.code === 'KeyQ') keys.down = true;                                   // descend
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'Space') { keys.space = false; e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
    if (e.code === 'KeyQ') keys.down = false;
  });
}

// ===================== Mobile controls (dual thumb) =====================
// --- Mobile look settings ---
const LOOK_DEADZONE = 0.12;   // radius [0..1] with no movement
const LOOK_MAX_SPEED = 2.6;   // rad/sec at full stick (≈149°/s)
const LOOK_CURVE = 1.7;       // >1 = softer near center, snappier at edge

// Right-pad vector in pad space: x (right +), y (down +), both in [-1,1]
const rightLookVec = new THREE.Vector2(0, 0);

// Mobile yaw/pitch accumulators (you already have these)
let mobileYaw = 0;
let mobilePitch = 0;             // accumulated pitch (applied to camera.rotation.x)
const mobileMove = new THREE.Vector2(0, 0); // x = left/right, y = fwd/back

if (isMobile) {
  // Initialize yaw/pitch from current orientation
  mobileYaw = player.rotation.y;
  mobilePitch = camera.rotation.x;

  // Basic pads (left: move, right: look)
  const padBase = `
    position: fixed; bottom: 16px; width: 140px; height: 140px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px; touch-action: none; user-select: none; z-index: 10;
    backdrop-filter: blur(2px);
  `;
  const stickBase = `
    position: absolute; width: 56px; height: 56px; left: 42px; top: 42px;
    background: rgba(255,255,255,0.28); border-radius: 50%; pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  `;

  const leftPad = document.createElement('div');
  leftPad.style.cssText = padBase + 'left: 16px;';
  const leftStick = document.createElement('div');
  leftStick.style.cssText = stickBase;
  leftPad.appendChild(leftStick);

  const rightPad = document.createElement('div');
  rightPad.style.cssText = padBase + 'right: 16px;';
  const rightStick = document.createElement('div');
  rightStick.style.cssText = stickBase;
  rightPad.appendChild(rightStick);

  document.body.appendChild(leftPad);
  document.body.appendChild(rightPad);

  // Helpers
  function padCenter(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 };
  }
  function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

  // LEFT: movement (WASD equivalent)
  leftPad.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  leftPad.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const { cx, cy, r } = padCenter(leftPad);
    const dx = (t.clientX - cx) / r;
    const dy = (t.clientY - cy) / r;
    const len = Math.hypot(dx, dy);
    const nx = (len > 1 ? dx / len : dx);
    const ny = (len > 1 ? dy / len : dy);
    // Visual
    leftStick.style.left = `${clamp(42 + nx * 42, 0, 84)}px`;
    leftStick.style.top  = `${clamp(42 + ny * 42, 0, 84)}px`;
    // Move vector (y inverted so up on pad = forward)
    mobileMove.set(nx, -ny);
  }, { passive: false });
  leftPad.addEventListener('touchend', () => {
    leftStick.style.left = '42px'; leftStick.style.top = '42px';
    mobileMove.set(0, 0);
  });

  // RIGHT: look (yaw/pitch)
    rightPad.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

    rightPad.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = rightPad.getBoundingClientRect();
    // Normalize to pad center in [-1,1]
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const r  = Math.min(rect.width, rect.height) / 2;

    let nx = (t.clientX - cx) / r;
    let ny = (t.clientY - cy) / r;
    const len = Math.hypot(nx, ny);
    if (len > 1) { nx /= len; ny /= len; } // clamp to circle

    // Store deflection (y down positive per screen coords)
    rightLookVec.set(nx, ny);

    // Move visual stick
    const stickRadius = 42; // matches your visual style
    rightStick.style.left = `${42 + nx * stickRadius}px`;
    rightStick.style.top  = `${42 + ny * stickRadius}px`;
    }, { passive: false });

    rightPad.addEventListener('touchend', () => {
    rightLookVec.set(0, 0);
    rightStick.style.left = '42px';
    rightStick.style.top  = '42px';
    });
}

// ===================== Movement =====================
const velocity = new THREE.Vector3();
const maxSpeed = 10;
const sprintMult = 1.7;
const damping = 8;

// ===================== Lights =====================
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.1);
//scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
//scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.4);
sun.position.set(10, 20, 10);
scene.add(sun);

// Nudge grid down to avoid z-fighting with the floor mesh
const grid = new THREE.GridHelper(100, 100, 0x334, 0x223);
(grid.material as THREE.Material & { opacity: number; transparent: boolean }).opacity = 0.25;
(grid.material as THREE.Material & { opacity: number; transparent: boolean }).transparent = true;
grid.position.y = -0.02;
scene.add(grid);

// ===================== Sky (Atmosphere) =====================

function addAtmosphere() {
    // skybox compression cli command: (70MB -> 0.7MB)
    // oiiotool qwantani_sunrise_puresky_4k.exr -d half --resize 2048x1024 --compression dwaa -o skybox.exr
    const pmrem = new THREE.PMREMGenerator(renderer);
    new EXRLoader().load('/models/skybox.exr', (tex: THREE.Texture) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmrem.fromEquirectangular(tex).texture;
        scene.background = envMap;     // or keep null if you want only lighting
        scene.environment = envMap;
        tex.dispose();
    });
}
addAtmosphere();

function addLotusFlowerTexture(){
    // 2. Load your PNG as a texture
    const loader = new THREE.TextureLoader();
    loader.load('/assets/images/lotusflower.png', (texture) => {
        // 3. Create a sprite material using the texture
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });

        // 4. Create the sprite
        let sprite = new THREE.Sprite(material);

        // Optional: set the size in world units
        // sprite.scale.set(width, height, 1);
        sprite.scale.set(10,10,1);

        // 5. Place it anywhere in 3D space
        // Example: (x, y, z) = (2, 1, -3)
        sprite.position.set(0,50,0);

        scene.add(sprite);
    });

}

addLotusFlowerTexture()

// ===================== GLB =====================
const MODEL_URL = '/models/temple_opt.glb';

function makeStatic(root: THREE.Object3D) {
    root.traverse((o: any) => {
        if (o.isObject3D) {
            o.matrixAutoUpdate = false;
            o.updateMatrix();
        }
    });
    scene.updateMatrixWorld(true);
}

function tightenFrustumTo(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(1, size * 0.6);
    camera.near = Math.max(dist / 1500, 0.1);
    camera.updateProjectionMatrix();
}

function optimizeMaterials(root: THREE.Object3D) {
  const maxAniso = (renderer.capabilities as any).getMaxAnisotropy?.() ?? 8;
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      if (m.transparent && m.opacity >= 1.0) m.transparent = false;
      m.depthWrite = true;
      m.depthTest = true;
      m.blending = THREE.NormalBlending;
      if ('envMapIntensity' in m) m.envMapIntensity = 1.4; // PBR reflection strength
      if (m.map && m.map.anisotropy) {
        m.map.anisotropy = Math.min(m.map.anisotropy, 4, maxAniso);
        m.map.needsUpdate = true;
      }
    }
  });
}

setProgress(true, 0, 'Starting download…');
gltfLoader.load(
    MODEL_URL,
    (gltf) => {
        const root = gltf.scene;
        scene.add(root);

    let placedAtSpawn = false;

    // Spawn: prefer "spawn", fallback to "stupa_lp"
    const spawn = root.getObjectByName('spawn') ?? root.getObjectByName('stupa_lp');

    setProgress(false, 1, 'Parse complete');
    optimizeMaterials(root);

    // If we have a spawn, launch the cinematic; otherwise frame normally.
    if (spawn) {
      startFlyIn(root, spawn);
      placedAtSpawn = true;
    } else {
      frameCameraOn(root);
    }

    // Keep sky safe and freeze static either way
    tightenFrustumTo(root);
    makeStatic(root);

    renderer.compile(scene, camera);
  },
  (ev) => {
    const r = ev.total ? ev.loaded / ev.total : 0;
    setProgress(
      true,
      r,
      ev.total ? `Loading ${(100 * r).toFixed(1)}%` : `Loading… ${Math.round(ev.loaded / 1024 / 1024)} MB`
    );
  },
  (err) => {
    setProgress(false, 0, 'Error loading GLB');
    console.error(err);
  }
);

// ===================== Helpers =====================
function frameCameraOn(obj: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);

    const fitHeight = maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));
    const fitWidth = fitHeight / camera.aspect;
    const distance = 1.2 * Math.max(fitHeight, fitWidth);

    const viewDir = new THREE.Vector3(1, 1, 1).normalize();
    camera.position.copy(center).addScaledVector(viewDir, distance);
    camera.lookAt(center);

    camera.near = Math.max(distance / 1000, 0.1);

    camera.updateProjectionMatrix();

    // keep a natural initial eye height
    player.position.y = Math.max(player.position.y, center.y + 1.7);
}

// Smooth orbit → descend (continuous) → ease to default spawn look
function startFlyIn(root: THREE.Object3D, spawn: THREE.Object3D) {
  // World-space spawn eye position
  const spawnPos = new THREE.Vector3();
  spawn.getWorldPosition(spawnPos);
  spawnPos.y += 1.7;

  // Bounds to size the path
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3(); box.getCenter(center);
  const size = new THREE.Vector3();   box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  // Orbit sizing (tweak here)
  const radius      = Math.max(30, maxDim * 0.9);
  const orbitHeight = Math.max(22, maxDim * 0.55);

  // We want to finish orbit directly above spawn
  const endAngle = Math.atan2(spawnPos.z - center.z, spawnPos.x - center.x);
  const turns = 1.0;                                     // 1 full circle
  const startAngle = endAngle - turns * Math.PI * 2;     // start opposite and come around

  // Timing (slower)
  const ORBIT_PORTION = 0.72;  // percent of total spent orbiting (rest is descend+orient)
  const TOTAL_DUR     = 9500;  // ms (slow down overall)
  const ORIENT_DUR    = 900;   // final look ease at spawn (included after TOTAL_DUR)

  // Final yaw from spawn (for your default look)
  const wq = new THREE.Quaternion(); spawn.getWorldQuaternion(wq);
  const spawnEuler = new THREE.Euler().setFromQuaternion(wq, 'YXZ');
  const targetYaw  = spawnEuler.y;

  // Helpers
  function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
  function easeInOutCubic(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
  function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

  // Start state
  const t0 = performance.now();
  isCinematic = true;

  // Precompute orbit start point
  const orbitStart = new THREE.Vector3(
    center.x + Math.cos(startAngle) * radius,
    center.y + orbitHeight,
    center.z + Math.sin(startAngle) * radius
  );

  // A point directly above spawn to start the descent (same xz, higher y)
  const aboveSpawn = spawnPos.clone();
  aboveSpawn.y = Math.max(spawnPos.y + orbitHeight * 0.85, spawnPos.y + 18);

  // Run
  function tick() {
    const now = performance.now();
    const tAll = Math.max(0, (now - t0) / TOTAL_DUR);

    if (tAll <= 1) {
      // ---- Single continuous motion composed of two parts ----
      // Part A (0..ORBIT_PORTION): orbit around center; always look at spawn.
      // Part B (ORBIT_PORTION..1): smooth path from end-of-orbit to aboveSpawn and down to spawn.
      const pos = new THREE.Vector3();

      if (tAll <= ORBIT_PORTION) {
        const tr = easeInOutCubic(tAll / ORBIT_PORTION);      // 0..1
        const theta = startAngle + (endAngle - startAngle) * tr;
        pos.set(
          center.x + Math.cos(theta) * radius,
          center.y + orbitHeight,
          center.z + Math.sin(theta) * radius
        );
      } else {
        const td = (tAll - ORBIT_PORTION) / (1 - ORBIT_PORTION);  // 0..1
        // end-of-orbit position (directly above spawn horizontally)
        const orbitEnd = new THREE.Vector3(
          center.x + Math.cos(endAngle) * radius,
          center.y + orbitHeight,
          center.z + Math.sin(endAngle) * radius
        ).lerp(new THREE.Vector3(spawnPos.x, orbitHeight + center.y, spawnPos.z), 0.0); // keep circle end

        // Two-stage descend with no pause: orbitEnd -> aboveSpawn -> spawnPos
        const tSmooth = easeInOutCubic(td);
        const midBlend = clamp01(tSmooth * 1.15); // spend a hair more time approaching aboveSpawn
        const topPath = orbitEnd.clone().lerp(aboveSpawn, easeOutCubic(Math.min(1, midBlend)));
        pos.copy(topPath.lerp(spawnPos, clamp01(tSmooth * tSmooth))); // bias later into spawn
      }

      // Place the player/camera and keep gaze locked on spawn
      player.position.copy(pos);
      camera.lookAt(spawnPos);

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
      return;
    }

    // === Landed: ease into your default spawn look ===
    const landStart = performance.now();
    const startYaw = player.rotation.y;
    const startPitch = camera.rotation.x;
    const startRoll = camera.rotation.z;

    function orient() {
      const k = clamp01((performance.now() - landStart) / ORIENT_DUR);
      const e = easeInOutCubic(k);

      // Snap position (if slight drift)
      player.position.copy(spawnPos);

      // Shortest yaw interpolation
      let dYaw = targetYaw - startYaw;
      dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
      player.rotation.y = startYaw + dYaw * e;

      camera.rotation.x = startPitch * (1 - e) + 0 * e;
      camera.rotation.z = startRoll  * (1 - e) + 0 * e;

      renderer.render(scene, camera);

      if (k < 1) {
        requestAnimationFrame(orient);
      } else {
        isCinematic = false;
        // Desktop: lock so the user can immediately look around
        if (!isMobile) controls.lock();
      }
    }

    orient();
  }

  requestAnimationFrame(tick);
}

// ===================== Resize & Loop =====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let last = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

  // === Determine input source (desktop vs mobile) ===
  const useDesktopControls = !isMobile && controls.isLocked && !isCinematic;
  const useMobileControls = isMobile && !isCinematic; // always active on mobile

  if (useDesktopControls || useMobileControls) {
    // Lower DPR while moving (reused heuristic)
    if (useDesktopControls) {
      const anyKey = keys.w || keys.a || keys.s || keys.d || keys.space || keys.shift || keys.down;
      if (anyKey) movingStart(); else if (velocity.lengthSq() < 1e-4) movingStopSoon();
    } else {
      // On mobile, treat any joystick input as "moving"
      if (mobileMove.lengthSq() > 1e-4) movingStart(); else if (velocity.lengthSq() < 1e-4) movingStopSoon();
    }

    // --- Look (mobile only): apply yaw/pitch to player/camera
    if (useMobileControls) {
    // Compute angular velocity from joystick with deadzone + curve
        const mag = rightLookVec.length();
        let gain = 0;
        if (mag > LOOK_DEADZONE) {
            const t = (mag - LOOK_DEADZONE) / (1 - LOOK_DEADZONE);   // remap to [0..1]
            gain = Math.pow(t, LOOK_CURVE);                          // nonlinear response
        }

        // Direction unit vector (avoid NaNs)
        const ux = mag > 1e-6 ? (rightLookVec.x / mag) : 0;
        const uy = mag > 1e-6 ? (rightLookVec.y / mag) : 0;

        // Angular velocity (rad/s). NOTE: up on pad (ny < 0) should look up → negative pitch delta
        const yawVel   = (-ux) * LOOK_MAX_SPEED * gain;   // right deflection turns view to the right
        const pitchVel = (-uy) * LOOK_MAX_SPEED * gain;   // up deflection pitches up

        // Integrate yaw/pitch (local, no roll)
        mobileYaw   += yawVel * dt;
        mobilePitch += pitchVel * dt;
        mobilePitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, mobilePitch));

        // Apply to camera **locally** (don't rotate the player/body)
        camera.rotation.order = 'YXZ';   // yaw, then pitch, no roll
        camera.rotation.y = mobileYaw;   // local yaw around camera's Y (relative to player)
        camera.rotation.x = mobilePitch; // local pitch around camera's X
        camera.rotation.z = 0;
    }

    // --- Speed (desktop: sprint via shift; mobile: fixed speed)
    const speed = useDesktopControls ? ((keys.shift ? sprintMult : 1) * maxSpeed) : maxSpeed;

    // --- Get forward/right from camera (yaw direction)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

    // --- Intent vector
    const dir = new THREE.Vector3(0, 0, 0);
    if (useDesktopControls) {
      if (keys.w) dir.add(forward);
      if (keys.s) dir.sub(forward);
      if (keys.a) dir.add(right);
      if (keys.d) dir.sub(right);
    } else {
        // mobileMove: x = left/right, y = forward/back
        if (mobileMove.y !== 0) dir.add(forward.clone().multiplyScalar(mobileMove.y));   // forward/back normal
        if (mobileMove.x !== 0) dir.add(right.clone().multiplyScalar(-mobileMove.x));
    }
    if (dir.lengthSq() > 0) dir.normalize();

    // --- Horizontal velocity smoothing
    const targetVel = dir.multiplyScalar(speed);
    velocity.lerp(targetVel, 1 - Math.exp(-damping * dt));

    // --- Apply horizontal move
    player.position.addScaledVector(velocity, dt);

    // --- Vertical move (desktop only): Space up, Q down
    if (useDesktopControls) {
      let vy = 0;
      if (keys.space) vy += speed;
      if (keys.down)  vy -= speed;
      if (vy !== 0) player.position.y += vy * dt;
    }
  }

  renderer.render(scene, camera);
}

animate();
