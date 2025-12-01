// [Author: leoata]
// --- Annotation UI / Logic ---

import * as THREE from 'three';

const ANNOTATIONS = [
    {
        name: 'Sample annotation',
        center: [0, 50, 0] as [number, number, number],
        radius: 10
    }
];

const appEl = document.getElementById('app') as HTMLElement;

// [Author: leoata]
// --- Annotation UI (shows when near an annotation) ---
const annotationUi = document.createElement('div');
annotationUi.id = 'annotation-ui';
annotationUi.style.cssText = `
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 20px;
  padding: 12px 16px;
  background: rgba(0,0,0,0.72);
  color: #fff;
  border-radius: 8px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  display: none;
  align-items: center;
  gap: 10px;
  z-index: 20;
`;
const annotationNameEl = document.createElement('div');
annotationNameEl.style.fontWeight = '600';
const annotationPromptEl = document.createElement('div');
annotationPromptEl.style.opacity = '0.9';
annotationPromptEl.style.fontSize = '13px';
annotationPromptEl.textContent = 'Press E to learn more';
annotationUi.appendChild(annotationNameEl);
annotationUi.appendChild(annotationPromptEl);

// Simple modal for annotation details
const annotationModal = document.createElement('div');
annotationModal.style.cssText = `
  position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6); z-index: 30;
`;
const modalCard = document.createElement('div');
modalCard.style.cssText = `
  background: #0b0b0b; color: #fff; padding: 20px; border-radius: 10px; max-width: 90%; width: 420px;
`;
const modalTitle = document.createElement('div');
modalTitle.style.fontSize = '18px';
modalTitle.style.fontWeight = '700';
const modalClose = document.createElement('button');
modalClose.textContent = 'Close';
modalClose.style.cssText = 'margin-top:12px;padding:8px 12px;border-radius:6px;';
modalClose.onclick = () => {
    annotationModal.style.display = 'none';
};
modalCard.appendChild(modalTitle);
modalCard.appendChild(modalClose);
annotationModal.appendChild(modalCard);

appEl.appendChild(annotationUi);
document.body.appendChild(annotationModal);

// [Author: leoata]
// Precompute annotation vectors
const annotations = ANNOTATIONS.map((a) => ({
    ...a,
    centerVec: new THREE.Vector3(a.center[0], a.center[1], a.center[2])
})) as (typeof ANNOTATIONS[0] & { centerVec: THREE.Vector3 })[];

let currentAnnotation: (typeof ANNOTATIONS)[0] & { centerVec?: THREE.Vector3 } | null = null;

type ModeCheck = () => boolean;

// [Author: leoata]
export function initAnnotations(_app: HTMLElement, isEducationalMode: ModeCheck) {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyE' && currentAnnotation && isEducationalMode()) {
            modalTitle.textContent = currentAnnotation.name;
            annotationModal.style.display = 'flex';
        }
    });
}

// [Author: leoata]
// Checks annotations each frame and updates the UI
export function updateAnnotations(player: THREE.Object3D) {
    let nearest: (typeof annotations)[0] | null = null;
    let bestSq = Infinity;
    const px = player.position.x;
    const py = player.position.y;
    const pz = player.position.z;

    for (const a of annotations) {
        const dx = px - a.centerVec.x;
        const dy = py - a.centerVec.y;
        const dz = pz - a.centerVec.z;
        const sq = dx * dx + dy * dy + dz * dz;
        const rSq = a.radius * a.radius;
        if (sq <= rSq && sq < bestSq) {
            nearest = a;
            bestSq = sq;
        }
    }

    if (nearest) {
        currentAnnotation = nearest;
        annotationNameEl.textContent = nearest.name;
        annotationUi.style.display = 'flex';
    } else {
        currentAnnotation = null;
        annotationUi.style.display = 'none';
    }
}
