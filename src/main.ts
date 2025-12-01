// [Author: Thomas Smith]
// src/main.ts
// [Author: leoata]

import './styles/global.css';
import {createWorld, WorldOptions} from './world';
import {initUI, getModelMode} from './ui';
import {initAnnotations, updateAnnotations} from './annotations';

const app = document.getElementById('app') as HTMLElement;

if (!app) {
    throw new Error('#app element not found');
}

const world = createWorld(app);

// [Author: leoata]
initUI(world.controls, {
    onEnterEducational: () => {
        world.enableEducationalMode();
    },
    onEnterImmersive: () => {
        // currently no-op
    }
});

initAnnotations(app, () => getModelMode() === 'educational');

const worldOptions: WorldOptions = {
    isEducationalMode: () => getModelMode() === 'educational',
    onUpdateAnnotations: (player) => updateAnnotations(player)
};

world.start(worldOptions);
