// [Author: Thomas Smith]
// World state creation (renderer, scene, camera, base config)
// [Author: leoata]

import * as THREE from 'three';
import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {WorldState} from './types';

export function createWorldState(app: HTMLElement): WorldState {
    const renderer = new THREE.WebGLRenderer({antialias: false, powerPreference: 'high-performance'});
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // [Author: Thomas Smith]
    renderer.toneMappingExposure = 1.15; // slightly dimmer than before

    const HIGH_DPR = 1;
    renderer.setPixelRatio(HIGH_DPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.appendChild(renderer.domElement);

    // [Author: Thomas Smith]
    // Even, realistic env lighting for PBR materials
    const pmrem = new THREE.PMREMGenerator(renderer);
    const sceneEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // [Author: Thomas Smith]
    // ===================== Scene / Camera / Controls =====================
    const scene = new THREE.Scene();
    scene.background = null; // sky dome is the background
    scene.environment = sceneEnv; // PBR env lighting

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(4, 3, 8);

    const controls = new PointerLockControls(camera, renderer.domElement);
    const player = controls.object as THREE.Object3D;

    // [Author: Thomas Smith]
    // --- Device detection (stricter to avoid touch laptops) ---
    const mqlCoarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const uaMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isMobile = mqlCoarse && uaMobile;

    // [Author: Thomas Smith]
    // ===================== Movement Defaults =====================
    const movement = {
        velocity: new THREE.Vector3(),
        maxSpeed: 10,
        sprintMult: 1.7,
        damping: 8
    };

    const input = {
        keys: {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
            space: false,
            down: false
        }
    };

    const mobile = {
        rightLookVec: new THREE.Vector2(0, 0),
        mobileYaw: player.rotation.y,
        mobilePitch: camera.rotation.x,
        mobileMove: new THREE.Vector2(0, 0)
    };

    const dpr = {
        high: HIGH_DPR,
        low: 0.7,
        target: HIGH_DPR,
        settleTimer: null as number | null
    };

    // [Author: Thomas Smith]
    // ===================== Lights =====================
    const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.1);
    // [Author: leoata]
    //scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    //scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.4);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    // Nudge grid down to avoid z-fighting with the floor mesh
    const grid = new THREE.GridHelper(100, 100, 0x334, 0x223);
    (grid.material as THREE.Material & {opacity: number; transparent: boolean}).opacity = 0.25;
    (grid.material as THREE.Material & {opacity: number; transparent: boolean}).transparent = true;
    grid.position.y = -0.02;
    scene.add(grid);

    const state: WorldState = {
        renderer,
        scene,
        camera,
        controls,
        player,
        isMobile,
        isCinematic: false,
        dpr,
        movement,
        input,
        mobile
    };

    return state;
}
