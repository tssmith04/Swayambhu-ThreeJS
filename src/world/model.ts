// [Author: Thomas Smith]
// GLB loading and camera / material helpers
// [Author: leoata]

import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {WorldState} from './types';
import {setProgress} from '../ui';
import {ModelDownloadOptimizer, ModelCache, DownloadProgress} from './download-optimizer';

// Register service worker for enhanced caching
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}

const MODEL_URL_ORIGINAL = '/models/temple_opt.glb';    // 1.1GB - Original
const MODEL_URL_COMPRESSED = '/models/temple_draco.glb'; // 620MB - Draco compressed
const MODEL_URL_LOW = '/models/temple_low.glb';          // 62MB - Low-res with Draco
const MODEL_URL_TINY = '/models/temple_tiny.glb';        // 49MB - Ultra-low res

// Manual override for testing - check URL parameters
function getManualModelOverride(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const model = urlParams.get('model');
    
    switch (model) {
        case 'original': return MODEL_URL_ORIGINAL;
        case 'compressed': return MODEL_URL_COMPRESSED;
        case 'low': return MODEL_URL_LOW;
        case 'tiny': return MODEL_URL_TINY;
        default: return null;
    }
}

// [Author: leoata] - Connection-aware model selection
function selectModelUrl(): string {
    // Check for manual override first (for testing)
    const manualOverride = getManualModelOverride();
    if (manualOverride) {
        console.log('🎛️ Manual model override:', manualOverride);
        return manualOverride;
    }
    
    const connection = (navigator as any).connection;
    
    console.log('🔍 Model Selection Debug:', {
        hasConnection: !!connection,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        saveData: (navigator as any).saveData,
        userAgent: navigator.userAgent.substring(0, 50)
    });
    
    // Check if user prefers reduced data usage
    const saveData = (navigator as any).saveData;
    if (saveData) {
        console.log('📱 Data Saver enabled - using tiny model');
        return MODEL_URL_TINY;
    }
    
    // Mobile device detection (more conservative approach)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        console.log('📱 Mobile device detected - using low-res model');
        return MODEL_URL_LOW;
    }
    
    if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink; // Mbps
        
        // Ultra-slow connections: use tiny model (49MB)
        if (effectiveType === 'slow-2g' || (downlink && downlink < 0.5)) {
            console.log('🐌 Slow connection detected - using tiny model:', effectiveType, downlink);
            return MODEL_URL_TINY;
        }
        // Slow connections: use low-res model (62MB)
        else if (effectiveType === '2g' || (downlink && downlink < 2)) {
            console.log('📶 Medium-slow connection - using low-res model:', effectiveType, downlink);
            return MODEL_URL_LOW;
        }
        // Medium connections: use compressed model (620MB)
        else if (effectiveType === '3g' || (downlink && downlink < 10)) {
            console.log('📡 Medium connection - using compressed model:', effectiveType, downlink);
            return MODEL_URL_COMPRESSED;
        }
        // Fast connections: use compressed model as well for safety
        else {
            console.log('🚀 Fast connection - using compressed model:', effectiveType, downlink);
            return MODEL_URL_COMPRESSED;
        }
    }
    
    // Default to low-res model for better initial experience
    console.log('❓ Unknown connection - defaulting to low-res model for safety');
    return MODEL_URL_LOW;
}

// [Author: leoata]
function makeStatic(scene: THREE.Scene, root: THREE.Object3D) {
    root.traverse((o: any) => {
        if (o.isObject3D) {
            o.matrixAutoUpdate = false;
            o.updateMatrix();
        }
    });
    scene.updateMatrixWorld(true);
}

// [Author: Thomas Smith]
function tightenFrustumTo(camera: THREE.PerspectiveCamera, object: THREE.Object3D) {
    // [Author: leoata]
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(1, size * 0.6);
    camera.near = Math.max(dist / 1500, 0.1);
    camera.updateProjectionMatrix();
}

// [Author: Thomas Smith]
function optimizeMaterials(renderer: THREE.WebGLRenderer, root: THREE.Object3D) {
    // [Author: leoata]
    const maxAniso = (renderer.capabilities as any).getMaxAnisotropy?.() ?? 8;
    const processedMaterials = new Set(); // Avoid processing same material multiple times
    
    root.traverse((o: any) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
            if (!m || processedMaterials.has(m)) continue;
            processedMaterials.add(m);
            
            if (m.transparent && m.opacity >= 1.0) m.transparent = false;
            m.depthWrite = true;
            m.depthTest = true;
            m.blending = THREE.NormalBlending;
            if ('envMapIntensity' in m) m.envMapIntensity = 1.4;
            if (m.map && m.map.anisotropy) {
                m.map.anisotropy = Math.min(m.map.anisotropy, 4, maxAniso);
                m.map.needsUpdate = true;
            }
        }
    });
}

// [Author: Thomas Smith]
function frameCameraOn(camera: THREE.PerspectiveCamera, player: THREE.Object3D, obj: THREE.Object3D) {
    // [Author: leoata]
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);

    const fitHeight = maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));
    const fitWidth = fitHeight / camera.aspect;
    const distance = 1.2 * Math.max(fitHeight, fitWidth);

    const viewDir = new THREE.Vector3(1, 1, 1).normalize();
    camera.position.copy(center).addScaledVector(viewDir, distance);
    camera.lookAt(center);

    camera.near = Math.max(distance / 1000, 0.1);
    camera.updateProjectionMatrix();

    player.position.y = Math.max(player.position.y, center.y + 1.7);
}

// [Author: Thomas Smith]
// Smooth orbit → descend → ease to spawn look
function startFlyIn(state: WorldState, root: THREE.Object3D, spawn: THREE.Object3D) {
    const {camera, player, renderer, isMobile} = state;

    // [Author: leoata]
    const spawnPos = new THREE.Vector3();
    spawn.getWorldPosition(spawnPos);
    spawnPos.y += 1.7;

    const box = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    const radius = Math.max(30, maxDim * 0.9);
    const orbitHeight = Math.max(22, maxDim * 0.55);

    const endAngle = Math.atan2(spawnPos.z - center.z, spawnPos.x - center.x);
    const turns = 1.0;
    const startAngle = endAngle - turns * Math.PI * 2;

    const ORBIT_PORTION = 0.72;
    const TOTAL_DUR = 9500;
    const ORIENT_DUR = 900;

    const wq = new THREE.Quaternion();
    spawn.getWorldQuaternion(wq);
    const spawnEuler = new THREE.Euler().setFromQuaternion(wq, 'YXZ');
    const targetYaw = spawnEuler.y;

    function clamp01(x: number) {
        return Math.max(0, Math.min(1, x));
    }

    function easeInOutCubic(t: number) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function easeOutCubic(t: number) {
        return 1 - Math.pow(1 - t, 3);
    }

    const t0 = performance.now();
    state.isCinematic = true;

    const orbitStart = new THREE.Vector3(
        center.x + Math.cos(startAngle) * radius,
        center.y + orbitHeight,
        center.z + Math.sin(startAngle) * radius
    );

    const aboveSpawn = spawnPos.clone();
    aboveSpawn.y = Math.max(spawnPos.y + orbitHeight * 0.85, spawnPos.y + 18);

    function tick() {
        const now = performance.now();
        const tAll = Math.max(0, (now - t0) / TOTAL_DUR);
        const pos = new THREE.Vector3();

        if (tAll <= 1) {
            if (tAll <= ORBIT_PORTION) {
                const tr = easeInOutCubic(tAll / ORBIT_PORTION);
                const theta = startAngle + (endAngle - startAngle) * tr;
                pos.set(
                    center.x + Math.cos(theta) * radius,
                    center.y + orbitHeight,
                    center.z + Math.sin(theta) * radius
                );
            } else {
                const td = (tAll - ORBIT_PORTION) / (1 - ORBIT_PORTION);
                const orbitEnd = new THREE.Vector3(
                    center.x + Math.cos(endAngle) * radius,
                    center.y + orbitHeight,
                    center.z + Math.sin(endAngle) * radius
                ).lerp(new THREE.Vector3(spawnPos.x, orbitHeight + center.y, spawnPos.z), 0.0);

                const tSmooth = easeInOutCubic(td);
                const midBlend = clamp01(tSmooth * 1.15);
                const topPath = orbitEnd.clone().lerp(aboveSpawn, easeOutCubic(Math.min(1, midBlend)));
                pos.copy(topPath.lerp(spawnPos, clamp01(tSmooth * tSmooth)));
            }

            player.position.copy(pos);
            camera.lookAt(spawnPos);
            renderer.render(state.scene, camera);
            requestAnimationFrame(tick);
            return;
        }

        const landStart = performance.now();
        const startYaw = player.rotation.y;
        const startPitch = camera.rotation.x;
        const startRoll = camera.rotation.z;

        function orient() {
            const k = clamp01((performance.now() - landStart) / ORIENT_DUR);
            const e = easeInOutCubic(k);

            player.position.copy(spawnPos);

            let dYaw = targetYaw - startYaw;
            dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
            player.rotation.y = startYaw + dYaw * e;

            camera.rotation.x = startPitch * (1 - e);
            camera.rotation.z = startRoll * (1 - e);

            renderer.render(state.scene, camera);

            if (k < 1) {
                requestAnimationFrame(orient);
            } else {
                state.isCinematic = false;
                if (!isMobile) state.controls.lock();
            }
        }

        orient();
    }

    void orbitStart; // keeps lint happy if unused variable detection is on

    requestAnimationFrame(tick);
}

// [Author: leoata]
export async function loadModel(state: WorldState) {
    const {renderer, scene, camera, player} = state;

    // Initialize optimized downloaders
    const downloadOptimizer = new ModelDownloadOptimizer({
        maxConcurrentStreams: 4,
        chunkSize: 8 * 1024 * 1024, // 8MB chunks for better performance
    });
    const modelCache = new ModelCache();

    const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    const gltfLoader = new GLTFLoader()
        .setKTX2Loader(ktx2)
        .setDRACOLoader(draco)
        .setMeshoptDecoder(MeshoptDecoder);

    const modelUrl = selectModelUrl();
    console.log(`🎯 LOADING MODEL: ${modelUrl}`);
    console.log(`📁 Model file: ${modelUrl.split('/').pop()}`);
    
    // Show user which quality is being loaded
    const modelInfo = {
        '/models/temple_tiny.glb': { size: '49MB', quality: 'Ultra-low res' },
        '/models/temple_low.glb': { size: '62MB', quality: 'Low resolution' },
        '/models/temple_draco.glb': { size: '620MB', quality: 'Compressed HD' },
        '/models/temple_opt.glb': { size: '1.1GB', quality: 'Original HD' }
    };
    
    const info = modelInfo[modelUrl] || { size: 'Unknown', quality: 'Unknown' };
    setProgress(true, 0, `Loading ${info.size} ${info.quality} model...`);
    
    try {
        // Check cache first
        let modelData = await modelCache.get(modelUrl);
        
        if (!modelData) {
            // Download with optimization
            modelData = await downloadOptimizer.downloadModel(modelUrl, (progress: DownloadProgress) => {
                const ratio = progress.total ? progress.loaded / progress.total : 0;
                const chunksCompleted = progress.chunks.filter(c => c.completed).length;
                const chunksInfo = progress.chunks.length > 1 ? ` (${chunksCompleted}/${progress.chunks.length} chunks)` : '';
                
                setProgress(
                    true,
                    ratio,
                    progress.total
                        ? `Downloading ${(100 * ratio).toFixed(1)}%${chunksInfo}`
                        : `Downloading… ${Math.round(progress.loaded / 1024 / 1024)} MB${chunksInfo}`
                );
            });
            
            // Cache the downloaded model
            await modelCache.set(modelUrl, modelData);
        } else {
            setProgress(true, 0.5, 'Loading from cache...');
        }

        setProgress(true, 0.8, 'Parsing model...');
        
        // Parse the model data
        const gltf = await new Promise<any>((resolve, reject) => {
            gltfLoader.parse(
                modelData,
                '', // base URL not needed for ArrayBuffer
                resolve,
                reject
            );
        });

        const root = gltf.scene;
        scene.add(root);
        let placedAtSpawn = false;

        const spawn = root.getObjectByName('spawn') ?? root.getObjectByName('stupa_lp');

        setProgress(true, 0.9, 'Processing materials...');
        
        // Process materials on next frame to avoid blocking
        await new Promise(resolve => requestAnimationFrame(resolve));
        optimizeMaterials(renderer, root);

        setProgress(true, 0.95, 'Setting up scene...');
        await new Promise(resolve => requestAnimationFrame(resolve));

        if (spawn) {
            startFlyIn(state, root, spawn);
            placedAtSpawn = true;
        } else {
            frameCameraOn(camera, player, root);
        }

        tightenFrustumTo(camera, root);
        makeStatic(scene, root);

        setProgress(true, 0.98, 'Compiling shaders...');
        await new Promise(resolve => requestAnimationFrame(resolve));
        renderer.compile(scene, camera);
        
        setProgress(false, 1, 'Complete');
        void placedAtSpawn;
        
        // Preload other quality models in background
        preloadAlternativeModels(modelUrl, downloadOptimizer, modelCache);
        
    } catch (error) {
        setProgress(false, 0, 'Error loading model');
        console.error('Model loading failed:', error);
        throw error;
    }
}

// Background preloading of alternative quality models
async function preloadAlternativeModels(
    currentUrl: string, 
    optimizer: ModelDownloadOptimizer, 
    cache: ModelCache
) {
    const allUrls = [
        MODEL_URL_TINY,
        MODEL_URL_LOW, 
        MODEL_URL_COMPRESSED,
        MODEL_URL_ORIGINAL
    ];
    
    // Preload models not currently loaded, starting with smaller ones
    const urlsToPreload = allUrls
        .filter(url => url !== currentUrl)
        .sort((a, b) => {
            // Prioritize smaller models first
            const aSize = a.includes('tiny') ? 1 : a.includes('_low') ? 2 : a.includes('draco') ? 3 : 4;
            const bSize = b.includes('tiny') ? 1 : b.includes('_low') ? 2 : b.includes('draco') ? 3 : 4;
            return aSize - bSize;
        });
    
    // Preload one model at a time to avoid overwhelming the connection
    for (const url of urlsToPreload) {
        try {
            const cached = await cache.get(url);
            if (!cached) {
                console.log(`Preloading ${url} in background...`);
                const data = await optimizer.downloadModel(url);
                await cache.set(url, data);
                console.log(`Preloaded ${url}`);
                
                // Small delay between preloads to avoid blocking other requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.log(`Failed to preload ${url}:`, error);
        }
    }
}
