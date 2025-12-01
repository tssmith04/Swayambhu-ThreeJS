// [Author: Thomas Smith]
// ===================== UI =====================
// [Author: leoata]

import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls.js';

const progressEl = document.getElementById('progress') as HTMLElement;
const barEl = document.getElementById('bar') as HTMLElement;
const msgEl = document.getElementById('msg') as HTMLElement;

const pauseUi = document.getElementById('pause-ui') as HTMLElement;
const resumeButton = document.getElementById('resume') as HTMLButtonElement;

const introduction = document.getElementById('introduction') as HTMLElement;
const enterImmersiveButton = document.getElementById('enter-immersive-button') as HTMLButtonElement;
const enterEducationalButton = document.getElementById('enter-educational-button') as HTMLButtonElement;
const applicationContainer = document.getElementById('application-container') as HTMLElement;
const returnToIntroButton = document.getElementById('return-to-intro') as HTMLButtonElement;
const modeDisplay = document.getElementById('mode-display') as HTMLElement;

export type ModelMode = 'immersive' | 'educational' | undefined;

let MODEL_MODE: ModelMode = undefined;

export function getModelMode(): ModelMode {
    return MODEL_MODE;
}

export function setProgress(active: boolean, ratio: number, text: string) {
    // [Author: leoata]
    progressEl.style.opacity = active ? '1' : '0';
    if (ratio != null) {
        barEl.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    }
    msgEl.textContent = text ?? '';
}

interface UiInitOptions {
    onEnterEducational: () => void;
    onEnterImmersive: () => void;
}

// [Author: leoata]
export function initUI(controls: PointerLockControls, options: UiInitOptions) {
    enterImmersiveButton.onclick = () => {
        applicationContainer.style.display = 'initial';
        introduction.style.display = 'none';
        MODEL_MODE = 'immersive';
        modeDisplay.innerText = ' Immersive';
        options.onEnterImmersive();
    };

    enterEducationalButton.onclick = () => {
        applicationContainer.style.display = 'initial';
        introduction.style.display = 'none';
        MODEL_MODE = 'educational';
        modeDisplay.innerText = ' Educational';
        options.onEnterEducational();
    };

    returnToIntroButton.onclick = () => {
        // refresh
        window.location.reload();
    };

    resumeButton.onclick = () => controls.lock();

    controls.addEventListener('lock', () => {
        msgEl.textContent = '';
        pauseUi.style.display = 'none';
    });

    controls.addEventListener('unlock', () => {
        pauseUi.style.display = 'grid';
    });
}
