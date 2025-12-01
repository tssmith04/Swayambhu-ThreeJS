// [Author: Thomas Smith]
// Animation loop wiring
// [Author: leoata]

import {WorldState, WorldOptions} from './types';
import {updateMovement} from './movement';

export function createLoop(state: WorldState) {
    const {renderer, scene, camera, controls} = state;

    let last = performance.now();
    let options: WorldOptions | null = null;

    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        const useDesktopControls = !state.isMobile && controls.isLocked && !state.isCinematic;
        const useMobileControls = state.isMobile && !state.isCinematic;

        if (options && options.isEducationalMode()) {
            options.onUpdateAnnotations(state.player);
        }

        updateMovement(state, dt, {useDesktopControls, useMobileControls});

        renderer.render(scene, camera);
    }

    function start(opts: WorldOptions) {
        options = opts;
        animate();
    }

    return {start};
}
