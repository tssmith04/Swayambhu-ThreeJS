// [Author: Thomas Smith]
// ===================== Sky (Atmosphere) =====================
// [Author: leoata]

import * as THREE from 'three';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader.js';
import {WorldState} from './types';

export function addAtmosphere(state: WorldState) {
    const {renderer, scene} = state;

    // skybox compression cli command: (70MB -> 0.7MB)
    // oiiotool qwantani_sunrise_puresky_4k.exr -d half --resize 2048x1024 --compression dwaa -o skybox.exr
    const pmrem = new THREE.PMREMGenerator(renderer);

    new EXRLoader().load('/models/skybox.exr', (tex: THREE.Texture) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmrem.fromEquirectangular(tex).texture;
        scene.background = envMap;
        scene.environment = envMap;
        tex.dispose();
    });
}
