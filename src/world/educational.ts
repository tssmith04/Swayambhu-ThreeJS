// [Author: leoata]
// Educational mode helpers (e.g. lotus flower sprite)

import * as THREE from 'three';
import {WorldState} from './types';

export function addLotusFlowerTexture(state: WorldState) {
    const {scene} = state;

    const loader = new THREE.TextureLoader();
    loader.load('/assets/images/lotusflower.png', (texture) => {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(10, 10, 1);
        sprite.position.set(0, 50, 0);

        scene.add(sprite);
    });
}
