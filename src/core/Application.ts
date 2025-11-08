import * as THREE from 'three';
import { RenderEngine } from './RenderEngine.js';
import { UIManager, UICallbacks } from '../ui/UIManager.js';
import { ModelLoader, LoadedModel } from '../models/ModelLoader.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { MovementController } from '../controls/MovementController.js';
import { CameraController } from '../camera/CameraController.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

export interface ApplicationSettings {
  modelUrl: string;
  isMobile?: boolean;
}

export class Application {
  private renderEngine!: RenderEngine;
  private uiManager!: UIManager;
  private modelLoader!: ModelLoader;
  private physicsWorld!: PhysicsWorld;
  private movementController!: MovementController;
  private cameraController!: CameraController;
  private performanceMonitor: PerformanceMonitor;
  
  private isRunning = false;
  private lastTime = 0;
  private loadedModel: LoadedModel | null = null;

  constructor(private settings: ApplicationSettings) {
    this.settings.isMobile = this.settings.isMobile ?? this.detectMobile();
    
    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor(process.env.NODE_ENV === 'development');
    this.performanceMonitor.logMemoryUsage('App Start');
    
    this.performanceMonitor.startTimer('Application Initialization');
    this.initializeCore();
    this.setupCallbacks();
    this.performanceMonitor.endTimer('Application Initialization');
    
    this.startRenderLoop();
  }

  private detectMobile(): boolean {
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
           /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  private initializeCore(): void {
    // Initialize render engine
    this.renderEngine = new RenderEngine();
    
    // Initialize camera controller
    this.cameraController = new CameraController(
      this.renderEngine.renderer,
      this.settings.isMobile
    );

    // Initialize UI
    this.uiManager = new UIManager(
      this.renderEngine.renderer,
      this.cameraController.camera,
      this.renderEngine.scene
    );
    this.uiManager.appendRenderer();

    // Initialize physics
    this.physicsWorld = new PhysicsWorld();

    // Initialize movement controller
    this.movementController = new MovementController(
      this.cameraController.getPlayerObject(),
      this.cameraController.camera,
      this.physicsWorld,
      this.settings.isMobile
    );

    // Initialize model loader
    this.modelLoader = new ModelLoader(this.renderEngine.renderer);

    // Setup atmosphere
    this.renderEngine.loadSkybox();

    // Create player physics - position the physics body so camera ends up at desired height
    const initialPosition = this.cameraController.getPlayerObject().position;
    // Since camera is offset +1.6 from physics body center, we need to create physics body 1.6 units below camera
    const physicsPosition = new THREE.Vector3(initialPosition.x, initialPosition.y - 1.6, initialPosition.z);
    this.physicsWorld.createPlayerPhysics(physicsPosition);

    // Initialize mobile camera if needed
    if (this.settings.isMobile) {
      this.cameraController.initializeMobileCamera(this.cameraController.getPlayerObject());
    }
  }

  private setupCallbacks(): void {
    // UI callbacks
    const uiCallbacks: UICallbacks = {
      onEnterApplication: () => {
        // Application entered, ready to go
      },
      onReturnToIntro: () => {
        this.cameraController.unlock();
      },
      onResume: () => {
        this.cameraController.lock();
      },
      onDoubleClick: (worldPosition: THREE.Vector3) => {
        this.movementController.teleportTo(worldPosition);
      }
    };
    this.uiManager.setupCallbacks(uiCallbacks);

    // Camera callbacks
    this.cameraController.setupCallbacks({
      onLock: () => {
        this.uiManager.hidePauseUI();
      },
      onUnlock: () => {
        this.uiManager.showPauseUI();
      }
    });
  }

  public loadModel(): void {
    this.performanceMonitor.startTimer('Model Loading');
    this.uiManager.setProgress(true, 0, 'Starting download…');
    
    this.modelLoader.loadModel(this.settings.modelUrl, {
      onProgress: (progress, message) => {
        this.uiManager.setProgress(true, progress, message);
      },
      onComplete: (model) => {
        this.performanceMonitor.endTimer('Model Loading');
        this.handleModelLoaded(model);
      },
      onError: (error) => {
        this.performanceMonitor.endTimer('Model Loading');
        this.uiManager.setProgress(false, 0, 'Error loading model');
        console.error('Model loading error:', error);
      }
    });
  }

  private handleModelLoaded(model: LoadedModel): void {
    this.performanceMonitor.startTimer('Model Setup');
    this.loadedModel = model;
    
    // Add model to scene
    this.renderEngine.scene.add(model.root);
    
    // Set spawn point if available
    if (model.spawnPoint && model.spawnRotation) {
      this.cameraController.setPosition(model.spawnPoint, model.spawnRotation);
      this.physicsWorld.setPlayerPosition(model.spawnPoint);
      console.log('Spawn point set:', model.spawnPoint, 'rotation:', model.spawnRotation);
    } else {
      // Frame camera on model if no spawn point
      this.modelLoader.frameCameraOn(model.root, this.cameraController.camera, this.cameraController.getPlayerObject());
      console.warn('No spawn point found, framing camera');
    }

    // Add physics colliders (simplified - only ground plane)
    const physicsBodies = this.physicsWorld.addModelComponents(model.components);
    console.log(`Physics setup completed. Ground collision enabled.`);

    // Optimize model
    this.modelLoader.tightenFrustumTo(model.root, this.cameraController.camera);
    this.modelLoader.makeStatic(model.root);

    // Compile shaders
    this.performanceMonitor.startTimer('Shader Compilation');
    this.renderEngine.compile(this.cameraController.camera);
    this.performanceMonitor.endTimer('Shader Compilation');

    this.performanceMonitor.endTimer('Model Setup');
    this.performanceMonitor.logMemoryUsage('Model Loaded');

    // Hide progress
    this.uiManager.setProgress(false, 1, 'Complete');
  }

  private startRenderLoop(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  private animate(): void {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const deltaTime = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(deltaTime);
    this.render();
  }

  private update(deltaTime: number): void {
    // Update physics
    this.physicsWorld.step(deltaTime);

    // Handle mobile look controls
    if (this.settings.isMobile) {
      const { yawDelta, pitchDelta } = this.uiManager.updateMobileLook(deltaTime);
      this.cameraController.updateMobileLook(yawDelta, pitchDelta);
    }

    // Update movement
    const isMoving = this.movementController.update(
      deltaTime,
      this.cameraController.isLocked(),
      this.settings.isMobile ? this.uiManager.getMobileControls() : undefined
    );

    // Manage performance based on movement
    if (isMoving) {
      this.renderEngine.startMoving();
    } else if (this.movementController.getVelocity().lengthSq() < 1e-4) {
      this.renderEngine.stopMoving();
    }
  }

  private render(): void {
    this.renderEngine.render(this.cameraController.camera);
  }

  public dispose(): void {
    this.isRunning = false;
    this.renderEngine.dispose();
    this.physicsWorld.dispose();
    this.movementController.dispose();
    this.cameraController.dispose();
  }

  // Public API methods
  public start(): void {
    this.loadModel();
  }

  public pause(): void {
    this.isRunning = false;
  }

  public resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animate();
    }
  }

  public getLoadedModel(): LoadedModel | null {
    return this.loadedModel;
  }

  public getPhysicsWorld(): PhysicsWorld {
    return this.physicsWorld;
  }

  public getRenderEngine(): RenderEngine {
    return this.renderEngine;
  }
}