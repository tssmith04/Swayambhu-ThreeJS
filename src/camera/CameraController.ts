import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export interface CameraSettings {
  fov: number;
  near: number;
  far: number;
  eyeHeight: number;
}

export interface CameraCallbacks {
  onLock?: () => void;
  onUnlock?: () => void;
}

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public controls: PointerLockControls;
  private player: THREE.Object3D;
  private isMobile: boolean;
  
  // Mobile camera state
  private mobileYaw = 0;
  private mobilePitch = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    isMobile: boolean = false,
    settings: Partial<CameraSettings> = {}
  ) {
    this.isMobile = isMobile;
    
    const cameraSettings: CameraSettings = {
      fov: 60,
      near: 0.1,
      far: 10000,
      eyeHeight: 1.7,
      ...settings
    };

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      cameraSettings.fov,
      window.innerWidth / window.innerHeight,
      cameraSettings.near,
      cameraSettings.far
    );

    // Start camera higher to ensure proper ground collision
    // Ground at Y=2, player height=3.2, so camera should be at Y=7+ to be safely above ground
    this.camera.position.set(4, 8, 8); // this line doesn't matter when the camera is following the player

    // Create controls
    this.controls = new PointerLockControls(this.camera, renderer.domElement);
    this.player = this.controls.object as THREE.Object3D;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Only set up pointer lock for desktop
    if (!this.isMobile && this.controls.domElement) {
      // Auto-lock on click for desktop
      this.controls.domElement.addEventListener('click', () => {
        this.controls.lock();
      });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  public setupCallbacks(callbacks: CameraCallbacks): void {
    this.controls.addEventListener('lock', () => {
      callbacks.onLock?.();
    });

    this.controls.addEventListener('unlock', () => {
      callbacks.onUnlock?.();
    });
  }

  public updateMobileLook(yawDelta: number, pitchDelta: number): void {
    if (!this.isMobile) return;

    this.mobileYaw += yawDelta;
    this.mobilePitch += pitchDelta;
    
    // Clamp pitch to prevent over-rotation
    this.mobilePitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.mobilePitch));

    // Apply rotations locally to camera
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.mobileYaw;
    this.camera.rotation.x = this.mobilePitch;
    this.camera.rotation.z = 0;
  }

  public setPosition(position: THREE.Vector3, rotation?: THREE.Euler): void {
    this.player.position.copy(position);
    
    if (rotation) {
      if (this.isMobile) {
        this.mobileYaw = rotation.y;
        this.mobilePitch = rotation.x;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.mobileYaw;
        this.camera.rotation.x = this.mobilePitch;
        this.camera.rotation.z = 0;
      } else {
        this.player.rotation.y = rotation.y;
        this.camera.rotation.x = rotation.x;
        this.camera.rotation.z = 0;
      }
    }
  }

  public getPlayerObject(): THREE.Object3D {
    return this.player;
  }

  public lock(): void {
    if (!this.isMobile) {
      this.controls.lock();
    }
  }

  public unlock(): void {
    if (!this.isMobile) {
      this.controls.unlock();
    }
  }

  public isLocked(): boolean {
    return this.isMobile || this.controls.isLocked;
  }

  public getDirection(target: THREE.Vector3): THREE.Vector3 {
    this.camera.getWorldDirection(target);
    return target;
  }

  public getForward(): THREE.Vector3 {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    return forward;
  }

  public getRight(): THREE.Vector3 {
    const forward = this.getForward();
    return new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();
  }

  public lookAt(target: THREE.Vector3): void {
    this.camera.lookAt(target);
  }

  public updateProjectionMatrix(): void {
    this.camera.updateProjectionMatrix();
  }

  public setCameraSettings(settings: Partial<CameraSettings>): void {
    if (settings.fov !== undefined) {
      this.camera.fov = settings.fov;
    }
    if (settings.near !== undefined) {
      this.camera.near = settings.near;
    }
    if (settings.far !== undefined) {
      this.camera.far = settings.far;
    }
    this.updateProjectionMatrix();
  }

  public getCameraSettings(): CameraSettings {
    return {
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far,
      eyeHeight: 1.7 // Default eye height
    };
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.updateProjectionMatrix();
  }

  public initializeMobileCamera(player: THREE.Object3D): void {
    if (!this.isMobile) return;
    
    // Initialize mobile camera with current player orientation
    this.mobileYaw = player.rotation.y;
    this.mobilePitch = this.camera.rotation.x;
  }

  public dispose(): void {
    this.controls.dispose();
    window.removeEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }
}