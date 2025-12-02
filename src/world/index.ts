// [Author: Thomas Smith]
// World composition entry point
// [Author: leoata]

import {createWorldState} from './state';
import {World, WorldOptions} from './types';
import {setupDesktopInput} from './input-desktop';
import {setupMobileInput} from './input-mobile';
import {addAtmosphere} from './atmosphere';
import {loadModel} from './model';
import {createLoop} from './loop';
import {addLotusFlowerTexture} from './educational';

export {WorldOptions} from './types';

export function createWorld(app: HTMLElement): World {
    const state = createWorldState(app);

    setupDesktopInput(state);
    setupMobileInput(state);
    addAtmosphere(state);
    
    // Load model asynchronously
    loadModel(state).catch(error => {
        console.error('Failed to load model:', error);
    });

    const {start} = createLoop(state);

    function enableEducationalMode() {
        addLotusFlowerTexture(state);
    }

    return {
        controls: state.controls,
        start,
        enableEducationalMode
    };
}
