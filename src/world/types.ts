// [Author: Thomas Smith]
// Shared world types
// [Author: leoata]

import * as THREE from 'three';
import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls.js';

export interface WorldDprState {
    high: number;
    low: number;
    target: number;
    settleTimer: number | null;
}

export interface WorldMovementState {
    velocity: THREE.Vector3;
    maxSpeed: number;
    sprintMult: number;
    damping: number;
}

export interface WorldInputState {
    keys: {
        w: boolean;
        a: boolean;
        s: boolean;
        d: boolean;
        shift: boolean;
        space: boolean;
        down: boolean;
    };
}

export interface WorldMobileState {
    rightLookVec: THREE.Vector2;
    mobileYaw: number;
    mobilePitch: number;
    mobileMove: THREE.Vector2;
}

export interface WorldState {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: PointerLockControls;
    player: THREE.Object3D;
    isMobile: boolean;
    isCinematic: boolean;
    dpr: WorldDprState;
    movement: WorldMovementState;
    input: WorldInputState;
    mobile: WorldMobileState;
}

export interface WorldOptions {
    isEducationalMode: () => boolean;
    onUpdateAnnotations: (player: THREE.Object3D) => void;
}

export interface World {
    controls: PointerLockControls;
    start: (options: WorldOptions) => void;
    enableEducationalMode: () => void;
}
