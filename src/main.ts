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

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    app.pause();
  } else {
    app.resume();
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
