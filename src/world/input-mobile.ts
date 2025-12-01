// [Author: Thomas Smith]
// ===================== Mobile controls (dual thumb) =====================
// [Author: leoata]

import {WorldState} from './types';

export const LOOK_DEADZONE = 0.12; // radius [0..1] with no movement
export const LOOK_MAX_SPEED = 2.6; // rad/sec at full stick (≈149°/s)
export const LOOK_CURVE = 1.7; // >1 = softer near center, snappier at edge

export function setupMobileInput(state: WorldState) {
    if (!state.isMobile) return;

    const {mobile, camera, player} = state;

    // Initialize yaw/pitch from current orientation
    mobile.mobileYaw = player.rotation.y;
    mobile.mobilePitch = camera.rotation.x;

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

    function padCenter(el: HTMLElement) {
        const r = el.getBoundingClientRect();
        return {cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2};
    }

    function clamp(n: number, a: number, b: number) {
        return Math.max(a, Math.min(b, n));
    }

    // LEFT: movement (WASD equivalent)
    leftPad.addEventListener('touchstart', (e) => e.preventDefault(), {passive: false});
    leftPad.addEventListener(
        'touchmove',
        (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const {cx, cy, r} = padCenter(leftPad);
            const dx = (t.clientX - cx) / r;
            const dy = (t.clientY - cy) / r;
            const len = Math.hypot(dx, dy);
            const nx = len > 1 ? dx / len : dx;
            const ny = len > 1 ? dy / len : dy;

            leftStick.style.left = `${clamp(42 + nx * 42, 0, 84)}px`;
            leftStick.style.top = `${clamp(42 + ny * 42, 0, 84)}px`;

            mobile.mobileMove.set(nx, -ny);
        },
        {passive: false}
    );
    leftPad.addEventListener('touchend', () => {
        leftStick.style.left = '42px';
        leftStick.style.top = '42px';
        mobile.mobileMove.set(0, 0);
    });

    // RIGHT: look (yaw/pitch)
    rightPad.addEventListener('touchstart', (e) => e.preventDefault(), {passive: false});
    rightPad.addEventListener(
        'touchmove',
        (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const rect = rightPad.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const r = Math.min(rect.width, rect.height) / 2;

            let nx = (t.clientX - cx) / r;
            let ny = (t.clientY - cy) / r;
            const len = Math.hypot(nx, ny);
            if (len > 1) {
                nx /= len;
                ny /= len;
            }

            mobile.rightLookVec.set(nx, ny);

            const stickRadius = 42;
            rightStick.style.left = `${42 + nx * stickRadius}px`;
            rightStick.style.top = `${42 + ny * stickRadius}px`;
        },
        {passive: false}
    );

    rightPad.addEventListener('touchend', () => {
        mobile.rightLookVec.set(0, 0);
        rightStick.style.left = '42px';
        rightStick.style.top = '42px';
    });
}

// [Author: Thomas Smith]
// Mobile look update (called from animation loop)
// [Author: leoata]
export function applyMobileLook(state: WorldState, dt: number) {
    const {mobile, camera} = state;
    const vec = mobile.rightLookVec;

    const mag = vec.length();
    let gain = 0;
    if (mag > LOOK_DEADZONE) {
        const t = (mag - LOOK_DEADZONE) / (1 - LOOK_DEADZONE);
        gain = Math.pow(t, LOOK_CURVE);
    }

    const ux = mag > 1e-6 ? vec.x / mag : 0;
    const uy = mag > 1e-6 ? vec.y / mag : 0;

    const yawVel = -ux * LOOK_MAX_SPEED * gain;
    const pitchVel = -uy * LOOK_MAX_SPEED * gain;

    mobile.mobileYaw += yawVel * dt;
    mobile.mobilePitch += pitchVel * dt;
    mobile.mobilePitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, mobile.mobilePitch));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = mobile.mobileYaw;
    camera.rotation.x = mobile.mobilePitch;
    camera.rotation.z = 0;
}
