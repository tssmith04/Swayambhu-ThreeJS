import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { MobileControls } from '../ui/UIManager.js';

export interface MovementInput {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  shift: boolean;
  space: boolean;
  down: boolean;
}

export interface MovementSettings {
  maxSpeed: number;
  sprintMultiplier: number;
  damping: number;
  jumpForce: number;
}

export class MovementController {
  private keys: MovementInput = {
    w: false, a: false, s: false, d: false, 
    shift: false, space: false, down: false
  };

  private velocity = new THREE.Vector3();
  private settings: MovementSettings;
  private isMobile: boolean;

  constructor(
    private player: THREE.Object3D,
    private camera: THREE.PerspectiveCamera,
    private physicsWorld: PhysicsWorld,
    isMobile: boolean = false,
    settings: Partial<MovementSettings> = {}
  ) {
    this.isMobile = isMobile;
    this.settings = {
      maxSpeed: 10,
      sprintMultiplier: 1.7,
      damping: 8,
      jumpForce: 5,
      ...settings
    };

    if (!isMobile) {
      this.setupKeyboardInput();
    }
  }

  private setupKeyboardInput(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.keys.w = true; break;
      case 'KeyA': this.keys.a = true; break;
      case 'KeyS': this.keys.s = true; break;
      case 'KeyD': this.keys.d = true; break;
      case 'Space': 
        this.keys.space = true; 
        e.preventDefault(); 
        break;
      case 'ShiftLeft':
      case 'ShiftRight': 
        this.keys.shift = true; 
        break;
      case 'KeyQ': 
        this.keys.down = true; 
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.keys.w = false; break;
      case 'KeyA': this.keys.a = false; break;
      case 'KeyS': this.keys.s = false; break;
      case 'KeyD': this.keys.d = false; break;
      case 'Space': 
        this.keys.space = false; 
        e.preventDefault(); 
        break;
      case 'ShiftLeft':
      case 'ShiftRight': 
        this.keys.shift = false; 
        break;
      case 'KeyQ': 
        this.keys.down = false; 
        break;
    }
  }

  public update(deltaTime: number, isControlsLocked: boolean, mobileControls?: MobileControls): boolean {
    const useDesktopControls = !this.isMobile && isControlsLocked;
    const useMobileControls = this.isMobile && mobileControls;
    
    if (!useDesktopControls && !useMobileControls) {
      return false; // No movement
    }

    // Determine movement speed
    const speed = useDesktopControls && this.keys.shift 
      ? this.settings.maxSpeed * this.settings.sprintMultiplier 
      : this.settings.maxSpeed;

    // Get forward and right directions from camera
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .negate();

    // Calculate movement direction
    const direction = new THREE.Vector3();

    if (useDesktopControls) {
      if (this.keys.w) direction.add(forward);
      if (this.keys.s) direction.sub(forward);
      if (this.keys.a) direction.add(right);
      if (this.keys.d) direction.sub(right);
    } else if (useMobileControls) {
      // mobileMove: x = left/right, y = forward/back
      if (mobileControls.mobileMove.y !== 0) {
        direction.add(forward.clone().multiplyScalar(mobileControls.mobileMove.y));
      }
      if (mobileControls.mobileMove.x !== 0) {
        direction.add(right.clone().multiplyScalar(-mobileControls.mobileMove.x));
      }
    }

    // Normalize movement direction
    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    // Apply physics-based movement (simplified for better performance)
    if (direction.lengthSq() > 0) {
      // Check if physics is paused
      if ((this.physicsWorld as any).isPausedState?.()) {
        return false;
      }
      
      // Use direct velocity setting instead of impulses for better performance
      const physicsBody = (this.physicsWorld as any).playerPhysics?.body;
      
      if (physicsBody) {
        physicsBody.velocity.x = direction.x * speed;
        physicsBody.velocity.z = direction.z * speed;
        // Keep existing Y velocity for gravity/jumping
      } else {
        return false;
      }
    } else {
      // Apply damping when not moving
      const physicsBody = (this.physicsWorld as any).playerPhysics?.body;
      if (physicsBody && !(this.physicsWorld as any).isPausedState?.()) {
        physicsBody.velocity.x *= 0.8;
        physicsBody.velocity.z *= 0.8;
      }
    }

    // Handle jumping (desktop only for now)
    if (useDesktopControls && this.keys.space) {
      this.physicsWorld.jump(this.settings.jumpForce);
    }

    // Handle vertical movement for fly mode (desktop only)
    if (useDesktopControls) {
      const physicsBody = (this.physicsWorld as any).playerPhysics?.body;
      
      if (this.keys.down && physicsBody) {
        physicsBody.velocity.y -= speed * deltaTime * 5; // Faster descent
      }
    }

    // Update player object from physics
    this.physicsWorld.updatePlayerFromPhysics(this.player);

    // Return true if there was any movement input
    const hasMovement = direction.lengthSq() > 0;
    const hasVerticalInput = useDesktopControls && (this.keys.space || this.keys.down);
    const hasMobileInput = useMobileControls && mobileControls ? mobileControls.mobileMove.lengthSq() > 0 : false;
    
    return hasMovement || hasVerticalInput || hasMobileInput;
  }

  public teleportTo(position: THREE.Vector3): void {
    this.physicsWorld.setPlayerPosition(position);
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  public isMoving(): boolean {
    if (this.isMobile) {
      return false; // Mobile movement state is determined externally
    }
    
    return this.keys.w || this.keys.a || this.keys.s || this.keys.d || 
           this.keys.space || this.keys.shift || this.keys.down;
  }

  public setMovementSettings(settings: Partial<MovementSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  public getMovementSettings(): MovementSettings {
    return { ...this.settings };
  }

  public dispose(): void {
    if (!this.isMobile) {
      window.removeEventListener('keydown', (e) => this.handleKeyDown(e));
      window.removeEventListener('keyup', (e) => this.handleKeyUp(e));
    }
  }
}