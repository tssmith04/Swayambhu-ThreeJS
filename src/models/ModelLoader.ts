import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface ModelComponent {
  name: string;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
}

export interface LoadedModel {
  root: THREE.Group;
  components: ModelComponent[];
  spawnPoint?: THREE.Vector3;
  spawnRotation?: THREE.Euler;
}

export interface LoadingCallbacks {
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (model: LoadedModel) => void;
  onError?: (error: Error) => void;
}

export class ModelLoader {
  private gltfLoader: GLTFLoader;

  constructor(renderer: THREE.WebGLRenderer) {
    // Initialize loaders with proper configuration
    const ktx2 = new KTX2Loader()
      .setTranscoderPath('/basis/')
      .detectSupport(renderer);

    this.gltfLoader = new GLTFLoader()
      .setKTX2Loader(ktx2)
      .setMeshoptDecoder(MeshoptDecoder);
  }

  public loadModel(url: string, callbacks: LoadingCallbacks = {}): void {
    callbacks.onProgress?.(0, 'Starting download…');

    this.gltfLoader.load(
      url,
      (gltf) => {
        const model = this.processLoadedModel(gltf);
        callbacks.onProgress?.(1, 'Parse complete');
        callbacks.onComplete?.(model);
      },
      (progressEvent) => {
        const progress = progressEvent.total ? progressEvent.loaded / progressEvent.total : 0;
        const message = progressEvent.total 
          ? `Loading ${(100 * progress).toFixed(1)}%` 
          : `Loading… ${Math.round(progressEvent.loaded / 1024 / 1024)} MB`;
        callbacks.onProgress?.(progress, message);
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        callbacks.onError?.(new Error(`Failed to load model: ${errorMessage}`));
      }
    );
  }

  private processLoadedModel(gltf: any): LoadedModel {
    const root = gltf.scene;
    const components: ModelComponent[] = [];

    // Extract all individual mesh components from the GLB
    root.traverse((object: THREE.Object3D) => {
      if ((object as any).isMesh) {
        const mesh = object as THREE.Mesh;
        
        // Skip if geometry is not available
        if (!mesh.geometry) return;

        components.push({
          name: mesh.name || `mesh_${components.length}`,
          mesh: mesh,
          geometry: mesh.geometry.clone(), // Clone to avoid shared references
          material: Array.isArray(mesh.material) 
            ? mesh.material.map(mat => mat.clone())
            : mesh.material.clone()
        });
      }
    });

    // Find spawn point and rotation
    const spawnObject = root.getObjectByName('spawn') ?? root.getObjectByName('stupa_lp');
    let spawnPoint: THREE.Vector3 | undefined;
    let spawnRotation: THREE.Euler | undefined;

    if (spawnObject) {
      spawnPoint = new THREE.Vector3();
      spawnObject.getWorldPosition(spawnPoint);
      spawnPoint.y += 1.7; // eye height

      const worldQuaternion = new THREE.Quaternion();
      spawnObject.getWorldQuaternion(worldQuaternion);
      spawnRotation = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ');
    }

    // Optimize materials for better performance
    this.optimizeMaterials(root);

    return {
      root,
      components,
      spawnPoint,
      spawnRotation
    };
  }

  private optimizeMaterials(root: THREE.Object3D): void {
    const maxAniso = 8; // Conservative anisotropy value
    
    root.traverse((object: any) => {
      if (!object.isMesh) return;

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      
      for (const material of materials) {
        if (!material) continue;

        // Optimize transparency
        if (material.transparent && material.opacity >= 1.0) {
          material.transparent = false;
        }

        // Ensure proper depth testing
        material.depthWrite = true;
        material.depthTest = true;
        material.blending = THREE.NormalBlending;

        // Enhance PBR reflections
        if ('envMapIntensity' in material) {
          material.envMapIntensity = 1.4;
        }

        // Optimize texture anisotropy
        if (material.map && material.map.anisotropy) {
          material.map.anisotropy = Math.min(material.map.anisotropy, 4, maxAniso);
          material.map.needsUpdate = true;
        }
      }
    });
  }

  public makeStatic(root: THREE.Object3D): void {
    root.traverse((object: any) => {
      if (object.isObject3D) {
        object.matrixAutoUpdate = false;
        object.updateMatrix();
      }
    });
  }

  public tightenFrustumTo(object: THREE.Object3D, camera: THREE.PerspectiveCamera): void {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(1, size * 0.6);
    camera.near = Math.max(dist / 1500, 0.1);
    camera.updateProjectionMatrix();
  }

  public frameCameraOn(object: THREE.Object3D, camera: THREE.PerspectiveCamera, player: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
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

    // Keep natural initial eye height
    player.position.y = Math.max(player.position.y, center.y + 1.7);
  }
}