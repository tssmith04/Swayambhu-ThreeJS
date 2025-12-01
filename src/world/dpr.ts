// [Author: Thomas Smith]
// Adaptive DPR helpers
// [Author: leoata]

import {WorldState} from './types';

function setDpr(state: WorldState, dpr: number) {
    const {renderer} = state;
    if (Math.abs(renderer.getPixelRatio() - dpr) > 1e-3) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
}

// [Author: leoata]
export function movingStart(state: WorldState) {
    const d = state.dpr;
    if (d.settleTimer) {
        clearTimeout(d.settleTimer);
        d.settleTimer = null;
    }
    if (d.target !== d.low) {
        d.target = d.low;
        setDpr(state, d.target);
    }
}

export function movingStopSoon(state: WorldState) {
    const d = state.dpr;
    if (d.settleTimer) clearTimeout(d.settleTimer);
    d.settleTimer = window.setTimeout(() => {
        if (d.target !== d.high) {
            d.target = d.high;
            setDpr(state, d.target);
        }
    }, 250);
}
