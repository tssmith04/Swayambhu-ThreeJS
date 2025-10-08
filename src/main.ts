//  gltfpack -i public\models\temple_old.glb -o public\models\temple_opt.glb -cc -kn -km -tc -vp 15 -vt 12 -vn 8 -vc 8
// src/main.js
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls.js';

// UI elements from index.html
const app = document.getElementById('app');
const progressEl = document.getElementById('progress');
const barEl = document.getElementById('bar');
const msgEl = document.getElementById('msg');

function setProgress(active: boolean, ratio: number, text: string) {
    progressEl.style.opacity = active ? "1" : "0";
    if (ratio != null) barEl.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    msgEl.textContent = text ?? '';
}

// Renderer
const renderer = new THREE.WebGLRenderer({antialias: false, powerPreference: 'high-performance'});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// === Render budget / adaptive DPR ===
const HIGH_DPR = 1;     // start crisp; raise to 1.25 later if smooth
const LOW_DPR = 0.7;   // while moving
let targetDPR = HIGH_DPR;

renderer.setPixelRatio(targetDPR);

function setDPR(dpr) {
    if (Math.abs(renderer.getPixelRatio() - dpr) > 1e-3) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
}

// while the user is moving, drop DPR; restore shortly after movement stops
let settleTimer = null;

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
    settleTimer = setTimeout(() => {
        if (targetDPR !== HIGH_DPR) {
            targetDPR = HIGH_DPR;
            setDPR(targetDPR);
        }
    }, 250);
}


const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
const gltfLoader = new GLTFLoader()
    .setKTX2Loader(ktx2)
    .setMeshoptDecoder(MeshoptDecoder);

// Scene + Camera + Controls
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1116);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(4, 3, 8);

// First-person pointer-lock controls
const controls = new PointerLockControls(camera, renderer.domElement);

// Click to lock pointer (enter FPS mode)
renderer.domElement.addEventListener('click', () => {
    controls.lock();
});

const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('dblclick', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);

    const targets: THREE.Object3D[] = [];
    // @ts-ignore
    scene.traverse(o => {
        if (o.isMesh) targets.push(o);
    });
    console.log("targets", targets.map(s => s.id));
    const hit = ray.intersectObjects(targets, true)[0];
    if (hit) {
        camera.position.copy(hit.point);
        camera.position.y += 1.7; // eye height
    }
});


// Show a tiny helper message when unlocked (optional)
controls.addEventListener('unlock', () => {
    msgEl.textContent = 'Click the canvas to enter first-person mode';
});

// === movement state ===
const keys = {w: false, a: false, s: false, d: false, shift: false};
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
});

// velocity (m/s) and simple damping
const velocity = new THREE.Vector3();
const accel = 15;          // walking acceleration
const maxSpeed = 5;        // walking speed (m/s)
const sprintMult = 1.7;    // hold Shift to sprint
const damping = 8;         // higher = snappier stop


// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x1b2230, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(10, 20, 10);
scene.add(dir);

// Optional ground grid
const grid = new THREE.GridHelper(100, 100, 0x334, 0x223);
grid.material.opacity = 0.25;
grid.material.transparent = true;
scene.add(grid);

// Load your FBX from /public
const MODEL_URL = '/models/temple.glb';

// Freeze transforms for a static scene: skip matrix updates every frame
function makeStatic(root: THREE.Group<THREE.Object3DEventMap>) {
    root.traverse(o => {
        if (o.isObject3D) {
            o.matrixAutoUpdate = false;
            o.updateMatrix();
        }
    });
    scene.updateMatrixWorld(true);
}

// Tighter frustum = less shaded stuff
function tightenFrustumTo(object: THREE.Group<THREE.Object3DEventMap>) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(1, size * 0.6);
    camera.near = Math.max(dist / 1500, 0.1);
    camera.far = dist * 5;
    camera.updateProjectionMatrix();
}

// Trim expensive material states & cap anisotropy
function optimizeMaterials(root: THREE.Group<THREE.Object3DEventMap>) {
    const maxAniso = renderer.capabilities.getMaxAnisotropy?.() ?? 8;
    root.traverse(o => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
            if (!m) continue;
            if (m.transparent && m.opacity >= 1.0) m.transparent = false;
            if (m.side !== THREE.FrontSide) m.side = THREE.FrontSide;
            m.depthWrite = true;
            m.depthTest = true;
            m.blending = THREE.NormalBlending;
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
        setProgress(false, 1, 'Parse complete');
        const root = gltf.scene;
        // Keep materials cheap; shadows already off in your code
        optimizeMaterials(root);

        scene.add(root);

        frameCameraOn(root);      // your existing framing (keeps the 1.7m eye bump)
        tightenFrustumTo(root);   // shrink far plane for less work
        makeStatic(root);         // freeze world xforms — big perf win for static scenes

        // compile shaders once to avoid on-first-seen hitch
        renderer.compile(scene, camera);
    },
    /* onProgress */ (ev) => {
        const r = ev.total ? ev.loaded / ev.total : null;
        setProgress(true, r, ev.total ? `Loading ${(100 * r).toFixed(1)}%` : `Loading… ${Math.round(ev.loaded / 1024 / 1024)} MB`);
    },
    /* onError */ (err) => {
        setProgress(false, 0, 'Error loading GLB');
        console.error(err);
    }
);


// Helpers
function frameCameraOn(obj) {
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

    // place camera at a corner looking at center
    const viewDir = new THREE.Vector3(1, 1, 1).normalize();
    camera.position.copy(center).addScaledVector(viewDir, distance);
    camera.lookAt(center);

    camera.near = Math.max(distance / 1000, 0.1);
    camera.far = Math.max(distance * 10, 2000);
    camera.updateProjectionMatrix();

    // eye height for FPS
    camera.position.y += 1.7;
}

// Resize & render loop
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

    if (controls.isLocked) {
        // detect movement intent (NEW)
        const anyKey = keys.w || keys.a || keys.s || keys.d;
        if (anyKey) movingStart();

        const speed = (keys.shift ? sprintMult : 1) * maxSpeed;

        const dir = new THREE.Vector3();
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

        dir.set(0, 0, 0);
        if (keys.w) dir.add(forward);
        if (keys.s) dir.sub(forward);
        if (keys.a) dir.add(right);
        if (keys.d) dir.sub(right);
        if (dir.lengthSq() > 0) dir.normalize();

        const targetVel = dir.multiplyScalar(speed);
        velocity.lerp(targetVel, 1 - Math.exp(-damping * dt));
        camera.position.addScaledVector(velocity, dt);

        // when no input, start restoring DPR (NEW)
        if (!anyKey && velocity.lengthSq() < 1e-4) movingStopSoon();
    }

    renderer.render(scene, camera);
}

animate();
