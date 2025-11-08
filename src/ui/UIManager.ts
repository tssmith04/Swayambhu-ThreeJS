import * as THREE from 'three';

export interface MobileControls {
  mobileMove: THREE.Vector2;
  rightLookVec: THREE.Vector2;
  mobileYaw: number;
  mobilePitch: number;
}

export interface UICallbacks {
  onEnterApplication: () => void;
  onReturnToIntro: () => void;
  onResume: () => void;
  onDoubleClick: (worldPosition: THREE.Vector3) => void;
}

export class UIManager {
  // UI Elements
  private app!: HTMLElement;
  private progressEl!: HTMLElement;
  private barEl!: HTMLElement;
  private msgEl!: HTMLElement;
  private pauseUi!: HTMLElement;
  private resumeButton!: HTMLButtonElement;
  private introduction!: HTMLElement;
  private enterButton!: HTMLButtonElement;
  private applicationContainer!: HTMLElement;
  private returnToIntroButton!: HTMLButtonElement;

  // Mobile controls
  private mobileControls!: MobileControls;
  private isMobile!: boolean;
  
  // Look settings for mobile
  private readonly LOOK_DEADZONE = 0.12;
  private readonly LOOK_MAX_SPEED = 2.6;
  private readonly LOOK_CURVE = 1.7;

  constructor(private renderer: THREE.WebGLRenderer, private camera: THREE.PerspectiveCamera, private scene: THREE.Scene) {
    this.initializeUIElements();
    this.detectDevice();
    this.initializeMobileControls();
  }

  private initializeUIElements(): void {
    this.app = document.getElementById('app') as HTMLElement;
    this.progressEl = document.getElementById('progress') as HTMLElement;
    this.barEl = document.getElementById('bar') as HTMLElement;
    this.msgEl = document.getElementById('msg') as HTMLElement;
    this.pauseUi = document.getElementById('pause-ui') as HTMLElement;
    this.resumeButton = document.getElementById('resume') as HTMLButtonElement;
    this.introduction = document.getElementById('introduction') as HTMLElement;
    this.enterButton = document.getElementById('enter-button') as HTMLButtonElement;
    this.applicationContainer = document.getElementById('application-container') as HTMLElement;
    this.returnToIntroButton = document.getElementById('return-to-intro') as HTMLButtonElement;
  }

  private detectDevice(): void {
    this.isMobile = 
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  private initializeMobileControls(): void {
    this.mobileControls = {
      mobileMove: new THREE.Vector2(0, 0),
      rightLookVec: new THREE.Vector2(0, 0),
      mobileYaw: 0,
      mobilePitch: 0
    };

    if (this.isMobile) {
      this.createMobileControlPads();
    }
  }

  private createMobileControlPads(): void {
    const padBase = `
      position: fixed; bottom: 16px; width: 140px; height: 140px;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px; touch-action: none; user-select: none; z-index: 10;
      backdrop-filter: blur(2px);
    `;
    const stickBase = `
      position: absolute; width: 56px; height: 56px; left: 42px; top: 42px;
      background: rgba(255,255,255,0.28); border-radius: 50%; pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    `;

    // Left pad (movement)
    const leftPad = document.createElement('div');
    leftPad.style.cssText = padBase + 'left: 16px;';
    const leftStick = document.createElement('div');
    leftStick.style.cssText = stickBase;
    leftPad.appendChild(leftStick);

    // Right pad (look)
    const rightPad = document.createElement('div');
    rightPad.style.cssText = padBase + 'right: 16px;';
    const rightStick = document.createElement('div');
    rightStick.style.cssText = stickBase;
    rightPad.appendChild(rightStick);

    document.body.appendChild(leftPad);
    document.body.appendChild(rightPad);

    this.setupMobilePadEvents(leftPad, leftStick, rightPad, rightStick);
  }

  private setupMobilePadEvents(leftPad: HTMLElement, leftStick: HTMLElement, rightPad: HTMLElement, rightStick: HTMLElement): void {
    // Helper functions
    const padCenter = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 };
    };
    const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

    // Left pad (movement)
    leftPad.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    leftPad.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const { cx, cy, r } = padCenter(leftPad);
      const dx = (t.clientX - cx) / r;
      const dy = (t.clientY - cy) / r;
      const len = Math.hypot(dx, dy);
      const nx = (len > 1 ? dx / len : dx);
      const ny = (len > 1 ? dy / len : dy);
      
      leftStick.style.left = `${clamp(42 + nx * 42, 0, 84)}px`;
      leftStick.style.top = `${clamp(42 + ny * 42, 0, 84)}px`;
      
      this.mobileControls.mobileMove.set(nx, -ny);
    }, { passive: false });
    
    leftPad.addEventListener('touchend', () => {
      leftStick.style.left = '42px';
      leftStick.style.top = '42px';
      this.mobileControls.mobileMove.set(0, 0);
    });

    // Right pad (look)
    rightPad.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    rightPad.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = rightPad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = Math.min(rect.width, rect.height) / 2;

      let nx = (t.clientX - cx) / r;
      let ny = (t.clientY - cy) / r;
      const len = Math.hypot(nx, ny);
      if (len > 1) { nx /= len; ny /= len; }

      this.mobileControls.rightLookVec.set(nx, ny);

      const stickRadius = 42;
      rightStick.style.left = `${42 + nx * stickRadius}px`;
      rightStick.style.top = `${42 + ny * stickRadius}px`;
    }, { passive: false });

    rightPad.addEventListener('touchend', () => {
      this.mobileControls.rightLookVec.set(0, 0);
      rightStick.style.left = '42px';
      rightStick.style.top = '42px';
    });
  }

  public setupCallbacks(callbacks: UICallbacks): void {
    this.enterButton.onclick = () => {
      this.applicationContainer.style.display = 'initial';
      this.introduction.style.display = 'none';
      callbacks.onEnterApplication();
    };

    this.returnToIntroButton.onclick = () => {
      this.applicationContainer.style.display = 'none';
      this.introduction.style.display = '';
      callbacks.onReturnToIntro();
    };

    this.resumeButton.onclick = () => {
      callbacks.onResume();
    };

    // Double click for teleportation
    this.renderer.domElement.addEventListener('dblclick', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, this.camera);

      const targets: THREE.Object3D[] = [];
      this.scene.traverse((o) => {
        if ((o as any).isMesh) targets.push(o);
      });

      const hit = ray.intersectObjects(targets, true)[0];
      if (hit) {
        const newPos = hit.point.clone();
        newPos.y += 1.7;
        callbacks.onDoubleClick(newPos);
      }
    });
  }

  public setProgress(active: boolean, ratio: number, text: string): void {
    this.progressEl.style.opacity = active ? '1' : '0';
    if (ratio != null) {
      this.barEl.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    }
    this.msgEl.textContent = text ?? '';
  }

  public showPauseUI(): void {
    this.pauseUi.style.display = 'grid';
  }

  public hidePauseUI(): void {
    this.msgEl.textContent = '';
    this.pauseUi.style.display = 'none';
  }

  public updateMobileLook(dt: number): { yawDelta: number; pitchDelta: number } {
    if (!this.isMobile) return { yawDelta: 0, pitchDelta: 0 };

    const mag = this.mobileControls.rightLookVec.length();
    let gain = 0;
    if (mag > this.LOOK_DEADZONE) {
      const t = (mag - this.LOOK_DEADZONE) / (1 - this.LOOK_DEADZONE);
      gain = Math.pow(t, this.LOOK_CURVE);
    }

    const ux = mag > 1e-6 ? (this.mobileControls.rightLookVec.x / mag) : 0;
    const uy = mag > 1e-6 ? (this.mobileControls.rightLookVec.y / mag) : 0;

    const yawVel = (-ux) * this.LOOK_MAX_SPEED * gain;
    const pitchVel = (-uy) * this.LOOK_MAX_SPEED * gain;

    this.mobileControls.mobileYaw += yawVel * dt;
    this.mobileControls.mobilePitch += pitchVel * dt;
    this.mobileControls.mobilePitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.mobileControls.mobilePitch));

    return {
      yawDelta: yawVel * dt,
      pitchDelta: pitchVel * dt
    };
  }

  public getMobileControls(): MobileControls {
    return this.mobileControls;
  }

  public isMobileDevice(): boolean {
    return this.isMobile;
  }

  public appendRenderer(): void {
    this.app.appendChild(this.renderer.domElement);
  }
}