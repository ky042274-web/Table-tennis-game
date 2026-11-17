import * as THREE from 'three';
import { 
  COURT_HALF_LENGTH, 
  COURT_HALF_WIDTH_SINGLES, 
  SERVICE_LINE_Z, 
  NET_HEIGHT_CENTER, 
  NET_HEIGHT_POST, 
  NET_POST_X 
} from './tennisCourt';
import { LineCallInfo, ShotType } from '../types/tennis';

export const BALL_RADIUS = 0.13;
export const GRAVITY = -19.0;

export interface BallBounceInfo {
  position: THREE.Vector3;
  side: 'near' | 'far';
  isInsideSingles: boolean;
  isInsideServiceBox: boolean;
  serviceBoxSide: 'deuce' | 'ad';
  bounceIndex: number;
  lineCall?: LineCallInfo;
}

export class TennisBall {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public shadowMesh: THREE.Mesh;

  public position: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public spin: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  public active: boolean = false;
  public lastHitBy: 'player' | 'ai' | null = null;
  public lastShotType: ShotType = 'flat';
  public bounceCount: number = 0;
  public nearSideBounces: number = 0;
  public farSideBounces: number = 0;
  public hasHitNet: boolean = false;
  public isServing: boolean = false;
  public serveSide: 'deuce' | 'ad' = 'deuce';
  public server: 'player' | 'ai' = 'player';
  public isPowerShot: boolean = false;

  // Surface physics
  public restitution: number = 0.74;
  public horizontalDamp: number = 0.88;

  // Motion trail
  private trailGroup: THREE.Group;
  private trailPoints: THREE.Mesh[] = [];
  private trailPositions: THREE.Vector3[] = [];
  private trailTimer: number = 0;

  constructor() {
    this.group = new THREE.Group();

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ccff00';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(192, 64, 50, 0, Math.PI * 2);
    ctx.stroke();

    const ballTexture = new THREE.CanvasTexture(canvas);
    ballTexture.colorSpace = THREE.SRGBColorSpace;

    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTexture,
      roughness: 0.55,
      metalness: 0.05,
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 20, 20), ballMat);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // Ground shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.008;
    this.group.add(this.shadowMesh);

    // Dynamic Trail Pool (10 spheres)
    this.trailGroup = new THREE.Group();
    const trailGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.78, 8, 8);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe2fd52,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const p = new THREE.Mesh(trailGeo, mat);
      p.visible = false;
      this.trailPoints.push(p);
      this.trailPositions.push(new THREE.Vector3());
      this.trailGroup.add(p);
    }
    this.group.add(this.trailGroup);
  }

  public setSurfacePhysics(restitution: number, horizontalDamp: number) {
    this.restitution = restitution;
    this.horizontalDamp = horizontalDamp;
  }

  public reset(pos: THREE.Vector3) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.spin.set(0, 0, 0);
    this.active = false;
    this.bounceCount = 0;
    this.nearSideBounces = 0;
    this.farSideBounces = 0;
    this.hasHitNet = false;
    this.isServing = false;
    this.isPowerShot = false;
    this.lastHitBy = null;
    this.clearTrail();
    this.updateVisuals();
  }

  private clearTrail() {
    for (const p of this.trailPoints) {
      p.visible = false;
    }
  }

  public launch(
    vel: THREE.Vector3,
    hitter: 'player' | 'ai',
    isServe: boolean = false,
    serveSide: 'deuce' | 'ad' = 'deuce',
    shotType: ShotType = 'flat',
    spinVec?: THREE.Vector3,
    isPower: boolean = false
  ) {
    this.velocity.copy(vel);
    this.active = true;
    this.lastHitBy = hitter;
    this.lastShotType = shotType;
    this.isPowerShot = isPower;
    this.bounceCount = 0;
    this.isServing = isServe;
    this.serveSide = serveSide;
    this.server = hitter;
    this.hasHitNet = false;

    if (spinVec) {
      this.spin.copy(spinVec);
    } else {
      // Default topspin dip for drives, backspin float for slice
      if (shotType === 'topspin' || shotType === 'smash') {
        this.spin.set(-1.6, 0, 0);
      } else if (shotType === 'slice') {
        this.spin.set(1.2, 0, 0);
      } else {
        this.spin.set(-0.4, 0, 0);
      }
    }

    if (hitter === 'player') {
      this.farSideBounces = 0;
      this.nearSideBounces = 0;
    } else {
      this.nearSideBounces = 0;
      this.farSideBounces = 0;
    }

    // Set trail color by shot type
    let trailHex = 0xd9f99d;
    if (isPower || shotType === 'smash') trailHex = 0xf97316;
    else if (shotType === 'slice') trailHex = 0x38bdf8;
    else if (shotType === 'lob') trailHex = 0xa78bfa;

    for (const p of this.trailPoints) {
      (p.material as THREE.MeshBasicMaterial).color.setHex(trailHex);
    }
  }

  public getNetHeightAt(x: number): number {
    const clampedX = Math.max(-NET_POST_X, Math.min(NET_POST_X, x));
    const factor = Math.abs(clampedX) / NET_POST_X;
    return NET_HEIGHT_CENTER + factor * (NET_HEIGHT_POST - NET_HEIGHT_CENTER);
  }

  public predictNextBounce(out: THREE.Vector3): boolean {
    if (!this.active || this.position.y <= BALL_RADIUS + 0.02) return false;
    const effG = GRAVITY + this.spin.x * 2.5;
    const y0 = this.position.y - BALL_RADIUS;
    const vy = this.velocity.y;
    const disc = vy * vy - 2 * effG * y0;
    if (disc < 0 || Math.abs(effG) < 0.01) return false;
    const t = (-vy - Math.sqrt(disc)) / effG;
    if (t <= 0 || t > 3.0) return false;

    out.set(
      this.position.x + this.velocity.x * t,
      0.015,
      this.position.z + this.velocity.z * t
    );
    return true;
  }

  private computeLineCall(pos: THREE.Vector3, isServe: boolean): LineCallInfo | undefined {
    const absX = Math.abs(pos.x);
    const absZ = Math.abs(pos.z);

    if (isServe) {
      const distSide = Math.abs(absX - COURT_HALF_WIDTH_SINGLES);
      const distServ = Math.abs(absZ - SERVICE_LINE_Z);
      const distCenter = absX;
      const minD = Math.min(distSide, distServ, distCenter);
      if (minD < 0.45) {
        const isIn = absX <= COURT_HALF_WIDTH_SINGLES && absZ <= SERVICE_LINE_Z;
        return {
          isIn,
          distanceCm: Math.max(1, Math.round(minD * 100)),
          lineName: distServ < distSide ? 'Service Line' : 'Sideline',
        };
      }
      return undefined;
    }

    const distSide = Math.abs(absX - COURT_HALF_WIDTH_SINGLES);
    const distBase = Math.abs(absZ - COURT_HALF_LENGTH);
    const minD = Math.min(distSide, distBase);
    if (minD < 0.45) {
      const isIn = absX <= COURT_HALF_WIDTH_SINGLES && absZ <= COURT_HALF_LENGTH;
      return {
        isIn,
        distanceCm: Math.max(1, Math.round(minD * 100)),
        lineName: distBase < distSide ? 'Baseline' : 'Sideline',
      };
    }
    return undefined;
  }

  public update(dt: number, onBounce: (info: BallBounceInfo) => void, onNetHit: (blockedByNet: boolean) => void) {
    if (!this.active) {
      this.clearTrail();
      this.updateVisuals();
      return;
    }

    // Apply Gravity + Spin Magnus effect
    this.velocity.y += (GRAVITY + this.spin.x * 2.5) * dt;

    // Air drag
    const speed = this.velocity.length();
    const dragCoeff = 0.0032;
    this.velocity.x -= this.velocity.x * speed * dragCoeff * dt;
    this.velocity.z -= this.velocity.z * speed * dragCoeff * dt;

    const prevZ = this.position.z;
    const prevY = this.position.y;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Update trail history every ~0.018s
    this.trailTimer += dt;
    if (this.trailTimer >= 0.016) {
      this.trailTimer = 0;
      for (let i = this.trailPositions.length - 1; i > 0; i--) {
        this.trailPositions[i].copy(this.trailPositions[i - 1]);
      }
      this.trailPositions[0].copy(this.position);

      for (let i = 0; i < this.trailPoints.length; i++) {
        const pt = this.trailPoints[i];
        if (speed > 8) {
          pt.visible = true;
          pt.position.copy(this.trailPositions[i]);
          const ratio = 1 - i / this.trailPoints.length;
          const scale = ratio * (this.isPowerShot ? 1.15 : 0.8);
          pt.scale.setScalar(scale);
          (pt.material as THREE.MeshBasicMaterial).opacity = ratio * (this.isPowerShot ? 0.65 : 0.35);
        } else {
          pt.visible = false;
        }
      }
    }

    // Check Net Collision (Z crosses 0 within net width)
    if (Math.abs(this.position.x) <= NET_POST_X && ((prevZ < 0 && this.position.z >= 0) || (prevZ > 0 && this.position.z <= 0))) {
      const netY = this.getNetHeightAt(this.position.x);
      const t = Math.abs(prevZ) / (Math.abs(prevZ) + Math.abs(this.position.z) + 0.0001);
      const crossY = prevY + (this.position.y - prevY) * t;

      if (crossY < netY) {
        this.hasHitNet = true;

        if (crossY > netY - 0.11) {
          // Net cord! Climbs over with slowed momentum
          this.position.y = netY + BALL_RADIUS + 0.02;
          this.velocity.z *= 0.5;
          this.velocity.y = Math.max(1.8, this.velocity.y * 0.45);
          onNetHit(false);
        } else {
          // Solid net barrier hit
          this.position.z = prevZ;
          this.velocity.z = -this.velocity.z * 0.22;
          this.velocity.y *= 0.25;
          this.velocity.x *= 0.45;
          onNetHit(true);
        }
      }
    }

    // Check Ground Bounce
    if (this.position.y <= BALL_RADIUS) {
      this.position.y = BALL_RADIUS;
      this.velocity.y = -this.velocity.y * this.restitution;
      this.velocity.x *= this.horizontalDamp;
      this.velocity.z *= this.horizontalDamp;
      this.spin.multiplyScalar(0.5);
      this.bounceCount++;

      const isNearSide = this.position.z > 0;
      if (isNearSide) {
        this.nearSideBounces++;
      } else {
        this.farSideBounces++;
      }

      const isInsideSingles =
        Math.abs(this.position.x) <= COURT_HALF_WIDTH_SINGLES + 0.05 &&
        Math.abs(this.position.z) <= COURT_HALF_LENGTH + 0.05;

      const isInsideServiceBox =
        Math.abs(this.position.x) <= COURT_HALF_WIDTH_SINGLES + 0.05 &&
        Math.abs(this.position.z) <= SERVICE_LINE_Z + 0.05;

      let serviceBoxSide: 'deuce' | 'ad' = 'deuce';
      if (isNearSide) {
        serviceBoxSide = this.position.x > 0 ? 'deuce' : 'ad';
      } else {
        serviceBoxSide = this.position.x < 0 ? 'deuce' : 'ad';
      }

      onBounce({
        position: this.position.clone(),
        side: isNearSide ? 'near' : 'far',
        isInsideSingles,
        isInsideServiceBox,
        serviceBoxSide,
        bounceIndex: isNearSide ? this.nearSideBounces : this.farSideBounces,
        lineCall: this.computeLineCall(this.position, this.isServing),
      });

      if (Math.abs(this.velocity.y) < 0.35) {
        this.velocity.y = 0;
      }
    }

    this.mesh.rotation.x += this.velocity.z * dt * 3;
    this.mesh.rotation.z -= this.velocity.x * dt * 3;
    this.updateVisuals();
  }

  private updateVisuals() {
    this.mesh.position.copy(this.position);

    this.shadowMesh.position.x = this.position.x;
    this.shadowMesh.position.z = this.position.z;

    const alt = Math.max(0, this.position.y - BALL_RADIUS);
    const shadowScale = Math.max(0.32, 1.0 / (1.0 + alt * 0.42));
    this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.14, 0.65 / (1.0 + alt * 0.48));
  }
}
