import * as CANNON from 'cannon-es';
import * as THREE from 'three';
// @ts-ignore - three-to-cannon doesn't have proper types
// import { threeToCannon, ShapeType } from 'three-to-cannon';
import { ModelComponent } from '../models/ModelLoader.js';

export interface PhysicsBodyInfo {
  name: string;
  body: CANNON.Body;
  mesh: THREE.Mesh;
}

export interface PlayerPhysics {
  body: CANNON.Body;
  shape: CANNON.Shape;
}

export class PhysicsWorld {
  public world!: CANNON.World;
  private bodies: PhysicsBodyInfo[] = [];
  private playerPhysics: PlayerPhysics | null = null;

  constructor() {
    this.initializeWorld();
  }

  private initializeWorld(): void {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0), // Earth gravity
      broadphase: new CANNON.SAPBroadphase(this.world),
      allowSleep: true
    });

    // Lighter collision detection settings for better performance
    this.world.defaultContactMaterial.friction = 0.4;
    this.world.defaultContactMaterial.restitution = 0.1;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e4;
    this.world.defaultContactMaterial.contactEquationRelaxation = 4;

    // Add ground plane for basic collision
    this.addGroundPlane();
  }

  private addGroundPlane(): void {
    // Use a large box instead of infinite plane for more predictable positioning
    // Box dimensions: width=1000, height=1 (thickness), depth=1000
    const groundShape = new CANNON.Box(new CANNON.Vec3(500, 0.5, 500));
    const groundBody = new CANNON.Body({
      mass: 0, // Static body
      shape: groundShape,
      position: new CANNON.Vec3(0, 4, 0), // Position so top surface is at Y=2
      type: CANNON.Body.KINEMATIC,
      material: new CANNON.Material({ friction: 0.4, restitution: 0.3 })
    });
    
    // No rotation needed for box - it's already oriented correctly
    this.world.addBody(groundBody);
    
    console.log('Added ground box for collision detection at Y=2');
  }

  public createPlayerPhysics(position: THREE.Vector3): PlayerPhysics {
    // Create a simple box shape for the player - now twice as tall
    const playerShape = new CANNON.Box(new CANNON.Vec3(0.3, 1.6, 0.3)); // width, height/2 (doubled from 0.8 to 1.6), depth
    
    const playerBody = new CANNON.Body({
      mass: 1, // Player has mass for physics interaction
      shape: playerShape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: new CANNON.Material({ friction: 0.1, restitution: 0.1 }),
      type: CANNON.Body.DYNAMIC,
      fixedRotation: true // Prevent player from rotating from collisions
    });

    // Lock rotation on X and Z axes to prevent falling over
    playerBody.updateMassProperties();

    this.world.addBody(playerBody);
    
    this.playerPhysics = {
      body: playerBody,
      shape: playerShape
    };

    console.log('Created player physics body at position:', position);
    return this.playerPhysics;
  }

  public addModelComponents(components: ModelComponent[]): PhysicsBodyInfo[] {
    const newBodies: PhysicsBodyInfo[] = [];

    // For now, only create a simple floor collider to avoid performance issues
    // TODO: Add selective collision mesh creation later
    console.log(`Skipping physics bodies for ${components.length} components to improve performance`);
    console.log('Only using ground plane for collisions');

    return newBodies;
  }

  private createPhysicsBodyFromMesh(component: ModelComponent): PhysicsBodyInfo | null {
    // This function is currently disabled for performance reasons
    // TODO: Implement selective collision mesh creation later
    console.warn(`Skipping physics body creation for ${component.name} - disabled for performance`);
    return null;
  }

  public step(deltaTime: number): void {
    // Clamp delta time to prevent physics explosions
    const dt = Math.min(deltaTime, 1/60); // Max 30fps physics
    this.world.step(dt);
  }

  public updatePlayerFromPhysics(player: THREE.Object3D): void {
    if (!this.playerPhysics) return;

    // Sync player position with physics body, but offset to put camera at top of bounding box
    const physicsPosition = this.playerPhysics.body.position;
    // Physics body center is at its center, but we want the camera at the top
    // Player box height is now 3.2 (1.6 * 2), so offset by 1.6 to get to the top
    player.position.set(
      physicsPosition.x, 
      physicsPosition.y + 5, // Offset to top of physics body (doubled from 0.8 to 1.6)
      physicsPosition.z
    );

    // Only sync Y rotation to maintain player control over look direction
    // const physicsQuaternion = this.playerPhysics.body.quaternion;
    // player.quaternion.set(physicsQuaternion.x, physicsQuaternion.y, physicsQuaternion.z, physicsQuaternion.w);
  }

  public movePlayer(direction: THREE.Vector3, speed: number): void {
    if (!this.playerPhysics) return;

    // Apply force instead of directly setting velocity for more realistic physics
    const force = new CANNON.Vec3(
      direction.x * speed * this.playerPhysics.body.mass,
      0, // Don't apply vertical force through movement
      direction.z * speed * this.playerPhysics.body.mass
    );

    this.playerPhysics.body.applyImpulse(force, this.playerPhysics.body.position);

    // Apply damping to prevent infinite acceleration
    this.playerPhysics.body.velocity.x *= 0.8;
    this.playerPhysics.body.velocity.z *= 0.8;
  }

  public setPlayerPosition(position: THREE.Vector3): void {
    if (!this.playerPhysics) return;

    this.playerPhysics.body.position.set(position.x, position.y, position.z);
    this.playerPhysics.body.velocity.set(0, 0, 0);
    this.playerPhysics.body.angularVelocity.set(0, 0, 0);
  }

  public isPlayerOnGround(): boolean {
    if (!this.playerPhysics) return false;

    // Simple ground check - could be improved with raycasting
    return this.playerPhysics.body.velocity.y < 0.1 && this.playerPhysics.body.velocity.y > -0.1;
  }

  public jump(force: number = 5): void {
    if (!this.playerPhysics || !this.isPlayerOnGround()) return;

    this.playerPhysics.body.velocity.y = force;
  }

  public getPlayerPosition(): THREE.Vector3 {
    if (!this.playerPhysics) return new THREE.Vector3();

    const pos = this.playerPhysics.body.position;
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }

  public getPhysicsBodies(): PhysicsBodyInfo[] {
    return this.bodies;
  }

  public dispose(): void {
    // Clean up physics world
    this.world.bodies.forEach(body => this.world.removeBody(body));
    this.bodies = [];
    this.playerPhysics = null;
  }
}