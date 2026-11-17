import * as THREE from 'three';
import { CourtSurface } from '../types/tennis';
import { COURT_SURFACES } from './constants';

export const COURT_HALF_LENGTH = 11.885; // 23.77m total
export const COURT_HALF_WIDTH_SINGLES = 4.115; // 8.23m total
export const COURT_HALF_WIDTH_DOUBLES = 5.485; // 10.97m total
export const SERVICE_LINE_Z = 6.40; // 6.4m from net
export const NET_HEIGHT_CENTER = 0.914;
export const NET_HEIGHT_POST = 1.07;
export const NET_POST_X = 6.1;

const COURT_FULL_LENGTH = COURT_HALF_LENGTH * 2;
const COURT_DOUBLES_WIDTH = COURT_HALF_WIDTH_DOUBLES * 2;

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface RingEffect {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  active: boolean;
}

export class TennisCourt {
  public group: THREE.Group;
  public audienceInstances: THREE.InstancedMesh | null = null;
  public audienceHeadInstances: THREE.InstancedMesh | null = null;
  private audienceCount: number = 0;
  private audienceBaseMatrices: THREE.Matrix4[] = [];

  // Surface materials for dynamic switching
  private outerGrassMat!: THREE.MeshStandardMaterial;
  private runOffMat!: THREE.MeshStandardMaterial;
  private innerCourtMat!: THREE.MeshStandardMaterial;
  private lineMat!: THREE.MeshStandardMaterial;
  private currentDustColor: number = 0x86efac;

  // Indicators
  public landingReticle: THREE.Group;
  private landingRingOuter: THREE.Mesh;
  private landingRingInner: THREE.Mesh;

  public serveTargetReticle: THREE.Group;
  public practiceTargetMesh: THREE.Group;
  public practiceTargetPos: THREE.Vector3 = new THREE.Vector3(0, 0.02, -8);

  // Jumbotron
  private jumbotronCtx!: CanvasRenderingContext2D;
  private jumbotronTex!: THREE.CanvasTexture;

  // Pooled FX
  private particles: Particle[] = [];
  private rings: RingEffect[] = [];

  // Flags
  private flags: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.landingReticle = new THREE.Group();
    this.landingRingOuter = new THREE.Mesh();
    this.landingRingInner = new THREE.Mesh();
    this.serveTargetReticle = new THREE.Group();
    this.practiceTargetMesh = new THREE.Group();

    this.buildCourtSurface();
    this.buildCourtLines();
    this.buildNet();
    this.buildUmpireChair();
    this.buildStadiumStands();
    this.buildSponsorBoards();
    this.buildFloodlights();
    this.buildJumbotron();
    this.buildPerimeterDecor();
    this.buildReticles();
    this.buildEffectsPool();
  }

  private buildCourtSurface() {
    const surface = COURT_SURFACES.grass;

    // 1. Surrounding outer stadium grass/lawn
    const outerGrassGeo = new THREE.PlaneGeometry(110, 110);
    this.outerGrassMat = new THREE.MeshStandardMaterial({
      color: surface.stadiumGrassColor,
      roughness: 0.88,
      metalness: 0.04,
    });
    const outerGrass = new THREE.Mesh(outerGrassGeo, this.outerGrassMat);
    outerGrass.rotation.x = -Math.PI / 2;
    outerGrass.position.y = -0.02;
    outerGrass.receiveShadow = true;
    this.group.add(outerGrass);

    // 2. Playable court run-off surround
    const runOffGeo = new THREE.PlaneGeometry(20, 38);
    this.runOffMat = new THREE.MeshStandardMaterial({
      color: surface.outerColor,
      roughness: 0.72,
      metalness: 0.05,
    });
    const runOff = new THREE.Mesh(runOffGeo, this.runOffMat);
    runOff.rotation.x = -Math.PI / 2;
    runOff.position.y = -0.01;
    runOff.receiveShadow = true;
    this.group.add(runOff);

    // 3. Inner playing court surface
    const innerCourtGeo = new THREE.PlaneGeometry(COURT_DOUBLES_WIDTH, COURT_FULL_LENGTH);
    this.innerCourtMat = new THREE.MeshStandardMaterial({
      color: surface.innerColor,
      roughness: 0.65,
      metalness: 0.05,
    });
    const innerCourt = new THREE.Mesh(innerCourtGeo, this.innerCourtMat);
    innerCourt.rotation.x = -Math.PI / 2;
    innerCourt.position.y = 0;
    innerCourt.receiveShadow = true;
    this.group.add(innerCourt);
  }

  private buildCourtLines() {
    this.lineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const linesGroup = new THREE.Group();
    linesGroup.position.y = 0.006;

    const LINE_THICK = 0.06;
    const BASELINE_THICK = 0.10;

    const makeLine = (w: number, l: number, x: number, z: number) => {
      const geo = new THREE.PlaneGeometry(w, l);
      const mesh = new THREE.Mesh(geo, this.lineMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0, z);
      mesh.receiveShadow = true;
      linesGroup.add(mesh);
    };

    // Doubles Sidelines
    makeLine(LINE_THICK, COURT_HALF_LENGTH * 2, -COURT_HALF_WIDTH_DOUBLES, 0);
    makeLine(LINE_THICK, COURT_HALF_LENGTH * 2, COURT_HALF_WIDTH_DOUBLES, 0);

    // Singles Sidelines
    makeLine(LINE_THICK, COURT_HALF_LENGTH * 2, -COURT_HALF_WIDTH_SINGLES, 0);
    makeLine(LINE_THICK, COURT_HALF_LENGTH * 2, COURT_HALF_WIDTH_SINGLES, 0);

    // Baselines
    makeLine(COURT_HALF_WIDTH_DOUBLES * 2 + LINE_THICK, BASELINE_THICK, 0, -COURT_HALF_LENGTH);
    makeLine(COURT_HALF_WIDTH_DOUBLES * 2 + LINE_THICK, BASELINE_THICK, 0, COURT_HALF_LENGTH);

    // Service Lines
    makeLine(COURT_HALF_WIDTH_SINGLES * 2, LINE_THICK, 0, -SERVICE_LINE_Z);
    makeLine(COURT_HALF_WIDTH_SINGLES * 2, LINE_THICK, 0, SERVICE_LINE_Z);

    // Center Service Line
    makeLine(LINE_THICK, SERVICE_LINE_Z * 2, 0, 0);

    // Center Marks at Baselines
    makeLine(LINE_THICK, 0.4, 0, -COURT_HALF_LENGTH + 0.2);
    makeLine(LINE_THICK, 0.4, 0, COURT_HALF_LENGTH - 0.2);

    this.group.add(linesGroup);
  }

  private buildNet() {
    const netGroup = new THREE.Group();

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, NET_HEIGHT_POST, 16);

    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.position.set(-NET_POST_X, NET_HEIGHT_POST / 2, 0);
    postLeft.castShadow = true;
    netGroup.add(postLeft);

    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.position.set(NET_POST_X, NET_HEIGHT_POST / 2, 0);
    postRight.castShadow = true;
    netGroup.add(postRight);

    // Net mesh texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(230, 235, 240, 0.88)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }
    const netTexture = new THREE.CanvasTexture(canvas);
    netTexture.colorSpace = THREE.SRGBColorSpace;
    netTexture.wrapS = THREE.RepeatWrapping;
    netTexture.wrapT = THREE.RepeatWrapping;
    netTexture.repeat.set(40, 6);

    const netMat = new THREE.MeshStandardMaterial({
      map: netTexture,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
      depthWrite: false,
    });

    const netWidth = NET_POST_X * 2;
    const netGeo = new THREE.PlaneGeometry(netWidth, NET_HEIGHT_CENTER, 32, 4);
    const pos = netGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ratio = 1 - Math.pow(x / NET_POST_X, 2);
      const sag = ratio * (NET_HEIGHT_POST - NET_HEIGHT_CENTER);
      pos.setY(i, y - sag * 0.5);
    }
    netGeo.computeVertexNormals();

    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, NET_HEIGHT_CENTER / 2, 0);
    netGroup.add(netMesh);

    // White Net Top Tape
    const tapeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
    });
    const tapeGeo = new THREE.BoxGeometry(netWidth, 0.06, 0.05);
    const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
    tapeMesh.position.set(0, (NET_HEIGHT_POST + NET_HEIGHT_CENTER) / 2, 0);
    tapeMesh.castShadow = true;
    netGroup.add(tapeMesh);

    // Center strap
    const strapMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const strapGeo = new THREE.BoxGeometry(0.08, NET_HEIGHT_CENTER, 0.08);
    const strapMesh = new THREE.Mesh(strapGeo, strapMat);
    strapMesh.position.set(0, NET_HEIGHT_CENTER / 2, 0);
    netGroup.add(strapMesh);

    this.group.add(netGroup);
  }

  private buildUmpireChair() {
    const chairGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.35 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });

    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8);
    for (const dx of [-0.4, 0.4]) {
      for (const dz of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(legGeo, frameMat);
        leg.position.set(dx, 1.4, dz);
        leg.castShadow = true;
        chairGroup.add(leg);
      }
    }

    const plat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), frameMat);
    plat.position.set(0, 2.2, 0);
    chairGroup.add(plat);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.6), seatMat);
    seat.position.set(0, 2.35, 0);
    chairGroup.add(seat);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), seatMat);
    backrest.position.set(0, 2.65, 0.25);
    chairGroup.add(backrest);

    const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.4, 16), umbrellaMat);
    umbrella.position.set(0, 3.4, 0);
    chairGroup.add(umbrella);

    chairGroup.position.set(NET_POST_X + 1.2, 0, 0);
    this.group.add(chairGroup);
  }

  private buildStadiumStands() {
    const standsGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.1,
    });
    const seatRowMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.6,
      metalness: 0.1,
    });

    const createStandSide = (isLeft: boolean) => {
      const xSign = isLeft ? -1 : 1;
      const baseDistX = (COURT_HALF_WIDTH_DOUBLES + 6.0) * xSign;
      const standLength = 40;
      const tiers = 6;

      for (let t = 0; t < tiers; t++) {
        const tierWidth = 1.2;
        const tierHeight = 0.7;
        const xPos = baseDistX + (t * tierWidth + 0.6) * xSign;
        const yPos = (t + 0.5) * tierHeight;

        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(tierWidth, tierHeight, standLength), concreteMat);
        stepMesh.position.set(xPos, yPos, 0);
        stepMesh.receiveShadow = true;
        standsGroup.add(stepMesh);

        const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(tierWidth * 0.7, 0.15, standLength * 0.96), seatRowMat);
        seatMesh.position.set(xPos, yPos + tierHeight / 2 + 0.08, 0);
        standsGroup.add(seatMesh);
      }
    };

    createStandSide(true);
    createStandSide(false);

    // North Stand (Far background)
    const northDistZ = -(COURT_HALF_LENGTH + 9.5);
    const northTiers = 5;
    for (let t = 0; t < northTiers; t++) {
      const tierWidth = 1.2;
      const tierHeight = 0.7;
      const zPos = northDistZ - (t * tierWidth);
      const yPos = (t + 0.5) * tierHeight;

      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(36, tierHeight, tierWidth), concreteMat);
      stepMesh.position.set(0, yPos, zPos);
      stepMesh.receiveShadow = true;
      standsGroup.add(stepMesh);
    }

    this.group.add(standsGroup);
    this.buildSpectatorCrowd();
  }

  private buildSpectatorCrowd() {
    const spectatorCount = 190;
    this.audienceCount = spectatorCount;

    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.5, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });

    const audienceBodies = new THREE.InstancedMesh(bodyGeo, bodyMat, spectatorCount);
    const audienceHeads = new THREE.InstancedMesh(headGeo, headMat, spectatorCount);
    audienceBodies.castShadow = false;
    audienceBodies.receiveShadow = true;
    audienceHeads.receiveShadow = true;
    audienceBodies.frustumCulled = false;
    audienceHeads.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const colors = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899,
      0xf97316, 0x06b6d4, 0xe2e8f0, 0x1e293b, 0xfacc15, 0x64748b
    ];

    let index = 0;
    this.audienceBaseMatrices = [];

    for (const side of [-1, 1]) {
      const baseX = (COURT_HALF_WIDTH_DOUBLES + 6.0) * side;
      for (let t = 0; t < 5; t++) {
        const xPos = baseX + (t * 1.2 + 0.6) * side;
        const yBase = (t + 1) * 0.7 + 0.25;

        for (let z = -16; z <= 16; z += 2.4) {
          if (index >= spectatorCount - 35) break;
          const jitterX = (Math.random() - 0.5) * 0.2;
          const jitterZ = (Math.random() - 0.5) * 0.5;

          dummy.position.set(xPos + jitterX, yBase + 0.25, z + jitterZ);
          dummy.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
          dummy.updateMatrix();

          audienceBodies.setMatrixAt(index, dummy.matrix);
          audienceBodies.setColorAt(index, new THREE.Color(colors[Math.floor(Math.random() * colors.length)]));

          dummy.position.y += 0.38;
          dummy.updateMatrix();
          audienceHeads.setMatrixAt(index, dummy.matrix);

          this.audienceBaseMatrices.push(new THREE.Matrix4().copy(dummy.matrix));
          index++;
        }
      }
    }

    const northZ = -(COURT_HALF_LENGTH + 9.5);
    for (let t = 0; t < 4; t++) {
      const zPos = northZ - (t * 1.2);
      const yBase = (t + 1) * 0.7 + 0.25;
      for (let x = -14; x <= 14; x += 2.6) {
        if (index >= spectatorCount) break;
        dummy.position.set(x + (Math.random() - 0.5) * 0.4, yBase + 0.25, zPos);
        dummy.rotation.y = 0;
        dummy.updateMatrix();

        audienceBodies.setMatrixAt(index, dummy.matrix);
        audienceBodies.setColorAt(index, new THREE.Color(colors[Math.floor(Math.random() * colors.length)]));

        dummy.position.y += 0.38;
        dummy.updateMatrix();
        audienceHeads.setMatrixAt(index, dummy.matrix);

        this.audienceBaseMatrices.push(new THREE.Matrix4().copy(dummy.matrix));
        index++;
      }
    }

    audienceBodies.count = index;
    audienceHeads.count = index;
    this.audienceCount = index;

    audienceBodies.instanceMatrix.needsUpdate = true;
    if (audienceBodies.instanceColor) audienceBodies.instanceColor.needsUpdate = true;
    audienceHeads.instanceMatrix.needsUpdate = true;

    this.audienceInstances = audienceBodies;
    this.audienceHeadInstances = audienceHeads;
    this.group.add(audienceBodies);
    this.group.add(audienceHeads);
  }

  private buildSponsorBoards() {
    const boardGroup = new THREE.Group();

    const createBoardTexture = (text: string, bgColor: string, textColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 512, 128);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 116);

      ctx.font = 'bold 42px Arial, sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const boardMat1 = new THREE.MeshStandardMaterial({
      map: createBoardTexture('TENNIS ARENA 3D', '#0f172a', '#38bdf8'),
      roughness: 0.4,
    });
    const boardMat2 = new THREE.MeshStandardMaterial({
      map: createBoardTexture('GRAND SLAM OPEN', '#14532d', '#4ade80'),
      roughness: 0.4,
    });
    const boardMat3 = new THREE.MeshStandardMaterial({
      map: createBoardTexture('CHAMPIONSHIP TOUR', '#1e1b4b', '#facc15'),
      roughness: 0.4,
    });

    const boardGeoSide = new THREE.BoxGeometry(0.2, 1.0, 32);
    const bLeft = new THREE.Mesh(boardGeoSide, boardMat1);
    bLeft.position.set(-(COURT_HALF_WIDTH_DOUBLES + 3.8), 0.5, 0);
    boardGroup.add(bLeft);

    const bRight = new THREE.Mesh(boardGeoSide, boardMat2);
    bRight.position.set(COURT_HALF_WIDTH_DOUBLES + 3.8, 0.5, 0);
    boardGroup.add(bRight);

    const boardGeoFar = new THREE.BoxGeometry(22, 1.0, 0.2);
    const bNorth = new THREE.Mesh(boardGeoFar, boardMat3);
    bNorth.position.set(0, 0.5, -(COURT_HALF_LENGTH + 6.5));
    boardGroup.add(bNorth);

    const bSouth = new THREE.Mesh(boardGeoFar, boardMat1);
    bSouth.position.set(0, 0.5, COURT_HALF_LENGTH + 6.5);
    boardGroup.add(bSouth);

    this.group.add(boardGroup);
  }

  private buildFloodlights() {
    const lightGroup = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffedb,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    const corners = [
      { x: -14, z: -16 },
      { x: 14, z: -16 },
      { x: -14, z: 16 },
      { x: 14, z: 16 },
    ];

    corners.forEach(c => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 12, 12), poleMat);
      pole.position.set(c.x, 6, c.z);
      pole.castShadow = true;
      lightGroup.add(pole);

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.6), poleMat);
      head.position.set(c.x, 12, c.z);
      head.lookAt(0, 0, 0);
      lightGroup.add(head);

      const bulbs = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), lampMat);
      bulbs.position.set(0, 0, 0.31);
      head.add(bulbs);
    });

    this.group.add(lightGroup);
  }

  private buildJumbotron() {
    const jumboGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 });

    // Support pillars
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.25, 7, 10);
    const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
    leftPillar.position.set(-4.5, 3.5, -(COURT_HALF_LENGTH + 15.2));
    jumboGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
    rightPillar.position.set(4.5, 3.5, -(COURT_HALF_LENGTH + 15.2));
    jumboGroup.add(rightPillar);

    // Outer casing
    const casing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.8, 0.5), frameMat);
    casing.position.set(0, 7.2, -(COURT_HALF_LENGTH + 15.2));
    jumboGroup.add(casing);

    // Dynamic Canvas Screen
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    this.jumbotronCtx = canvas.getContext('2d')!;
    this.jumbotronTex = new THREE.CanvasTexture(canvas);
    this.jumbotronTex.colorSpace = THREE.SRGBColorSpace;

    const screenMat = new THREE.MeshBasicMaterial({ map: this.jumbotronTex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 3.2), screenMat);
    screen.position.set(0, 7.2, -(COURT_HALF_LENGTH + 14.92));
    jumboGroup.add(screen);

    this.updateJumbotron('YOU', 'CPU', 0, 0, '0', '0', 'GRAND SLAM ARENA');
    this.group.add(jumboGroup);
  }

  public updateJumbotron(
    pName: string,
    aName: string,
    pGames: number,
    aGames: number,
    pPts: string,
    aPts: string,
    bannerText: string
  ) {
    const ctx = this.jumbotronCtx;
    if (!ctx) return;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 512, 192);

    // Top banner
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, 512, 40);
    ctx.fillStyle = '#020617';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bannerText, 256, 20);

    // Player row
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 54, 472, 56);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(pName.toUpperCase(), 38, 84);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${pGames}`, 360, 84);
    ctx.fillStyle = '#facc15';
    ctx.fillText(pPts, 445, 84);

    // AI row
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 120, 472, 56);
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'left';
    ctx.fillText(aName.toUpperCase(), 38, 150);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${aGames}`, 360, 150);
    ctx.fillStyle = '#facc15';
    ctx.fillText(aPts, 445, 150);

    this.jumbotronTex.needsUpdate = true;
  }

  private buildPerimeterDecor() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2,
    });

    const backWallGeo = new THREE.BoxGeometry(48, 5.0, 0.5);
    const backWallNorth = new THREE.Mesh(backWallGeo, wallMat);
    backWallNorth.position.set(0, 2.5, -(COURT_HALF_LENGTH + 16));
    this.group.add(backWallNorth);

    const backWallSouth = new THREE.Mesh(backWallGeo, wallMat);
    backWallSouth.position.set(0, 2.5, COURT_HALF_LENGTH + 16);
    this.group.add(backWallSouth);

    // Stadium Waving Championship Flags
    const flagColors = [0x22c55e, 0x3b82f6, 0xfacc15, 0xef4444];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });

    [-12, -6, 6, 12].forEach((xPos, idx) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), poleMat);
      pole.position.set(xPos, 5.8, -(COURT_HALF_LENGTH + 15.8));
      this.group.add(pole);

      const flagGeo = new THREE.PlaneGeometry(1.4, 0.8, 6, 2);
      flagGeo.translate(0.7, 0, 0);
      const flagMat = new THREE.MeshStandardMaterial({
        color: flagColors[idx % flagColors.length],
        side: THREE.DoubleSide,
        roughness: 0.6,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(xPos, 6.9, -(COURT_HALF_LENGTH + 15.8));
      this.flags.push(flag);
      this.group.add(flag);
    });
  }

  private buildReticles() {
    // 1. Incoming ball landing reticle (shows where ball will bounce)
    const outerGeo = new THREE.RingGeometry(0.32, 0.42, 24);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.landingRingOuter = new THREE.Mesh(outerGeo, outerMat);
    this.landingRingOuter.rotation.x = -Math.PI / 2;

    const innerGeo = new THREE.CircleGeometry(0.14, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.landingRingInner = new THREE.Mesh(innerGeo, innerMat);
    this.landingRingInner.rotation.x = -Math.PI / 2;

    this.landingReticle.add(this.landingRingOuter);
    this.landingReticle.add(this.landingRingInner);
    this.landingReticle.position.y = 0.015;
    this.landingReticle.visible = false;
    this.group.add(this.landingReticle);

    // 2. Serve Target Reticle (shows aim spot in diagonal service box)
    const serveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.58, 28),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    serveRing.rotation.x = -Math.PI / 2;

    const serveCross1 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
    );
    serveCross1.rotation.x = -Math.PI / 2;
    const serveCross2 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
    );
    serveCross2.rotation.x = -Math.PI / 2;

    this.serveTargetReticle.add(serveRing, serveCross1, serveCross2);
    this.serveTargetReticle.position.y = 0.018;
    this.serveTargetReticle.visible = false;
    this.group.add(this.serveTargetReticle);

    // 3. Practice Target Ring (on far court)
    const pOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    pOuter.rotation.x = -Math.PI / 2;
    const pInner = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 24),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false })
    );
    pInner.rotation.x = -Math.PI / 2;
    this.practiceTargetMesh.add(pOuter, pInner);
    this.practiceTargetMesh.position.copy(this.practiceTargetPos);
    this.practiceTargetMesh.visible = false;
    this.group.add(this.practiceTargetMesh);
  }

  private buildEffectsPool() {
    const partGeo = new THREE.SphereGeometry(0.06, 6, 6);
    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(partGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        active: false,
      });
    }

    const ringGeo = new THREE.RingGeometry(0.16, 0.24, 24);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({
        mesh,
        life: 0,
        maxLife: 0.45,
        active: false,
      });
    }
  }

  public spawnBounceEffect(pos: THREE.Vector3, isOut: boolean = false) {
    const color = isOut ? 0xf43f5e : this.currentDustColor;

    // Shockwave Ring
    const ring = this.rings.find(r => !r.active);
    if (ring) {
      ring.active = true;
      ring.life = 0;
      ring.maxLife = 0.45;
      ring.mesh.position.set(pos.x, 0.02, pos.z);
      ring.mesh.scale.set(1, 1, 1);
      (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
      ring.mesh.visible = true;
    }

    // Dust / Turf Particles
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active && spawned < 10) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.2;
        p.mesh.position.set(pos.x, 0.06, pos.z);
        const angle = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 2.5;
        p.vel.set(Math.cos(angle) * spd, 1.8 + Math.random() * 2.2, Math.sin(angle) * spd);
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
        p.mesh.visible = true;
        spawned++;
      }
    }
  }

  public spawnHitSparks(pos: THREE.Vector3, colorHex: number = 0xfacc15) {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active && spawned < 14) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.25 + Math.random() * 0.15;
        p.mesh.position.copy(pos);
        p.vel.set(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.2) * 5,
          (Math.random() - 0.5) * 6
        );
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
        p.mesh.visible = true;
        spawned++;
      }
    }
  }

  public updateEffects(dt: number, time: number) {
    // Update particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.03) p.mesh.position.y = 0.03;
      const ratio = 1 - p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
      p.mesh.scale.setScalar(ratio);
    }

    // Update rings
    for (const r of this.rings) {
      if (!r.active) continue;
      r.life += dt;
      if (r.life >= r.maxLife) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const p = r.life / r.maxLife;
      const s = 1 + p * 3.5;
      r.mesh.scale.set(s, s, s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
    }

    // Animate landing & serve reticles gently
    if (this.landingReticle.visible) {
      const s = 0.9 + Math.sin(time * 10) * 0.12;
      this.landingRingOuter.scale.set(s, s, s);
    }
    if (this.serveTargetReticle.visible) {
      this.serveTargetReticle.rotation.y = time * 1.6;
    }
    if (this.practiceTargetMesh.visible) {
      const ps = 0.95 + Math.sin(time * 5) * 0.08;
      this.practiceTargetMesh.scale.set(ps, ps, ps);
    }

    // Wave flags gently
    this.flags.forEach((flag, idx) => {
      flag.rotation.y = Math.sin(time * 3.2 + idx) * 0.18;
    });
  }

  public randomizePracticeTarget() {
    const x = (Math.random() - 0.5) * (COURT_HALF_WIDTH_SINGLES * 1.4);
    const z = -2.5 - Math.random() * (COURT_HALF_LENGTH - 3.8);
    this.practiceTargetPos.set(x, 0.02, z);
    this.practiceTargetMesh.position.copy(this.practiceTargetPos);
  }

  public applySurface(surfaceId: CourtSurface) {
    const cfg = COURT_SURFACES[surfaceId];
    this.innerCourtMat.color.setHex(cfg.innerColor);
    this.runOffMat.color.setHex(cfg.outerColor);
    this.outerGrassMat.color.setHex(cfg.stadiumGrassColor);
    this.lineMat.color.setHex(cfg.lineColor);
    this.currentDustColor = cfg.dustColor;
  }

  public animateCrowd(time: number, isCheering: boolean = false) {
    if (!this.audienceInstances || !this.audienceHeadInstances) return;
    const dummy = new THREE.Object3D();
    const count = this.audienceCount;

    for (let i = 0; i < count; i++) {
      const baseMat = this.audienceBaseMatrices[i];
      if (!baseMat) continue;

      const seed = i * 0.37;
      const bobFreq = isCheering ? 8.5 : 1.5;
      const bobAmp = isCheering ? 0.20 : 0.03;
      const yOffset = Math.sin(time * bobFreq + seed) * bobAmp;

      dummy.matrix.copy(baseMat);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.position.y += yOffset;

      if (isCheering) {
        dummy.rotation.x = Math.sin(time * 10 + seed) * 0.1;
      }

      dummy.updateMatrix();
      this.audienceHeadInstances.setMatrixAt(i, dummy.matrix);
    }
    this.audienceHeadInstances.instanceMatrix.needsUpdate = true;
  }
}
