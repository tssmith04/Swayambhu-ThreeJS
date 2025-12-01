// [Author: Thomas Smith]
// GLB loading and camera / material helpers
// [Author: leoata]

import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {WorldState} from './types';
import {setProgress} from '../ui';

const MODEL_URL = '/models/temple_opt.glb';

// [Author: leoata]
function makeStatic(scene: THREE.Scene, root: THREE.Object3D) {
    root.traverse((o: any) => {
        if (o.isObject3D) {
            o.matrixAutoUpdate = false;
            o.updateMatrix();
        }
    });
    scene.updateMatrixWorld(true);
}

// [Author: Thomas Smith]
function tightenFrustumTo(camera: THREE.PerspectiveCamera, object: THREE.Object3D) {
    // [Author: leoata]
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(1, size * 0.6);
    camera.near = Math.max(dist / 1500, 0.1);
    camera.updateProjectionMatrix();
}

// [Author: Thomas Smith]
function optimizeMaterials(renderer: THREE.WebGLRenderer, root: THREE.Object3D) {
    // [Author: leoata]
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
            if ('envMapIntensity' in m) m.envMapIntensity = 1.4;
            if (m.map && m.map.anisotropy) {
                m.map.anisotropy = Math.min(m.map.anisotropy, 4, maxAniso);
                m.map.needsUpdate = true;
            }
        }
    });
}

// [Author: Thomas Smith]
function frameCameraOn(camera: THREE.PerspectiveCamera, player: THREE.Object3D, obj: THREE.Object3D) {
    // [Author: leoata]
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

    player.position.y = Math.max(player.position.y, center.y + 1.7);
}

// [Author: Thomas Smith]
// Smooth orbit → descend → ease to spawn look
function startFlyIn(state: WorldState, root: THREE.Object3D, spawn: THREE.Object3D) {
    const {camera, player, renderer, isMobile} = state;

    // [Author: leoata]
    const spawnPos = new THREE.Vector3();
    spawn.getWorldPosition(spawnPos);
    spawnPos.y += 1.7;

    const box = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    const radius = Math.max(30, maxDim * 0.9);
    const orbitHeight = Math.max(22, maxDim * 0.55);

    const endAngle = Math.atan2(spawnPos.z - center.z, spawnPos.x - center.x);
    const turns = 1.0;
    const startAngle = endAngle - turns * Math.PI * 2;

    const ORBIT_PORTION = 0.72;
    const TOTAL_DUR = 9500;
    const ORIENT_DUR = 900;

    const wq = new THREE.Quaternion();
    spawn.getWorldQuaternion(wq);
    const spawnEuler = new THREE.Euler().setFromQuaternion(wq, 'YXZ');
    const targetYaw = spawnEuler.y;

    function clamp01(x: number) {
        return Math.max(0, Math.min(1, x));
    }

    function easeInOutCubic(t: number) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function easeOutCubic(t: number) {
        return 1 - Math.pow(1 - t, 3);
    }

    const t0 = performance.now();
    state.isCinematic = true;

    const orbitStart = new THREE.Vector3(
        center.x + Math.cos(startAngle) * radius,
        center.y + orbitHeight,
        center.z + Math.sin(startAngle) * radius
    );

    const aboveSpawn = spawnPos.clone();
    aboveSpawn.y = Math.max(spawnPos.y + orbitHeight * 0.85, spawnPos.y + 18);

    function tick() {
        const now = performance.now();
        const tAll = Math.max(0, (now - t0) / TOTAL_DUR);
        const pos = new THREE.Vector3();

        if (tAll <= 1) {
            if (tAll <= ORBIT_PORTION) {
                const tr = easeInOutCubic(tAll / ORBIT_PORTION);
                const theta = startAngle + (endAngle - startAngle) * tr;
                pos.set(
                    center.x + Math.cos(theta) * radius,
                    center.y + orbitHeight,
                    center.z + Math.sin(theta) * radius
                );
            } else {
                const td = (tAll - ORBIT_PORTION) / (1 - ORBIT_PORTION);
                const orbitEnd = new THREE.Vector3(
                    center.x + Math.cos(endAngle) * radius,
                    center.y + orbitHeight,
                    center.z + Math.sin(endAngle) * radius
                ).lerp(new THREE.Vector3(spawnPos.x, orbitHeight + center.y, spawnPos.z), 0.0);

                const tSmooth = easeInOutCubic(td);
                const midBlend = clamp01(tSmooth * 1.15);
                const topPath = orbitEnd.clone().lerp(aboveSpawn, easeOutCubic(Math.min(1, midBlend)));
                pos.copy(topPath.lerp(spawnPos, clamp01(tSmooth * tSmooth)));
            }

            player.position.copy(pos);
            camera.lookAt(spawnPos);
            renderer.render(state.scene, camera);
            requestAnimationFrame(tick);
            return;
        }

        const landStart = performance.now();
        const startYaw = player.rotation.y;
        const startPitch = camera.rotation.x;
        const startRoll = camera.rotation.z;

        function orient() {
            const k = clamp01((performance.now() - landStart) / ORIENT_DUR);
            const e = easeInOutCubic(k);

            player.position.copy(spawnPos);

            let dYaw = targetYaw - startYaw;
            dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
            player.rotation.y = startYaw + dYaw * e;

            camera.rotation.x = startPitch * (1 - e);
            camera.rotation.z = startRoll * (1 - e);

            renderer.render(state.scene, camera);

            if (k < 1) {
                requestAnimationFrame(orient);
            } else {
                state.isCinematic = false;
                if (!isMobile) state.controls.lock();
            }
        }

        orient();
    }

    void orbitStart; // keeps lint happy if unused variable detection is on

    requestAnimationFrame(tick);
}

// [Author: leoata]
export function loadModel(state: WorldState) {
    const {renderer, scene, camera, player} = state;

    const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
    const gltfLoader = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);

    setProgress(true, 0, 'Starting download…');

    gltfLoader.load(
        MODEL_URL,
        (gltf) => {
            const root = gltf.scene;
            scene.add(root);
            let placedAtSpawn = false;

            const spawn = root.getObjectByName('spawn') ?? root.getObjectByName('stupa_lp');

            setProgress(false, 1, 'Parse complete');
            optimizeMaterials(renderer, root);

            if (spawn) {
                startFlyIn(state, root, spawn);
                placedAtSpawn = true;
            } else {
                frameCameraOn(camera, player, root);
            }

            tightenFrustumTo(camera, root);
            makeStatic(scene, root);

            renderer.compile(scene, camera);
            void placedAtSpawn;
        },
        (ev) => {
            const r = ev.total ? ev.loaded / ev.total : 0;
            setProgress(
                true,
                r,
                ev.total
                    ? `Loading ${(100 * r).toFixed(1)}%`
                    : `Loading… ${Math.round(ev.loaded / 1024 / 1024)} MB`
            );
        },
        (err) => {
            setProgress(false, 0, 'Error loading GLB');
            console.error(err);
        }
    );
}
