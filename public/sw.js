// [Author: AI Assistant]
// Service Worker for model caching and background downloads

const CACHE_NAME = 'swayambhu-models-v1';
const MODEL_URLS = [
    '/models/temple_tiny.glb',
    '/models/temple_low.glb', 
    '/models/temple_draco.glb',
    '/models/temple_opt.glb'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache the smallest model for immediate availability
            return cache.addAll([
                '/models/temple_tiny.glb',
                '/draco/draco_decoder.js',
                '/draco/draco_decoder.wasm',
                '/basis/basis_transcoder.js'
            ]);
        })
    );
});

// Fetch event - serve from cache or network with optimization
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Only handle model-related requests
    if (url.pathname.includes('/models/') || url.pathname.includes('/draco/') || url.pathname.includes('/basis/')) {
        event.respondWith(handleModelRequest(event.request));
    }
});

async function handleModelRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Serve from cache and optionally update in background
        backgroundUpdate(request, cache);
        return cachedResponse;
    }
    
    // Network request with retry logic
    try {
        const response = await fetchWithRetry(request, 3);
        
        // Cache successful responses
        if (response.ok) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // Fallback to smallest cached model if available
        const fallbackResponse = await cache.match('/models/temple_tiny.glb');
        if (fallbackResponse && request.url.includes('/models/temple_')) {
            return fallbackResponse;
        }
        throw error;
    }
}

async function fetchWithRetry(request, maxRetries) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await fetch(request);
            if (response.ok) return response;
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
            if (i < maxRetries) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    throw lastError;
}

async function backgroundUpdate(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response);
        }
    } catch {
        // Silent fail for background updates
    }
}

// Message handling for preloading models
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PRELOAD_MODELS') {
        preloadModels(event.data.models || MODEL_URLS);
    }
});

async function preloadModels(modelUrls) {
    const cache = await caches.open(CACHE_NAME);
    
    for (const url of modelUrls) {
        try {
            const cachedResponse = await cache.match(url);
            if (!cachedResponse) {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            }
        } catch (error) {
            console.log(`Failed to preload ${url}:`, error);
        }
    }
}