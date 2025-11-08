import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

export interface RendererSettings {
  antialias?: boolean;
  powerPreference?: 'high-performance' | 'low-power' | 'default';
  outputColorSpace?: THREE.ColorSpace;
  toneMapping?: THREE.ToneMapping;
  toneMappingExposure?: number;
}

export interface PerformanceSettings {
  highDPR: number;
  lowDPR: number;
  settleTime: number;
}

export class RenderEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  private pmrem: THREE.PMREMGenerator;
  
  // Performance management
  private performanceSettings: PerformanceSettings;
  private targetDPR: number;
  private settleTimer: number | null = null;

  constructor(settings: RendererSettings = {}) {
    this.performanceSettings = {
      highDPR: 1,
      lowDPR: 0.7,
      settleTime: 250
    };

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: settings.antialias ?? false,
      powerPreference: settings.powerPreference ?? 'high-performance'
    });

    this.renderer.outputColorSpace = settings.outputColorSpace ?? THREE.SRGBColorSpace;
    this.renderer.toneMapping = settings.toneMapping ?? THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = settings.toneMappingExposure ?? 1.15;
    
    this.targetDPR = this.performanceSettings.highDPR;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = null; // Will be set by skybox
    
    // Set up environment
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.setupEnvironment();
    this.setupLighting();
    this.addGrid();
  }

  private setupEnvironment(): void {
    // Setup default environment for PBR materials
    const sceneEnv = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = sceneEnv;
  }

  private setupLighting(): void {
    // Add basic lighting
    const sun = new THREE.DirectionalLight(0xffffff, 0.4);
    sun.position.set(10, 20, 10);
    this.scene.add(sun);
  }

  private addGrid(): void {
    const grid = new THREE.GridHelper(100, 100, 0x334, 0x223);
    const material = grid.material as THREE.Material & { opacity: number; transparent: boolean };
    material.opacity = 0.25;
    material.transparent = true;
    grid.position.y = -0.02; // Avoid z-fighting
    this.scene.add(grid);
  }

  public loadSkybox(url: string = '/models/skybox.exr'): void {
    new EXRLoader().load(url, (texture: THREE.Texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = this.pmrem.fromEquirectangular(texture).texture;
      this.scene.background = envMap;
      this.scene.environment = envMap;
      texture.dispose();
    });
  }

  private setDPR(dpr: number): void {
    if (Math.abs(this.renderer.getPixelRatio() - dpr) > 1e-3) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  }

  public startMoving(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    if (this.targetDPR !== this.performanceSettings.lowDPR) {
      this.targetDPR = this.performanceSettings.lowDPR;
      this.setDPR(this.targetDPR);
    }
  }

  public stopMoving(): void {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => {
      if (this.targetDPR !== this.performanceSettings.highDPR) {
        this.targetDPR = this.performanceSettings.highDPR;
        this.setDPR(this.targetDPR);
      }
    }, this.performanceSettings.settleTime);
  }

  public render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  public compile(camera: THREE.Camera): void {
    this.renderer.compile(this.scene, camera);
  }

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  public setPerformanceSettings(settings: Partial<PerformanceSettings>): void {
    this.performanceSettings = { ...this.performanceSettings, ...settings };
  }

  public dispose(): void {
    this.renderer.dispose();
    this.pmrem.dispose();
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }
}