import * as THREE from 'three';

export type PlayerAnimation = 
  | 'idle' 
  | 'run' 
  | 'swing_forehand' 
  | 'swing_backhand' 
  | 'swing_slice'
  | 'swing_smash'
  | 'serve_toss' 
  | 'serve_smash' 
  | 'celebrate' 
  | 'disappointed';

export interface PlayerConfig {
  jerseyColor: number;
  shortsColor: number;
  skinColor: number;
  hairColor: number;
  headbandColor: number;
  racketColor: number;
  isAi: boolean;
}

export class TennisPlayer {
  public group: THREE.Group;
  public racketMesh: THREE.Group;
  public racketHeadCenter: THREE.Vector3 = new THREE.Vector3();
  public isAi: boolean;

  // Materials for live customization
  private skinMat!: THREE.MeshStandardMaterial;
  private jerseyMat!: THREE.MeshStandardMaterial;
  private shortsMat!: THREE.MeshStandardMaterial;
  private hairMat!: THREE.MeshStandardMaterial;
  private headbandMat!: THREE.MeshStandardMaterial;
  private racketFrameMat!: THREE.MeshStandardMaterial;

  // Joints/limbs for animation
  private torso!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private hipsGroup!: THREE.Group;

  // Grounding & Power FX
  private shadowMesh!: THREE.Mesh;
  private powerRingMesh!: THREE.Mesh;

  // State
  public currentAnim: PlayerAnimation = 'idle';
  public animTime: number = 0;
  public isSwinging: boolean = false;
  private swingDuration: number = 0.42;
  private swingElapsed: number = 0;
  public powerReady: boolean = false;

  // Physics & movement properties
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public speed: number = 9.8; // m/s

  constructor(config: PlayerConfig) {
    this.isAi = config.isAi;
    this.group = new THREE.Group();

    this.skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor, roughness: 0.6, metalness: 0.05 });
    this.jerseyMat = new THREE.MeshStandardMaterial({ color: config.jerseyColor, roughness: 0.65, metalness: 0.1 });
    this.shortsMat = new THREE.MeshStandardMaterial({ color: config.shortsColor, roughness: 0.7 });
    this.hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor, roughness: 0.8 });
    this.headbandMat = new THREE.MeshStandardMaterial({ color: config.headbandColor, roughness: 0.45 });
    this.racketFrameMat = new THREE.MeshStandardMaterial({ color: config.racketColor, metalness: 0.7, roughness: 0.25 });

    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const racketGripMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

    // Ground Contact Shadow
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 64;
    sCanvas.height = 64;
    const sCtx = sCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
    const sTex = new THREE.CanvasTexture(sCanvas);
    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.15),
      new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false })
    );
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.01;
    this.group.add(this.shadowMesh);

    // Power Shot Ready Halo Ring at feet
    this.powerRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 28),
      new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.powerRingMesh.rotation.x = -Math.PI / 2;
    this.powerRingMesh.position.y = 0.025;
    this.powerRingMesh.visible = false;
    this.group.add(this.powerRingMesh);

    // 1. Root Hips
    this.hipsGroup = new THREE.Group();
    this.hipsGroup.position.y = 0.95;
    this.group.add(this.hipsGroup);

    const shortsMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.28, 12), this.shortsMat);
    shortsMesh.castShadow = true;
    this.hipsGroup.add(shortsMesh);

    // 2. Torso / Jersey
    this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.55, 12), this.jerseyMat);
    this.torso.position.y = 0.38;
    this.torso.castShadow = true;
    this.hipsGroup.add(this.torso);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    stripe.position.y = 0.1;
    this.torso.add(stripe);

    // 3. Head & Hair / Headband
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.42;
    this.torso.add(this.headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 10), this.skinMat);
    neck.position.y = 0.05;
    this.headGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), this.skinMat);
    head.position.y = 0.24;
    head.castShadow = true;
    this.headGroup.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      this.hairMat
    );
    hair.position.y = 0.26;
    this.headGroup.add(hair);

    const headband = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.035, 8, 20), this.headbandMat);
    headband.rotation.x = Math.PI / 2;
    headband.position.y = 0.26;
    this.headGroup.add(headband);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.24, 0.20);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.24, 0.20);
    this.headGroup.add(leftEye, rightEye);

    // 4. Arms & Hands
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.34, 0.22, 0);
    this.torso.add(this.rightArm);

    const shoulderGeo = new THREE.SphereGeometry(0.09, 8, 8);
    this.rightArm.add(new THREE.Mesh(shoulderGeo, this.jerseyMat));

    const upperArmGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.32, 8);
    upperArmGeo.translate(0, -0.16, 0);
    const rUpperArm = new THREE.Mesh(upperArmGeo, this.skinMat);
    rUpperArm.castShadow = true;
    this.rightArm.add(rUpperArm);

    const rForearmGroup = new THREE.Group();
    rForearmGroup.position.set(0, -0.32, 0);
    this.rightArm.add(rForearmGroup);

    const rForearmGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.30, 8);
    rForearmGeo.translate(0, -0.15, 0);
    const rForearm = new THREE.Mesh(rForearmGeo, this.skinMat);
    rForearm.castShadow = true;
    rForearmGroup.add(rForearm);

    const rWristband = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 8), this.headbandMat);
    rWristband.position.y = -0.25;
    rForearmGroup.add(rWristband);

    const handGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const rHand = new THREE.Mesh(handGeo, this.skinMat);
    rHand.position.set(0, -0.31, 0);
    rForearmGroup.add(rHand);

    this.racketMesh = this.buildTennisRacket(this.racketFrameMat, racketGripMat);
    this.racketMesh.position.set(0, -0.31, 0.1);
    this.racketMesh.rotation.x = Math.PI / 2;
    rForearmGroup.add(this.racketMesh);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.34, 0.22, 0);
    this.torso.add(this.leftArm);
    this.leftArm.add(new THREE.Mesh(shoulderGeo, this.jerseyMat));
    const lUpperArm = new THREE.Mesh(upperArmGeo, this.skinMat);
    lUpperArm.castShadow = true;
    this.leftArm.add(lUpperArm);

    const lForearmGroup = new THREE.Group();
    lForearmGroup.position.set(0, -0.32, 0);
    this.leftArm.add(lForearmGroup);
    const lForearm = new THREE.Mesh(rForearmGeo, this.skinMat);
    lForearm.castShadow = true;
    lForearmGroup.add(lForearm);
    const lHand = new THREE.Mesh(handGeo, this.skinMat);
    lHand.position.set(0, -0.31, 0);
    lForearmGroup.add(lHand);

    // 5. Legs & Tennis Shoes
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, -0.14, 0);
    this.hipsGroup.add(this.leftLeg);

    const thighGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.38, 8);
    thighGeo.translate(0, -0.19, 0);
    const lThigh = new THREE.Mesh(thighGeo, this.skinMat);
    lThigh.castShadow = true;
    this.leftLeg.add(lThigh);

    const lCalfGroup = new THREE.Group();
    lCalfGroup.position.set(0, -0.38, 0);
    this.leftLeg.add(lCalfGroup);

    const calfGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.36, 8);
    calfGeo.translate(0, -0.18, 0);
    const lCalf = new THREE.Mesh(calfGeo, this.skinMat);
    lCalf.castShadow = true;
    lCalfGroup.add(lCalf);

    const sockGeo = new THREE.CylinderGeometry(0.072, 0.07, 0.14, 8);
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const lSock = new THREE.Mesh(sockGeo, sockMat);
    lSock.position.y = -0.27;
    lCalfGroup.add(lSock);

    const shoeGeo = new THREE.BoxGeometry(0.14, 0.12, 0.28);
    const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    lShoe.position.set(0, -0.38, 0.05);
    lShoe.castShadow = true;
    lCalfGroup.add(lShoe);

    const soleGeo = new THREE.BoxGeometry(0.15, 0.04, 0.29);
    const lSole = new THREE.Mesh(soleGeo, shoeSoleMat);
    lSole.position.set(0, -0.43, 0.05);
    lCalfGroup.add(lSole);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, -0.14, 0);
    this.hipsGroup.add(this.rightLeg);

    const rThigh = new THREE.Mesh(thighGeo, this.skinMat);
    rThigh.castShadow = true;
    this.rightLeg.add(rThigh);

    const rCalfGroup = new THREE.Group();
    rCalfGroup.position.set(0, -0.38, 0);
    this.rightLeg.add(rCalfGroup);

    const rCalf = new THREE.Mesh(calfGeo, this.skinMat);
    rCalf.castShadow = true;
    rCalfGroup.add(rCalf);

    const rSock = new THREE.Mesh(sockGeo, sockMat);
    rSock.position.y = -0.27;
    rCalfGroup.add(rSock);

    const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rShoe.position.set(0, -0.38, 0.05);
    rShoe.castShadow = true;
    rCalfGroup.add(rShoe);

    const rSole = new THREE.Mesh(soleGeo, shoeSoleMat);
    rSole.position.set(0, -0.43, 0.05);
    rCalfGroup.add(rSole);

    this.group.rotation.y = this.isAi ? Math.PI : 0;
  }

  public applyAppearance(config: Partial<PlayerConfig>) {
    if (config.skinColor !== undefined) this.skinMat.color.setHex(config.skinColor);
    if (config.jerseyColor !== undefined) this.jerseyMat.color.setHex(config.jerseyColor);
    if (config.shortsColor !== undefined) this.shortsMat.color.setHex(config.shortsColor);
    if (config.hairColor !== undefined) this.hairMat.color.setHex(config.hairColor);
    if (config.headbandColor !== undefined) this.headbandMat.color.setHex(config.headbandColor);
    if (config.racketColor !== undefined) this.racketFrameMat.color.setHex(config.racketColor);
  }

  public setPowerReady(ready: boolean) {
    this.powerReady = ready;
    this.powerRingMesh.visible = ready;
  }

  private buildTennisRacket(frameMat: THREE.Material, gripMat: THREE.Material): THREE.Group {
    const racket = new THREE.Group();

    const gripGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.32, 8);
    gripGeo.translate(0, 0.16, 0);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.castShadow = true;
    racket.add(grip);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.04, 8), frameMat);
    cap.position.y = 0.02;
    racket.add(cap);

    const throatLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), frameMat);
    throatLeft.position.set(-0.035, 0.38, 0);
    throatLeft.rotation.z = -0.25;
    racket.add(throatLeft);

    const throatRight = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), frameMat);
    throatRight.position.set(0.035, 0.38, 0);
    throatRight.rotation.z = 0.25;
    racket.add(throatRight);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 8, 24), frameMat);
    rim.scale.set(0.85, 1.25, 1);
    rim.position.y = 0.62;
    rim.castShadow = true;
    racket.add(rim);

    const stringCanvas = document.createElement('canvas');
    stringCanvas.width = 64;
    stringCanvas.height = 64;
    const sCtx = stringCanvas.getContext('2d')!;
    sCtx.strokeStyle = 'rgba(240, 240, 240, 0.75)';
    sCtx.lineWidth = 1.5;
    for (let i = 0; i <= 64; i += 8) {
      sCtx.beginPath();
      sCtx.moveTo(i, 0);
      sCtx.lineTo(i, 64);
      sCtx.stroke();
      sCtx.beginPath();
      sCtx.moveTo(0, i);
      sCtx.lineTo(64, i);
      sCtx.stroke();
    }
    const stringTex = new THREE.CanvasTexture(stringCanvas);
    stringTex.colorSpace = THREE.SRGBColorSpace;
    stringTex.wrapS = THREE.RepeatWrapping;
    stringTex.wrapT = THREE.RepeatWrapping;
    stringTex.repeat.set(4, 5);

    const stringMat = new THREE.MeshBasicMaterial({
      map: stringTex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const stringMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.42), stringMat);
    stringMesh.position.y = 0.62;
    racket.add(stringMesh);

    return racket;
  }

  public setAnimation(anim: PlayerAnimation, duration: number = 0.42) {
    if (this.currentAnim === anim && this.isSwinging) return;
    this.currentAnim = anim;
    this.animTime = 0;

    if (anim.startsWith('swing') || anim.startsWith('serve')) {
      this.isSwinging = true;
      this.swingDuration = duration;
      this.swingElapsed = 0;
    } else {
      this.isSwinging = false;
    }
  }

  public update(dt: number) {
    this.animTime += dt;

    if (this.isSwinging) {
      this.swingElapsed += dt;
      if (this.swingElapsed >= this.swingDuration) {
        this.isSwinging = false;
        this.currentAnim = 'idle';
      }
    }

    if (this.powerRingMesh.visible) {
      this.powerRingMesh.rotation.z += dt * 2.5;
      const pulse = 1 + Math.sin(this.animTime * 8) * 0.08;
      this.powerRingMesh.scale.set(pulse, pulse, pulse);
    }

    this.evaluateAnimation();
    this.racketMesh.getWorldPosition(this.racketHeadCenter);
  }

  private evaluateAnimation() {
    const t = this.animTime;
    this.headGroup.rotation.x = 0;
    this.headGroup.rotation.y = 0;

    switch (this.currentAnim) {
      case 'idle': {
        const breath = Math.sin(t * 4) * 0.04;
        this.hipsGroup.position.y = 0.92 + breath;
        this.torso.rotation.x = 0.15;
        this.torso.rotation.y = 0;
        this.torso.rotation.z = 0;

        this.leftLeg.rotation.x = -0.2;
        this.rightLeg.rotation.x = -0.2;
        this.leftLeg.rotation.z = -0.1;
        this.rightLeg.rotation.z = 0.1;

        this.rightArm.rotation.x = -0.7;
        this.rightArm.rotation.y = -0.3;
        this.rightArm.rotation.z = 0.2;

        this.leftArm.rotation.x = -0.6;
        this.leftArm.rotation.y = 0.4;
        this.leftArm.rotation.z = -0.2;

        this.racketMesh.rotation.x = 0.8 + breath * 0.5;
        this.racketMesh.rotation.y = 0;
        this.racketMesh.rotation.z = -0.3;
        break;
      }

      case 'run': {
        const strideFreq = 13;
        const legAngle = Math.sin(t * strideFreq) * 0.65;
        const armAngle = Math.cos(t * strideFreq) * 0.6;
        const bob = Math.abs(Math.sin(t * strideFreq)) * 0.08;

        this.hipsGroup.position.y = 0.95 + bob;
        this.torso.rotation.x = 0.25;
        this.torso.rotation.y = Math.sin(t * strideFreq) * 0.1;

        this.leftLeg.rotation.x = legAngle;
        this.rightLeg.rotation.x = -legAngle;

        this.rightArm.rotation.x = -0.4 + armAngle * 0.5;
        this.rightArm.rotation.y = -0.2;
        this.leftArm.rotation.x = -0.4 - armAngle * 0.5;
        this.leftArm.rotation.y = 0.2;

        this.racketMesh.rotation.x = 1.0;
        this.racketMesh.rotation.z = -0.2;
        break;
      }

      case 'swing_forehand': {
        const p = Math.min(1.0, this.swingElapsed / this.swingDuration);
        if (p < 0.25) {
          const sub = p / 0.25;
          this.torso.rotation.y = THREE.MathUtils.lerp(0, 0.75, sub);
          this.rightArm.rotation.x = THREE.MathUtils.lerp(-0.7, 0.4, sub);
          this.rightArm.rotation.y = THREE.MathUtils.lerp(-0.3, -0.95, sub);
          this.racketMesh.rotation.z = THREE.MathUtils.lerp(-0.3, -1.2, sub);
        } else if (p < 0.62) {
          const sub = (p - 0.25) / 0.37;
          this.torso.rotation.y = THREE.MathUtils.lerp(0.75, -0.85, sub);
          this.rightArm.rotation.x = THREE.MathUtils.lerp(0.4, -1.35, sub);
          this.rightArm.rotation.y = THREE.MathUtils.lerp(-0.95, 0.65, sub);
          this.racketMesh.rotation.z = THREE.MathUtils.lerp(-1.2, 0.5, sub);
          this.racketMesh.rotation.x = THREE.MathUtils.lerp(0.8, -0.4, sub);
        } else {
          const sub = (p - 0.62) / 0.38;
          this.torso.rotation.y = THREE.MathUtils.lerp(-0.85, 0, sub);
          this.rightArm.rotation.x = THREE.MathUtils.lerp(-1.35, -0.7, sub);
          this.rightArm.rotation.y = THREE.MathUtils.lerp(0.65, -0.3, sub);
        }
        break;
      }

      case 'swing_backhand': {
        const p = Math.min(1.0, this.swingElapsed / this.swingDuration);
        if (p < 0.25) {
          const sub = p / 0.25;
          this.torso.rotation.y = THREE.MathUtils.lerp(0, -0.8, sub);
          this.rightArm.rotation.x = THREE.MathUtils.lerp(-0.7, 0.2, sub);
          this.rightArm.rotation.y = THREE.MathUtils.lerp(-0.3, 0.85, sub);
          this.racketMesh.rotation.z = THREE.MathUtils.lerp(-0.3, 0.9, sub);
        } else if (p < 0.62) {
          const sub = (p - 0.25) / 0.37;
          this.torso.rotation.y = THREE.MathUtils.lerp(-0.8, 0.75, sub);
          this.rightArm.rotation.x = THREE.MathUtils.lerp(0.2, -1.4, sub);
          this.rightArm.rotation.y = THREE.MathUtils.lerp(0.85, -0.75, sub);
          this.racketMesh.rotation.z = THREE.MathUtils.lerp(0.9, -0.6, sub);
        } else {
          const sub = (p - 0.62) / 0.38;
          this.torso.rotation.y = THREE.MathUtils.lerp(0.75, 0, sub);
          this.rightArm.rotation.x = THREE.MathUtils.lerp(-1.4, -0.7, sub);
        }
        break;
      }

      case 'swing_slice': {
        const p = Math.min(1.0, this.swingElapsed / this.swingDuration);
        if (p < 0.3) {
          const sub = p / 0.3;
          this.rightArm.rotation.x = THREE.MathUtils.lerp(-0.7, -1.6, sub);
          this.rightArm.rotation.z = THREE.MathUtils.lerp(0.2, 0.6, sub);
          this.racketMesh.rotation.y = THREE.MathUtils.lerp(0, 0.7, sub);
        } else {
          const sub = (p - 0.3) / 0.7;
          this.rightArm.rotation.x = THREE.MathUtils.lerp(-1.6, -0.3, sub);
          this.rightArm.rotation.z = THREE.MathUtils.lerp(0.6, -0.2, sub);
          this.torso.rotation.x = 0.28;
        }
        break;
      }

      case 'swing_smash':
      case 'serve_smash': {
        const p = Math.min(1.0, this.swingElapsed / this.swingDuration);
        if (p < 0.5) {
          const sub = p / 0.5;
          this.hipsGroup.position.y = 0.95 + Math.sin(sub * Math.PI) * 0.42;
          this.rightArm.rotation.x = THREE.MathUtils.lerp(0.8, -2.5, sub);
          this.racketMesh.rotation.x = THREE.MathUtils.lerp(-0.5, 0.85, sub);
          this.torso.rotation.x = THREE.MathUtils.lerp(-0.15, 0.35, sub);
        } else {
          const sub = (p - 0.5) / 0.5;
          this.hipsGroup.position.y = THREE.MathUtils.lerp(1.37, 0.92, sub);
          this.rightArm.rotation.x = THREE.MathUtils.lerp(-2.5, -0.7, sub);
          this.torso.rotation.x = THREE.MathUtils.lerp(0.35, 0.15, sub);
        }
        break;
      }

      case 'serve_toss': {
        const p = Math.min(1.0, this.animTime / 0.6);
        this.torso.rotation.x = -0.15;
        this.leftArm.rotation.x = THREE.MathUtils.lerp(-0.5, -2.6, p);
        this.rightArm.rotation.x = THREE.MathUtils.lerp(-0.7, 0.8, p);
        this.racketMesh.rotation.z = -1.2;
        break;
      }

      case 'celebrate': {
        const jump = Math.abs(Math.sin(t * 6)) * 0.28;
        this.hipsGroup.position.y = 0.95 + jump;
        this.rightArm.rotation.x = -2.3 + Math.sin(t * 8) * 0.25;
        this.rightArm.rotation.z = 0.4;
        this.leftArm.rotation.x = -1.8;
        this.torso.rotation.y = Math.sin(t * 4) * 0.25;
        break;
      }

      case 'disappointed': {
        this.torso.rotation.x = 0.3;
        this.headGroup.rotation.x = 0.4;
        this.headGroup.rotation.y = Math.sin(t * 4) * 0.3;
        this.rightArm.rotation.x = 0.1;
        this.leftArm.rotation.x = 0.1;
        break;
      }
    }
  }

  public setPosition(x: number, z: number) {
    this.position.set(x, 0, z);
    this.group.position.set(x, 0, z);
  }
}
