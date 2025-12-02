// [Author: AI Assistant]
// Advanced download optimization for large 3D models
// Implements chunked downloads, parallel streams, and caching

export interface DownloadProgress {
    loaded: number;
    total: number;
    chunks: ChunkProgress[];
}

export interface ChunkProgress {
    id: number;
    start: number;
    end: number;
    loaded: number;
    total: number;
    completed: boolean;
}

export class ModelDownloadOptimizer {
    private readonly maxConcurrentStreams: number;
    private readonly chunkSize: number;
    private readonly enableServiceWorker: boolean;

    constructor(options: {
        maxConcurrentStreams?: number;
        chunkSize?: number;
        enableServiceWorker?: boolean;
    } = {}) {
        // Adaptive concurrent streams based on connection
        const connection = (navigator as any).connection;
        const defaultStreams = connection?.effectiveType === '4g' ? 6 : 
                              connection?.effectiveType === '3g' ? 4 : 2;
        
        this.maxConcurrentStreams = options.maxConcurrentStreams ?? defaultStreams;
        this.chunkSize = options.chunkSize ?? 5 * 1024 * 1024; // 5MB chunks
        this.enableServiceWorker = options.enableServiceWorker ?? true;
    }

    async downloadModel(
        url: string, 
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<ArrayBuffer> {
        // Check if we can use range requests
        const supportsRangeRequests = await this.checkRangeSupport(url);
        
        if (!supportsRangeRequests || this.maxConcurrentStreams === 1) {
            // Fallback to standard download with stream processing
            return this.downloadWithStreaming(url, onProgress);
        }

        // Use chunked parallel download
        return this.downloadChunked(url, onProgress);
    }

    private async checkRangeSupport(url: string): Promise<boolean> {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.headers.get('accept-ranges') === 'bytes';
        } catch {
            return false;
        }
    }

    private async downloadWithStreaming(
        url: string,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<ArrayBuffer> {
        const response = await fetch(url);
        const contentLength = parseInt(response.headers.get('content-length') || '0');
        
        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        const progress: DownloadProgress = {
            loaded: 0,
            total: contentLength,
            chunks: [{
                id: 0,
                start: 0,
                end: contentLength,
                loaded: 0,
                total: contentLength,
                completed: false
            }]
        };

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                loaded += value.length;
                
                progress.loaded = loaded;
                progress.chunks[0].loaded = loaded;
                progress.chunks[0].completed = done;
                
                onProgress?.(progress);
            }
        } finally {
            reader.releaseLock();
        }

        // Combine chunks efficiently
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result.buffer;
    }

    private async downloadChunked(
        url: string,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<ArrayBuffer> {
        // Get file size first
        const headResponse = await fetch(url, { method: 'HEAD' });
        const fileSize = parseInt(headResponse.headers.get('content-length') || '0');
        
        if (fileSize === 0) {
            throw new Error('Cannot determine file size');
        }

        // Calculate chunks
        const numChunks = Math.ceil(fileSize / this.chunkSize);
        const chunks: (Uint8Array | null)[] = new Array(numChunks).fill(null);
        const chunkProgress: ChunkProgress[] = [];

        // Initialize progress tracking
        for (let i = 0; i < numChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize - 1, fileSize - 1);
            
            chunkProgress.push({
                id: i,
                start,
                end,
                loaded: 0,
                total: end - start + 1,
                completed: false
            });
        }

        const progress: DownloadProgress = {
            loaded: 0,
            total: fileSize,
            chunks: chunkProgress
        };

        // Download chunks in parallel with concurrency limit
        const downloadPromises: Promise<void>[] = [];
        const semaphore = new Semaphore(this.maxConcurrentStreams);

        for (let i = 0; i < numChunks; i++) {
            const promise = semaphore.acquire().then(async (release) => {
                try {
                    await this.downloadChunk(url, i, chunkProgress[i], chunks, (chunkProg) => {
                        // Update overall progress
                        progress.loaded = chunkProgress.reduce((sum, cp) => sum + cp.loaded, 0);
                        onProgress?.(progress);
                    });
                } finally {
                    release();
                }
            });
            
            downloadPromises.push(promise);
        }

        await Promise.all(downloadPromises);

        // Combine chunks
        const result = new Uint8Array(fileSize);
        let offset = 0;
        
        for (const chunk of chunks) {
            if (!chunk) throw new Error('Missing chunk data');
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result.buffer;
    }

    private async downloadChunk(
        url: string,
        chunkIndex: number,
        chunkProgress: ChunkProgress,
        chunks: (Uint8Array | null)[],
        onChunkProgress: (progress: ChunkProgress) => void
    ): Promise<void> {
        const { start, end } = chunkProgress;
        
        const response = await fetch(url, {
            headers: {
                'Range': `bytes=${start}-${end}`
            }
        });

        if (!response.body) {
            throw new Error(`No response body for chunk ${chunkIndex}`);
        }

        const reader = response.body.getReader();
        const chunkData: Uint8Array[] = [];
        let loaded = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunkData.push(value);
                loaded += value.length;
                
                chunkProgress.loaded = loaded;
                onChunkProgress(chunkProgress);
            }
        } finally {
            reader.releaseLock();
        }

        // Combine chunk data
        const totalLength = chunkData.reduce((sum, data) => sum + data.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const data of chunkData) {
            result.set(data, offset);
            offset += data.length;
        }

        chunks[chunkIndex] = result;
        chunkProgress.completed = true;
    }
}

// Semaphore for controlling concurrency
class Semaphore {
    private permits: number;
    private queue: Array<(release: () => void) => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire(): Promise<() => void> {
        return new Promise((resolve) => {
            if (this.permits > 0) {
                this.permits--;
                resolve(() => this.release());
            } else {
                this.queue.push((release) => resolve(release));
            }
        });
    }

    private release(): void {
        this.permits++;
        if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            this.permits--;
            next(() => this.release());
        }
    }
}

// Enhanced caching system
export class ModelCache {
    private readonly cacheName = 'model-cache-v1';
    private readonly maxCacheSize = 2 * 1024 * 1024 * 1024; // 2GB limit

    async get(url: string): Promise<ArrayBuffer | null> {
        try {
            const cache = await caches.open(this.cacheName);
            const response = await cache.match(url);
            
            if (response) {
                return await response.arrayBuffer();
            }
            return null;
        } catch {
            return null;
        }
    }

    async set(url: string, data: ArrayBuffer): Promise<void> {
        try {
            await this.ensureCacheSpace(data.byteLength);
            
            const cache = await caches.open(this.cacheName);
            const response = new Response(data, {
                headers: {
                    'Content-Type': 'model/gltf-binary',
                    'Cache-Control': 'max-age=31536000', // 1 year
                    'X-Cached-At': Date.now().toString()
                }
            });
            
            await cache.put(url, response);
        } catch (error) {
            console.warn('Failed to cache model:', error);
        }
    }

    private async ensureCacheSpace(requiredSize: number): Promise<void> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const used = estimate.usage || 0;
            const available = estimate.quota || 0;
            
            if (used + requiredSize > available * 0.8) { // Use max 80% of available space
                await this.clearOldEntries();
            }
        }
    }

    private async clearOldEntries(): Promise<void> {
        try {
            const cache = await caches.open(this.cacheName);
            const keys = await cache.keys();
            
            // Sort by cache date and remove oldest entries
            const entries = await Promise.all(
                keys.map(async (request) => {
                    const response = await cache.match(request);
                    const cachedAt = response?.headers.get('X-Cached-At');
                    return {
                        request,
                        cachedAt: cachedAt ? parseInt(cachedAt) : 0
                    };
                })
            );
            
            entries.sort((a, b) => a.cachedAt - b.cachedAt);
            
            // Remove oldest 25% of entries
            const toRemove = entries.slice(0, Math.floor(entries.length * 0.25));
            await Promise.all(toRemove.map(entry => cache.delete(entry.request)));
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    }
}