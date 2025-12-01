// [Author: Thomas Smith]
// Movement and navigation update step
// [Author: leoata]

import * as THREE from 'three';
import {WorldState} from './types';
import {movingStart, movingStopSoon} from './dpr';
import {applyMobileLook} from './input-mobile';

interface MovementFlags {
    useDesktopControls: boolean;
    useMobileControls: boolean;
}

export function updateMovement(state: WorldState, dt: number, flags: MovementFlags) {
    const {useDesktopControls, useMobileControls} = flags;
    const {controls, movement, input, mobile, camera, player, isMobile} = state;
    const {velocity, maxSpeed, sprintMult, damping} = movement;

    if (!useDesktopControls && !useMobileControls) {
        return;
    }

    if (useDesktopControls) {
        const k = input.keys;
        const anyKey = k.w || k.a || k.s || k.d || k.space || k.shift || k.down;
        if (anyKey) movingStart(state);
        else if (velocity.lengthSq() < 1e-4) movingStopSoon(state);
    } else {
        if (mobile.mobileMove.lengthSq() > 1e-4) movingStart(state);
        else if (velocity.lengthSq() < 1e-4) movingStopSoon(state);
    }

    // [Author: Thomas Smith]
    if (useMobileControls) {
        applyMobileLook(state, dt);
    }

    const speed = useDesktopControls ? (input.keys.shift ? sprintMult : 1) * maxSpeed : maxSpeed;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

    const dir = new THREE.Vector3(0, 0, 0);
    if (useDesktopControls) {
        if (input.keys.w) dir.add(forward);
        if (input.keys.s) dir.sub(forward);
        if (input.keys.a) dir.add(right);
        if (input.keys.d) dir.sub(right);
    } else {
        if (mobile.mobileMove.y !== 0) {
            dir.add(forward.clone().multiplyScalar(mobile.mobileMove.y));
        }
        if (mobile.mobileMove.x !== 0) {
            dir.add(right.clone().multiplyScalar(-mobile.mobileMove.x));
        }
    }
    if (dir.lengthSq() > 0) dir.normalize();

    const targetVel = dir.multiplyScalar(speed);
    velocity.lerp(targetVel, 1 - Math.exp(-damping * dt));

    player.position.addScaledVector(velocity, dt);

    if (useDesktopControls) {
        let vy = 0;
        if (input.keys.space) vy += speed;
        if (input.keys.down) vy -= speed;
        if (vy !== 0) player.position.y += vy * dt;
    }

    void controls;
    void isMobile;
}
