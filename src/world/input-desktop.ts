// [Author: Thomas Smith]
// Desktop input (keyboard, pointer lock, dbl-click teleport)
// [Author: leoata]

import * as THREE from 'three';
import {WorldState} from './types';

export function setupDesktopInput(state: WorldState) {
    const {renderer, controls, input, camera, scene, player, isMobile} = state;

    if (!isMobile) {
        // [Author: leoata]
        renderer.domElement.addEventListener('click', () => controls.lock());
    }

    if (!isMobile) {
        window.addEventListener(
            'keydown',
            (e) => {
                if (e.code === 'KeyW') input.keys.w = true;
                if (e.code === 'KeyA') input.keys.a = true;
                if (e.code === 'KeyS') input.keys.s = true;
                if (e.code === 'KeyD') input.keys.d = true;
                if (e.code === 'Space') {
                    input.keys.space = true;
                    e.preventDefault();
                }
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.keys.shift = true;
                if (e.code === 'KeyQ') input.keys.down = true;
            },
            {passive: false}
        );

        window.addEventListener(
            'keyup',
            (e) => {
                if (e.code === 'KeyW') input.keys.w = false;
                if (e.code === 'KeyA') input.keys.a = false;
                if (e.code === 'KeyS') input.keys.s = false;
                if (e.code === 'KeyD') input.keys.d = false;
                if (e.code === 'Space') {
                    input.keys.space = false;
                    e.preventDefault();
                }
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.keys.shift = false;
                if (e.code === 'KeyQ') input.keys.down = false;
            },
            {passive: false}
        );
    }

    // [Author: leoata]
    // Double-click teleport to surface
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
            player.position.copy(newPos);
        }
    });
}
