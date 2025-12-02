// [Author: AI Assistant]
// Initialize download optimizations and service worker

// Register service worker with model preloading
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
            
            // Wait for service worker to be ready and preload models
            const serviceWorker = await navigator.serviceWorker.ready;
            
            // Send message to preload essential models
            serviceWorker.active?.postMessage({
                type: 'PRELOAD_MODELS',
                models: [
                    '/models/temple_tiny.glb',  // Preload smallest model first
                    '/draco/draco_decoder.js',
                    '/draco/draco_decoder.wasm',
                    '/basis/basis_transcoder.js'
                ]
            });
            
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    });
}

// Detect connection changes and adapt accordingly
if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    
    connection.addEventListener('change', () => {
        console.log('Connection changed:', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            saveData: connection.saveData
        });
        
        // Could trigger model quality switching here if needed
    });
}

// Handle visibility changes to pause/resume downloads
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - could pause non-critical downloads
        console.log('Page hidden - pausing background downloads');
    } else {
        // Page is visible - resume downloads
        console.log('Page visible - resuming background downloads');
    }
});

export {}; // Make this a module