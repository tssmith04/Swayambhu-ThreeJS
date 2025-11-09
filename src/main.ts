//  gltfpack -i public\models\temple_old.glb -o public\models\temple_opt.glb -cc -kn -km -tc -vp 15 -vt 12 -vn 8 -vc 8
// src/main.ts - Modular Three.js Application with Physics

import './styles/global.css';
import { Application } from './core/Application.js';

// Configuration
const MODEL_URL = '/models/temple_opt.glb';

// Initialize and start the application
const app = new Application({
  modelUrl: MODEL_URL
});

// Start loading and running the application
app.start();

// Handle page visibility and focus changes for better alt-tab behavior
document.addEventListener('visibilitychange', () => {
  // Keep the app running through tab switches
  // The browser's built-in requestAnimationFrame throttling handles performance
});

// Additional focus event handling for pointer lock management
window.addEventListener('blur', () => {
  // Unlock controls when window loses focus to prevent stuck pointer lock
  if ((window as any).app?.cameraController?.isLocked?.()) {
    (window as any).app.cameraController.unlock();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  app.dispose();
});

// Expose app instance for debugging
if (process.env.NODE_ENV === 'development') {
  (window as any).app = app;
}
