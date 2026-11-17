import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TennisCourt, COURT_HALF_LENGTH, COURT_HALF_WIDTH_SINGLES, SERVICE_LINE_Z } from './tennisCourt';
import { TennisPlayer } from './tennisPlayer';
import { TennisBall, GRAVITY, BallBounceInfo } from './tennisBall';
import { TennisAI } from './tennisAI';
import { COURT_SURFACES, PLAYABLE_CHARACTERS, TOURNAMENT_OPPONENTS } from './constants';
import { tennisAudio } from '../audio/tennisAudio';
import { 
  GameState, 
  ScoreState, 
  MatchStats, 
  GameSettings, 
  PointAnnouncement,
  ShotType,
  TournamentProgress
} from '../types/tennis';

const _tempVec = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export class TennisGameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  private mountElement: HTMLElement;

  // Scene Components
  public court: TennisCourt;
  public userPlayer: TennisPlayer;
  public aiPlayer: TennisPlayer;
  public ball: TennisBall;
  public ai: TennisAI;

  // Lighting
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Game Settings & State
  public state: GameState = 'menu';
  private stateBeforePause: GameState = 'rally';

  public settings: GameSettings = {
    mode: 'quick',
    surface: 'grass',
    difficulty: 'medium',
    gamesToWinSet: 3,
    setsToWinMatch: 1,
    characterId: 'alex',
    soundEnabled: true,
    soundVolume: 0.7,
    cameraDynamic: true,
    autoAssist: true,
  };

  public tournament: TournamentProgress = {
    round: 1,
    roundName: 'QUARTERFINAL',
    opponentName: 'Sam',
    wonTournament: false,
  };

  private playerChar = PLAYABLE_CHARACTERS[0];
  private opponentName = 'OPPONENT';

  // Tennis Score
  public score: ScoreState = {
    playerPoints: 0,
    aiPoints: 0,
    playerGames: 0,
    aiGames: 0,
    playerSets: 0,
    aiSets: 0,
    setHistory: [],
    isTiebreak: false,
    currentServer: 'player',
    serveSide: 'deuce',
    isDeuce: false,
    isAdPlayer: false,
    isAdAi: false,
    scoreDisplay: { player: '0', ai: '0' },
    servingFaultCount: 0,
  };

  // Match Statistics
  public stats: MatchStats = {
    acesPlayer: 0,
    acesAi: 0,
    winnersPlayer: 0,
    winnersAi: 0,
    unforcedErrorsPlayer: 0,
    unforcedErrorsAi: 0,
    powerShotsPlayer: 0,
    totalPointsPlayer: 0,
    totalPointsAi: 0,
    maxRally: 0,
    currentRally: 0,
    lastServeSpeedKmh: 0,
    fastestServeKmh: 0,
    practiceScore: 0,
    practiceBestStreak: 0,
  };

  // Power Charge Meter (0 to 100)
  public powerCharge: number = 0;

  // Input states
  public keysHeld: { [key: string]: boolean } = {};
  public joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  private spaceWasPressed: boolean = false;
  private enterWasPressed: boolean = false;
  private sliceWasPressed: boolean = false;
  private lobWasPressed: boolean = false;

  // Swing input buffering
  private swingBufferTimer: number = 0;
  private bufferedShotType: ShotType = 'topspin';

  // Serve toss state
  private isTossingBall: boolean = false;
  private tossTimer: number = 0;

  // Deterministic state timers (replaces setTimeout!)
  private pendingAction: 'next_point' | 'replay_serve' | null = null;
  private pendingActionTimer: number = 0;
  private netFailTimer: number = 0;

  // Juice: Hitstop & Camera Shake
  private hitstopTimer: number = 0;
  private cameraShake: number = 0;

  // Callbacks
  public onScoreUpdate?: (score: ScoreState) => void;
  public onStatsUpdate?: (stats: MatchStats) => void;
  public onAnnouncement?: (announcement: PointAnnouncement) => void;
  public onStateChange?: (state: GameState) => void;
  public onServeMeterUpdate?: (meter: number) => void;
  public onPowerChargeUpdate?: (charge: number) => void;
  public onTournamentUpdate?: (t: TournamentProgress) => void;

  constructor(mountElement: HTMLElement) {
    this.mountElement = mountElement;

    this.scene = new THREE.Scene();
    const surfaceCfg = COURT_SURFACES[this.settings.surface];
    this.scene.background = new THREE.Color(surfaceCfg.skyColor);
    this.scene.fog = new THREE.FogExp2(surfaceCfg.skyColor, surfaceCfg.fogDensity);

    const aspect = mountElement.clientWidth / mountElement.clientHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 220);
    this.camera.position.set(0, 8.5, 23.5);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(mountElement.clientWidth, mountElement.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountElement.appendChild(this.renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x14532d, surfaceCfg.ambientIntensity);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, surfaceCfg.keyLightIntensity);
    this.keyLight.position.set(16, 28, 14);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 85;
    this.keyLight.shadow.camera.left = -22;
    this.keyLight.shadow.camera.right = 22;
    this.keyLight.shadow.camera.top = 26;
    this.keyLight.shadow.camera.bottom = -26;
    this.keyLight.shadow.bias = -0.0004;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.5);
    rimLight.position.set(-15, 12, -20);
    this.scene.add(rimLight);

    this.court = new TennisCourt();
    this.scene.add(this.court.group);

    this.userPlayer = new TennisPlayer({
      ...this.playerChar,
      isAi: false,
    });
    this.userPlayer.setPosition(0, 12.2);
    this.scene.add(this.userPlayer.group);

    this.aiPlayer = new TennisPlayer({
      jerseyColor: 0xe11d48,
      shortsColor: 0x1e293b,
      skinColor: 0xe0a97a,
      hairColor: 0x1e293b,
      headbandColor: 0xfacc15,
      racketColor: 0x22c55e,
      isAi: true,
    });
    this.aiPlayer.setPosition(0, -12.2);
    this.scene.add(this.aiPlayer.group);

    this.ball = new TennisBall();
    this.scene.add(this.ball.group);

    this.ai = new TennisAI(this.aiPlayer, this.settings.difficulty);

    this.applySurface(this.settings.surface);
    this.setupInputs();
    window.addEventListener('resize', this.onResize);

    this.renderer.compile(this.scene, this.camera);
    this.startLoop();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.spaceWasPressed) {
        this.handleSpaceAction();
        this.spaceWasPressed = true;
      }
    }

    if (e.code === 'Enter') {
      e.preventDefault();
      if (!this.enterWasPressed) {
        this.handleEnterAction();
        this.enterWasPressed = true;
      }
    }

    if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (!this.sliceWasPressed) {
        this.handleSliceAction();
        this.sliceWasPressed = true;
      }
    }

    if (e.code === 'KeyQ') {
      if (!this.lobWasPressed) {
        this.handleLobAction();
        this.lobWasPressed = true;
      }
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      this.togglePause();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
    if (e.code === 'Space') this.spaceWasPressed = false;
    if (e.code === 'Enter') this.enterWasPressed = false;
    if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sliceWasPressed = false;
    if (e.code === 'KeyQ') this.lobWasPressed = false;
  };

  private onWindowBlur = () => {
    this.keysHeld = {};
    this.spaceWasPressed = false;
    this.enterWasPressed = false;
    this.sliceWasPressed = false;
    this.lobWasPressed = false;
  };

  private setupInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
  }

  private onResize = () => {
    if (!this.mountElement || !this.renderer || !this.camera) return;
    const w = this.mountElement.clientWidth;
    const h = this.mountElement.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public applySurface(surface: GameSettings['surface']) {
    this.settings.surface = surface;
    const cfg = COURT_SURFACES[surface];
    this.court.applySurface(surface);
    this.ball.setSurfacePhysics(cfg.restitution, cfg.horizontalDamp);
    this.scene.background = new THREE.Color(cfg.skyColor);
    this.scene.fog = new THREE.FogExp2(cfg.skyColor, cfg.fogDensity);
    this.hemiLight.intensity = cfg.ambientIntensity;
    this.keyLight.intensity = cfg.keyLightIntensity;
  }

  public applyCharacter(characterId: string) {
    this.settings.characterId = characterId;
    const found = PLAYABLE_CHARACTERS.find(c => c.id === characterId) || PLAYABLE_CHARACTERS[0];
    this.playerChar = found;
    this.userPlayer.applyAppearance(found);
    this.userPlayer.speed = 9.8 * found.speedBonus;
  }

  public setDifficulty(diff: 'easy' | 'medium' | 'hard') {
    this.settings.difficulty = diff;
    this.ai.setDifficulty(diff);
  }

  public setGamesToWin(games: number) {
    this.settings.gamesToWinSet = games;
  }

  public setSetsToWin(sets: number) {
    this.settings.setsToWinMatch = sets;
  }

  public setSoundMuted(muted: boolean) {
    this.settings.soundEnabled = !muted;
    tennisAudio.setMuted(muted);
  }

  public startMatch(resetTournament: boolean = true) {
    this.pendingAction = null;
    this.pendingActionTimer = 0;
    this.swingBufferTimer = 0;
    this.netFailTimer = 0;
    this.powerCharge = 0;
    this.userPlayer.setPowerReady(false);
    this.onPowerChargeUpdate?.(0);

    // Configure Mode specifics
    this.ai.isPracticeMode = this.settings.mode === 'practice';
    this.court.practiceTargetMesh.visible = this.settings.mode === 'practice';
    if (this.settings.mode === 'practice') {
      this.court.randomizePracticeTarget();
    }

    if (this.settings.mode === 'tournament') {
      if (resetTournament) {
        this.tournament = {
          round: 1,
          roundName: TOURNAMENT_OPPONENTS[0].roundName,
          opponentName: TOURNAMENT_OPPONENTS[0].character.name,
          wonTournament: false,
        };
      }
      const opp = TOURNAMENT_OPPONENTS[this.tournament.round - 1] || TOURNAMENT_OPPONENTS[0];
      this.ai.setDifficulty(opp.difficulty);
      this.aiPlayer.applyAppearance(opp.character);
      this.aiPlayer.speed = 9.6 * opp.character.speedBonus;
      this.opponentName = opp.character.name.toUpperCase();
      this.onTournamentUpdate?.({ ...this.tournament });
    } else {
      this.ai.setDifficulty(this.settings.difficulty);
      this.aiPlayer.applyAppearance({
        jerseyColor: 0xe11d48,
        shortsColor: 0x1e293b,
        skinColor: 0xe0a97a,
        hairColor: 0x1e293b,
        headbandColor: 0xfacc15,
        racketColor: 0x22c55e,
      });
      this.opponentName = this.settings.mode === 'practice' ? 'PARTNER' : 'OPPONENT';
    }

    this.resetScore();
    this.state = 'serving';
    this.prepareServe();
    this.onStateChange?.(this.state);
    tennisAudio.playWhistle();
  }

  public advanceTournamentRound() {
    if (this.tournament.round < 3) {
      const nextRound = this.tournament.round + 1;
      const opp = TOURNAMENT_OPPONENTS[nextRound - 1];
      this.tournament = {
        round: nextRound,
        roundName: opp.roundName,
        opponentName: opp.character.name,
        wonTournament: false,
      };
      this.startMatch(false);
    }
  }

  public restartMatch() {
    this.startMatch(this.settings.mode === 'tournament' ? false : true);
  }

  public togglePause() {
    if (this.state === 'game_over' || this.state === 'menu') return;
    if (this.state === 'paused') {
      this.state = this.stateBeforePause;
      this.onStateChange?.(this.state);
    } else {
      this.stateBeforePause = this.state;
      this.state = 'paused';
      this.onStateChange?.(this.state);
    }
  }

  private resetScore() {
    this.score = {
      playerPoints: 0,
      aiPoints: 0,
      playerGames: 0,
      aiGames: 0,
      playerSets: 0,
      aiSets: 0,
      setHistory: [],
      isTiebreak: false,
      currentServer: 'player',
      serveSide: 'deuce',
      isDeuce: false,
      isAdPlayer: false,
      isAdAi: false,
      scoreDisplay: { player: '0', ai: '0' },
      servingFaultCount: 0,
    };
    this.stats = {
      acesPlayer: 0,
      acesAi: 0,
      winnersPlayer: 0,
      winnersAi: 0,
      unforcedErrorsPlayer: 0,
      unforcedErrorsAi: 0,
      powerShotsPlayer: 0,
      totalPointsPlayer: 0,
      totalPointsAi: 0,
      maxRally: 0,
      currentRally: 0,
      lastServeSpeedKmh: 0,
      fastestServeKmh: 0,
      practiceScore: 0,
      practiceBestStreak: this.stats.practiceBestStreak || 0,
    };
    this.updateScoreDisplay();
  }

  private updateScoreDisplay() {
    if (this.score.isTiebreak) {
      this.score.isDeuce = false;
      this.score.isAdPlayer = false;
      this.score.isAdAi = false;
      this.score.scoreDisplay = {
        player: `${this.score.playerPoints}`,
        ai: `${this.score.aiPoints}`,
      };
    } else if (this.score.playerPoints >= 3 && this.score.aiPoints >= 3) {
      if (this.score.playerPoints === this.score.aiPoints) {
        this.score.isDeuce = true;
        this.score.isAdPlayer = false;
        this.score.isAdAi = false;
        this.score.scoreDisplay = { player: '40', ai: '40' };
      } else if (this.score.playerPoints === this.score.aiPoints + 1) {
        this.score.isDeuce = false;
        this.score.isAdPlayer = true;
        this.score.isAdAi = false;
        this.score.scoreDisplay = { player: 'AD', ai: '40' };
      } else if (this.score.aiPoints === this.score.playerPoints + 1) {
        this.score.isDeuce = false;
        this.score.isAdPlayer = false;
        this.score.isAdAi = true;
        this.score.scoreDisplay = { player: '40', ai: 'AD' };
      }
    } else {
      const tennisPointNames = ['0', '15', '30', '40'];
      this.score.isDeuce = false;
      this.score.isAdPlayer = false;
      this.score.isAdAi = false;
      this.score.scoreDisplay = {
        player: tennisPointNames[this.score.playerPoints] || '40',
        ai: tennisPointNames[this.score.aiPoints] || '40',
      };
    }

    const bannerTitle =
      this.settings.mode === 'tournament'
        ? this.tournament.roundName
        : this.settings.mode === 'practice'
        ? 'PRACTICE RALLY'
        : COURT_SURFACES[this.settings.surface].name.toUpperCase();

    this.court.updateJumbotron(
      this.playerChar.name,
      this.opponentName,
      this.score.playerGames,
      this.score.aiGames,
      this.score.scoreDisplay.player,
      this.score.scoreDisplay.ai,
      bannerTitle
    );

    this.onScoreUpdate?.({ ...this.score });
    this.onStatsUpdate?.({ ...this.stats });
  }

  private prepareServe() {
    this.pendingAction = null;
    this.netFailTimer = 0;
    this.swingBufferTimer = 0;
    this.court.landingReticle.visible = false;

    const isPlayerServer = this.score.currentServer === 'player';
    const side = this.score.serveSide;

    if (isPlayerServer) {
      const serveX = side === 'deuce' ? 1.8 : -1.8;
      this.userPlayer.setPosition(serveX, 12.2);
      this.userPlayer.setAnimation('idle');
      this.ai.resetPosition(false, side);

      this.ball.reset(new THREE.Vector3(serveX + 0.35, 1.1, 12.0));
      this.isTossingBall = false;
      this.onServeMeterUpdate?.(0);
      this.court.serveTargetReticle.visible = true;
    } else {
      this.court.serveTargetReticle.visible = false;
      this.ai.resetPosition(true, side);
      const recvX = side === 'deuce' ? -2.4 : 2.4;
      this.userPlayer.setPosition(recvX, 12.4);
      this.userPlayer.setAnimation('idle');

      const aiServeX = side === 'deuce' ? -1.8 : 1.8;
      this.ball.reset(new THREE.Vector3(aiServeX - 0.35, 1.1, -12.0));

      this.ai.startServeSequence(this.ball, side, (vel) => {
        this.ball.launch(vel, 'ai', true, side, 'serve');
        tennisAudio.playRacketHit(0.95);
        this.court.spawnHitSparks(this.ball.position, 0xfacc15);
        const aiSpeed = Math.floor(142 + Math.random() * 44);
        this.stats.lastServeSpeedKmh = aiSpeed;
        this.stats.fastestServeKmh = Math.max(this.stats.fastestServeKmh, aiSpeed);
        this.state = 'rally';
        this.onStateChange?.(this.state);
        this.onStatsUpdate?.({ ...this.stats });
      });
    }
  }

  public handleSpaceAction() {
    if (this.state === 'serving' && this.score.currentServer === 'player') {
      if (!this.isTossingBall) {
        this.startPlayerServeToss();
      } else {
        this.strikePlayerServe();
      }
    } else if (this.state === 'rally') {
      this.queueOrExecuteSwing('topspin');
    }
  }

  public handleEnterAction() {
    if (this.state === 'serving' && this.score.currentServer === 'player') {
      if (!this.isTossingBall) {
        this.startPlayerServeToss();
      } else {
        this.strikePlayerServe();
      }
    }
  }

  public handleSliceAction() {
    if (this.state === 'rally') {
      this.queueOrExecuteSwing('slice');
    }
  }

  public handleLobAction() {
    if (this.state === 'rally') {
      this.queueOrExecuteSwing('lob');
    }
  }

  private queueOrExecuteSwing(shotType: ShotType) {
    const hit = this.attemptPlayerSwing(shotType, false);
    if (!hit) {
      // Buffer swing for 200ms so early clicks still connect cleanly!
      this.swingBufferTimer = 0.20;
      this.bufferedShotType = shotType;
    }
  }

  private startPlayerServeToss() {
    this.isTossingBall = true;
    this.tossTimer = 0;
    this.userPlayer.setAnimation('serve_toss', 0.65);
    tennisAudio.playServeWhoosh();

    this.ball.position.set(this.userPlayer.group.position.x + 0.35, 1.15, 12.0);
    this.ball.velocity.set(0, 7.2, 0);
    this.ball.active = true;
  }

  private computeServeTargetX(): number {
    let aimX = 0;
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft'] || this.joystickVector.x < -0.25) {
      aimX = -1.35;
    } else if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight'] || this.joystickVector.x > 0.25) {
      aimX = 1.35;
    }
    const baseTargetX = this.score.serveSide === 'deuce' ? -2.1 : 2.1;
    return Math.max(-COURT_HALF_WIDTH_SINGLES + 0.4, Math.min(COURT_HALF_WIDTH_SINGLES - 0.4, baseTargetX + aimX));
  }

  private strikePlayerServe() {
    if (!this.isTossingBall) return;
    this.isTossingBall = false;
    this.court.serveTargetReticle.visible = false;
    this.onServeMeterUpdate?.(0);
    this.userPlayer.setAnimation('serve_smash', 0.45);

    const ballHeight = this.ball.position.y;
    const optimalHeight = 2.4;
    const timingAccuracy = 1.0 - Math.min(1.0, Math.abs(ballHeight - optimalHeight) / 1.0);
    const isPerfectServe = timingAccuracy > 0.82;

    const speedKmh = Math.floor((135 + timingAccuracy * 68) * this.playerChar.powerBonus);

    const targetX = this.computeServeTargetX();
    const targetZ = -SERVICE_LINE_Z + 1.35;

    const dx = targetX - this.ball.position.x;
    const dz = targetZ - this.ball.position.z;
    const distXZ = Math.sqrt(dx * dx + dz * dz);

    const shotSpeed = (22.5 + timingAccuracy * 7.5) * this.playerChar.powerBonus;
    const travelTime = distXZ / shotSpeed;
    const vx = dx / travelTime;
    const vz = dz / travelTime;
    const spinX = isPerfectServe ? -1.4 : -0.6;
    const effG = GRAVITY + spinX * 2.5;
    const vy = (0.15 - this.ball.position.y) / travelTime - 0.5 * effG * travelTime;

    const serveVel = new THREE.Vector3(vx, Math.max(1.8, Math.min(6.8, vy)), vz);

    this.ball.launch(serveVel, 'player', true, this.score.serveSide, 'serve', new THREE.Vector3(spinX, 0, 0), isPerfectServe);

    if (isPerfectServe) {
      tennisAudio.playSmashHit();
      this.court.spawnHitSparks(this.ball.position, 0xf97316);
      this.hitstopTimer = 0.035;
      this.cameraShake = 0.25;
      this.announcePoint('POWER SERVE!', `${speedKmh} km/h`, 'smash');
    } else {
      tennisAudio.playRacketHit(0.95);
      this.court.spawnHitSparks(this.ball.position, 0xfacc15);
    }

    this.stats.lastServeSpeedKmh = speedKmh;
    this.stats.fastestServeKmh = Math.max(this.stats.fastestServeKmh, speedKmh);
    this.state = 'rally';
    this.onStateChange?.(this.state);
    this.onStatsUpdate?.({ ...this.stats });
  }

  private attemptPlayerSwing(shotType: ShotType = 'topspin', fromBuffer: boolean = false): boolean {
    const playerPos = this.userPlayer.group.position;
    const ballPos = this.ball.position;

    // Can only hit if ball is active and heading toward player or bounced on player's side
    const distXZ = Math.hypot(playerPos.x - ballPos.x, playerPos.z - ballPos.z);
    const inReachZ = ballPos.z >= 1.2 && ballPos.z <= 15.2;
    const inReachY = ballPos.y >= 0.12 && ballPos.y <= 3.1;
    const isBallPlayable = this.ball.active && this.ball.lastHitBy !== 'player';

    if (isBallPlayable && distXZ < 2.85 && inReachZ && inReachY) {
      this.swingBufferTimer = 0;

      // Subtle magnetic lunge toward ball for crisp arcade feel
      playerPos.x = THREE.MathUtils.lerp(playerPos.x, ballPos.x - 0.2, 0.28);
      playerPos.z = THREE.MathUtils.lerp(playerPos.z, Math.min(14.5, ballPos.z + 0.35), 0.22);

      // Check for Overhead Smash or Charged Power Shot
      const isOverheadSmash = ballPos.y > 1.88 && shotType !== 'lob';
      const isPowerCharged = this.powerCharge >= 100 && shotType !== 'lob';
      const finalShotType: ShotType = isOverheadSmash || isPowerCharged ? 'smash' : shotType;
      const isPower = finalShotType === 'smash';

      if (isPower) {
        this.powerCharge = 0;
        this.userPlayer.setPowerReady(false);
        this.onPowerChargeUpdate?.(0);
        this.userPlayer.setAnimation('swing_smash', 0.42);
        this.stats.powerShotsPlayer++;
      } else if (finalShotType === 'slice') {
        this.userPlayer.setAnimation('swing_slice', 0.40);
      } else {
        const isForehand = ballPos.x >= playerPos.x - 0.2;
        this.userPlayer.setAnimation(isForehand ? 'swing_forehand' : 'swing_backhand', 0.40);
      }

      // Aiming X
      let targetX = 0;
      if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft'] || this.joystickVector.x < -0.25) {
        targetX = -3.15;
      } else if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight'] || this.joystickVector.x > 0.25) {
        targetX = 3.15;
      } else {
        // Smart open-court aim away from AI
        targetX = this.aiPlayer.group.position.x > 0 ? -2.3 : 2.3;
      }

      // Depth & Arc
      let targetZ = -COURT_HALF_LENGTH + 1.4;
      let power = 21.5 * this.playerChar.powerBonus;
      let arcHeight = 0.4;
      let spinX = -1.6;

      if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp'] || this.joystickVector.y < -0.3) {
        targetZ = -COURT_HALF_LENGTH + 0.75; // deep baseline drive
        power = 24.0 * this.playerChar.powerBonus;
      } else if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown'] || this.joystickVector.y > 0.3) {
        targetZ = -4.2; // short angle / drop shot
        power = 14.5;
        arcHeight = 0.65;
      }

      if (finalShotType === 'slice') {
        if (!(this.keysHeld['KeyS'] || this.keysHeld['ArrowDown'] || this.joystickVector.y > 0.3)) {
          targetZ = -5.2;
        }
        power = 15.5;
        spinX = 1.2; // backspin
        arcHeight = 0.45;
      } else if (finalShotType === 'lob') {
        targetZ = -COURT_HALF_LENGTH + 0.9;
        power = 14.5;
        arcHeight = 4.0;
        spinX = -0.3;
      } else if (finalShotType === 'smash') {
        targetZ = -8.5;
        power = 28.5 * this.playerChar.powerBonus;
        spinX = -2.2;
        arcHeight = 0.15;
      }

      const dx = targetX - ballPos.x;
      const dz = targetZ - ballPos.z;
      const distToTarget = Math.sqrt(dx * dx + dz * dz);
      const travelTime = Math.max(0.22, distToTarget / power);

      const vx = dx / travelTime;
      const vz = dz / travelTime;
      const effG = GRAVITY + spinX * 2.5;
      const vy = (arcHeight - ballPos.y) / travelTime - 0.5 * effG * travelTime;

      const hitVel = new THREE.Vector3(vx, Math.max(2.2, Math.min(9.5, vy)), vz);
      this.ball.launch(hitVel, 'player', false, this.score.serveSide, finalShotType, new THREE.Vector3(spinX, 0, 0), isPower);

      if (isPower) {
        tennisAudio.playSmashHit();
        this.court.spawnHitSparks(ballPos, 0xf97316);
        this.hitstopTimer = 0.04;
        this.cameraShake = 0.32;
        this.announcePoint('SUPER SMASH!', 'Blistering power return!', 'smash');
      } else if (finalShotType === 'slice') {
        tennisAudio.playSliceHit();
        this.court.spawnHitSparks(ballPos, 0x38bdf8);
      } else {
        tennisAudio.playRacketHit(1.0, power > 22.5);
        this.court.spawnHitSparks(ballPos, 0xe2fd52);
      }

      // Build Power Charge during rally
      if (!isPower) {
        this.powerCharge = Math.min(100, this.powerCharge + 25);
        this.onPowerChargeUpdate?.(this.powerCharge);
        if (this.powerCharge >= 100) {
          this.userPlayer.setPowerReady(true);
        }
      }

      this.stats.currentRally++;
      this.stats.maxRally = Math.max(this.stats.maxRally, this.stats.currentRally);
      if (this.settings.mode === 'practice') {
        this.stats.practiceScore += 10;
        this.stats.practiceBestStreak = Math.max(this.stats.practiceBestStreak, this.stats.currentRally);
      }
      this.onStatsUpdate?.({ ...this.stats });
      return true;
    }

    if (!fromBuffer) {
      // Visual whiff only when not buffered
      if (!this.userPlayer.isSwinging) {
        this.userPlayer.setAnimation(shotType === 'slice' ? 'swing_slice' : 'swing_forehand', 0.32);
        tennisAudio.playServeWhoosh();
      }
    }
    return false;
  }

  private handleBallBounce = (info: BallBounceInfo) => {
    tennisAudio.playBallBounce(Math.abs(this.ball.velocity.y));

    if (this.state !== 'rally' && !this.ball.isServing) {
      this.court.spawnBounceEffect(info.position, false);
      return;
    }

    const { side, isInsideSingles, isInsideServiceBox, serviceBoxSide, bounceIndex, lineCall, position } = info;
    const lastHitter = this.ball.lastHitBy;

    // Practice Mode Bounce Handling
    if (this.settings.mode === 'practice') {
      this.court.spawnBounceEffect(position, !isInsideSingles);
      if (bounceIndex === 1 && lastHitter === 'player' && side === 'far' && isInsideSingles) {
        const distToTarget = Math.hypot(
          position.x - this.court.practiceTargetPos.x,
          position.z - this.court.practiceTargetPos.z
        );
        if (distToTarget < 1.35) {
          this.stats.practiceScore += 100;
          tennisAudio.playScoreChime();
          this.court.spawnHitSparks(position, 0xfacc15);
          this.announcePoint('BULLSEYE! +100', `Rally Streak: ${this.stats.currentRally}`, 'winner');
          this.court.randomizePracticeTarget();
          this.onStatsUpdate?.({ ...this.stats });
        }
      } else if (bounceIndex >= 2 || (bounceIndex === 1 && !isInsideSingles) || (bounceIndex === 1 && lastHitter === 'player' && side === 'near')) {
        // Reset practice rally gracefully
        this.stats.currentRally = 0;
        this.onStatsUpdate?.({ ...this.stats });
        this.announcePoint('RALLY RESET', 'Press SPACE to serve again!', 'out');
        this.ball.active = false;
        this.pendingAction = 'replay_serve';
        this.pendingActionTimer = 1.1;
      }
      return;
    }

    // 1. Serving Rules Check
    if (this.ball.isServing) {
      if (bounceIndex === 1) {
        const expectedSide = this.ball.server === 'player' ? 'far' : 'near';
        if (side !== expectedSide) {
          this.court.spawnBounceEffect(position, true);
          this.handleFault('Serve bounced on own side');
          return;
        }

        const targetQuadrant = this.ball.serveSide;
        const correctServiceBox = isInsideServiceBox && serviceBoxSide === targetQuadrant;

        this.court.spawnBounceEffect(position, !correctServiceBox);

        if (!correctServiceBox) {
          this.handleFault(this.ball.hasHitNet ? 'Net Fault' : 'Service Fault', lineCall);
          return;
        }

        if (this.ball.hasHitNet) {
          this.announcePoint('LET!', 'Net cord on serve — Replay', 'let');
          tennisAudio.playCrowdGasp();
          this.ball.active = false;
          this.pendingAction = 'replay_serve';
          this.pendingActionTimer = 1.1;
          return;
        }

        if (lineCall) {
          tennisAudio.playLineCall(true);
        }

        this.ball.isServing = false;
        return;
      }
    }

    // 2. Rally Rules Check
    if (bounceIndex === 1) {
      const expectedSide = lastHitter === 'player' ? 'far' : 'near';
      if (side !== expectedSide) {
        // Ball hit into hitter's OWN side of the court!
        this.court.spawnBounceEffect(position, true);
        tennisAudio.playFaultBuzzer();
        if (lastHitter === 'player') {
          this.stats.unforcedErrorsPlayer++;
          this.awardPoint('ai', 'NET ERROR!', 'Ball bounced on your side', 'net');
        } else {
          this.stats.unforcedErrorsAi++;
          this.awardPoint('player', 'ERROR!', 'Opponent hit into own court', 'net');
        }
        return;
      }

      this.court.spawnBounceEffect(position, !isInsideSingles);

      if (!isInsideSingles) {
        tennisAudio.playFaultBuzzer();
        tennisAudio.playCrowdGasp();
        if (lineCall) tennisAudio.playLineCall(false);

        if (lastHitter === 'player') {
          this.stats.unforcedErrorsPlayer++;
          this.awardPoint('ai', 'OUT!', 'Shot landed outside boundary', 'out', lineCall);
        } else {
          this.stats.unforcedErrorsAi++;
          this.awardPoint('player', 'OUT!', 'Opponent hit out of bounds', 'out', lineCall);
        }
        return;
      }

      if (lineCall && lineCall.distanceCm <= 25) {
        tennisAudio.playLineCall(true);
      }
    } else if (bounceIndex >= 2) {
      this.court.spawnBounceEffect(position, false);
      if (side === 'near') {
        if (this.stats.currentRally <= 1 && lastHitter === 'ai') {
          this.stats.acesAi++;
          this.awardPoint('ai', 'ACE!', `Unreturnable serve (${this.stats.lastServeSpeedKmh} km/h)`, 'ace');
        } else {
          this.stats.winnersAi++;
          this.awardPoint('ai', 'WINNER!', 'Opponent scored a winner', 'winner');
        }
      } else {
        if (this.stats.currentRally <= 1 && lastHitter === 'player') {
          this.stats.acesPlayer++;
          this.awardPoint('player', 'ACE!', `Blazing Ace (${this.stats.lastServeSpeedKmh} km/h)!`, 'ace');
        } else {
          this.stats.winnersPlayer++;
          this.awardPoint('player', 'WINNER!', 'Clean winner past opponent!', 'winner');
        }
      }
    }
  };

  private handleNetHit = (blockedByNet: boolean) => {
    tennisAudio.playNetHit();
    if (blockedByNet && (this.state === 'rally' || this.ball.isServing)) {
      // Ball hit solidly into the net — start deterministic short timer if it doesn't cross
      this.netFailTimer = 0.45;
    }
  };

  private handleFault(reason: string, lineCall?: PointAnnouncement['lineCall']) {
    this.score.servingFaultCount++;
    tennisAudio.playFaultBuzzer();
    this.ball.active = false;

    if (this.score.servingFaultCount === 1) {
      this.announcePoint('FAULT', 'Second Serve', 'fault', lineCall);
      this.onScoreUpdate?.({ ...this.score });
      this.state = 'point_over';
      this.onStateChange?.(this.state);
      this.pendingAction = 'replay_serve';
      this.pendingActionTimer = 1.25;
    } else {
      this.score.servingFaultCount = 0;
      if (this.score.currentServer === 'player') {
        this.stats.unforcedErrorsPlayer++;
        this.awardPoint('ai', 'DOUBLE FAULT', reason, 'double_fault', lineCall);
      } else {
        this.stats.unforcedErrorsAi++;
        this.awardPoint('player', 'DOUBLE FAULT', 'Opponent double faulted!', 'double_fault', lineCall);
      }
    }
  }

  private awardPoint(
    winner: 'player' | 'ai',
    title: string,
    subtitle: string,
    type: PointAnnouncement['type'],
    lineCall?: PointAnnouncement['lineCall']
  ) {
    if (this.state === 'point_over' || this.state === 'game_over') return;

    this.state = 'point_over';
    this.onStateChange?.(this.state);
    this.announcePoint(title, subtitle, type, lineCall);
    this.ball.active = false;
    this.netFailTimer = 0;

    if (winner === 'player') {
      this.stats.totalPointsPlayer++;
      this.userPlayer.setAnimation('celebrate', 1.6);
      this.aiPlayer.setAnimation('disappointed', 1.6);
      tennisAudio.playCrowdCheer(1.0);
    } else {
      this.stats.totalPointsAi++;
      this.aiPlayer.setAnimation('celebrate', 1.6);
      this.userPlayer.setAnimation('disappointed', 1.6);
      tennisAudio.playCrowdCheer(0.55);
    }

    this.score.servingFaultCount = 0;
    this.stats.currentRally = 0;

    // Tiebreak scoring
    if (this.score.isTiebreak) {
      if (winner === 'player') this.score.playerPoints++;
      else this.score.aiPoints++;

      const p = this.score.playerPoints;
      const a = this.score.aiPoints;
      if (p >= 7 && p - a >= 2) {
        this.awardGame('player');
        return;
      }
      if (a >= 7 && a - p >= 2) {
        this.awardGame('ai');
        return;
      }

      // Tiebreak serve switches after point 1, then every 2 points
      const totalTb = p + a;
      if (totalTb % 2 === 1) {
        this.score.currentServer = this.score.currentServer === 'player' ? 'ai' : 'player';
      }
      this.score.serveSide = totalTb % 2 === 0 ? 'deuce' : 'ad';

      this.updateScoreDisplay();
      this.pendingAction = 'next_point';
      this.pendingActionTimer = 1.8;
      return;
    }

    // Standard Tennis Game Progression
    if (winner === 'player') {
      if (this.score.playerPoints >= 3 && this.score.aiPoints >= 3) {
        if (this.score.isAdPlayer) {
          this.awardGame('player');
          return;
        } else if (this.score.isAdAi) {
          this.score.isAdAi = false;
          this.score.isDeuce = true;
        } else {
          this.score.isAdPlayer = true;
          this.score.isDeuce = false;
        }
      } else if (this.score.playerPoints === 3) {
        this.awardGame('player');
        return;
      } else {
        this.score.playerPoints++;
      }
    } else {
      if (this.score.playerPoints >= 3 && this.score.aiPoints >= 3) {
        if (this.score.isAdAi) {
          this.awardGame('ai');
          return;
        } else if (this.score.isAdPlayer) {
          this.score.isAdPlayer = false;
          this.score.isDeuce = true;
        } else {
          this.score.isAdAi = true;
          this.score.isDeuce = false;
        }
      } else if (this.score.aiPoints === 3) {
        this.awardGame('ai');
        return;
      } else {
        this.score.aiPoints++;
      }
    }

    const totalPointsInGame = this.score.playerPoints + this.score.aiPoints;
    this.score.serveSide = totalPointsInGame % 2 === 0 ? 'deuce' : 'ad';

    this.updateScoreDisplay();
    this.pendingAction = 'next_point';
    this.pendingActionTimer = 1.85;
  }

  private awardGame(winner: 'player' | 'ai') {
    tennisAudio.playScoreChime();

    if (winner === 'player') {
      this.score.playerGames++;
    } else {
      this.score.aiGames++;
    }

    const target = this.settings.gamesToWinSet;
    const pG = this.score.playerGames;
    const aG = this.score.aiGames;

    // Check tiebreak trigger (e.g. 3-3 or 6-6)
    const enteredTiebreak = !this.score.isTiebreak && target >= 3 && pG === target && aG === target;
    const playerWonSet = this.score.isTiebreak
      ? winner === 'player'
      : pG >= target && (pG - aG >= 2 || (target === 1 && pG >= 1));
    const aiWonSet = this.score.isTiebreak
      ? winner === 'ai'
      : aG >= target && (aG - pG >= 2 || (target === 1 && aG >= 1));

    if (playerWonSet || aiWonSet) {
      this.score.setHistory.push({ player: pG, ai: aG });
      if (playerWonSet) this.score.playerSets++;
      else this.score.aiSets++;

      if (this.score.playerSets >= this.settings.setsToWinMatch) {
        this.endMatch('player');
        return;
      }
      if (this.score.aiSets >= this.settings.setsToWinMatch) {
        this.endMatch('ai');
        return;
      }

      // Start next set
      this.score.playerGames = 0;
      this.score.aiGames = 0;
      this.score.isTiebreak = false;
      this.announcePoint(
        playerWonSet ? 'SET PLAYER!' : 'SET OPPONENT!',
        `Sets: ${this.score.playerSets} - ${this.score.aiSets}`,
        'set'
      );
    } else if (enteredTiebreak) {
      this.score.isTiebreak = true;
      this.announcePoint('TIE-BREAK!', 'First to 7 points (win by 2)', 'game');
    } else {
      this.announcePoint(
        winner === 'player' ? 'GAME PLAYER!' : `GAME ${this.opponentName}!`,
        `Games: ${pG} - ${aG}`,
        'game'
      );
    }

    this.score.playerPoints = 0;
    this.score.aiPoints = 0;
    this.score.isDeuce = false;
    this.score.isAdPlayer = false;
    this.score.isAdAi = false;
    this.score.serveSide = 'deuce';
    this.score.currentServer = this.score.currentServer === 'player' ? 'ai' : 'player';

    this.updateScoreDisplay();
    this.pendingAction = 'next_point';
    this.pendingActionTimer = 2.3;
  }

  private endMatch(winner: 'player' | 'ai') {
    this.state = 'game_over';
    this.pendingAction = null;
    this.onStateChange?.(this.state);
    this.updateScoreDisplay();

    if (winner === 'player') {
      if (this.settings.mode === 'tournament' && this.tournament.round === 3) {
        this.tournament.wonTournament = true;
        this.onTournamentUpdate?.({ ...this.tournament });
      }
      this.announcePoint('GAME, SET & MATCH!', `${this.playerChar.name.toUpperCase()} WINS!`, 'match');
      this.userPlayer.setAnimation('celebrate', 999);
      tennisAudio.playCrowdCheer(1.5);
      tennisAudio.playTrophyFanfare();
    } else {
      this.announcePoint('MATCH OVER', `${this.opponentName} takes the match`, 'match');
      this.aiPlayer.setAnimation('celebrate', 999);
    }
  }

  private announcePoint(
    title: string,
    subtitle: string,
    type: PointAnnouncement['type'],
    lineCall?: PointAnnouncement['lineCall']
  ) {
    this.onAnnouncement?.({
      title,
      subtitle,
      type,
      lineCall,
      time: Date.now(),
    });
  }

  private startLoop() {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private update(dt: number) {
    const time = this.clock.getElapsedTime();

    const isPointCelebration = this.state === 'point_over' || this.state === 'game_over';
    this.court.animateCrowd(time, isPointCelebration);
    this.court.updateEffects(dt, time);

    if (this.state === 'paused') return;

    if (this.state === 'menu') {
      const orbitAngle = time * 0.14;
      this.camera.position.x = Math.sin(orbitAngle) * 22;
      this.camera.position.z = Math.cos(orbitAngle) * 22;
      this.camera.position.y = 9.5;
      this.camera.lookAt(0, 1.2, 0);

      this.userPlayer.update(dt);
      this.aiPlayer.update(dt);
      return;
    }

    // Hitstop pause for impactful smashes
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    // Deterministic Pending Point / Serve Transitions
    if (this.pendingAction) {
      this.pendingActionTimer -= dt;
      if (this.pendingActionTimer <= 0) {
        const action = this.pendingAction;
        this.pendingAction = null;
        if (action === 'next_point' || action === 'replay_serve') {
          this.state = 'serving';
          this.prepareServe();
          this.onStateChange?.(this.state);
        }
      }
    }

    // Deterministic Net Fail Check
    if (this.netFailTimer > 0) {
      this.netFailTimer -= dt;
      if (this.netFailTimer <= 0 && (this.state === 'rally' || this.ball.isServing)) {
        const lastHitter = this.ball.lastHitBy;
        const failedToCross =
          (lastHitter === 'player' && this.ball.position.z >= -0.05) ||
          (lastHitter === 'ai' && this.ball.position.z <= 0.05);
        if (failedToCross) {
          if (this.ball.isServing) {
            this.handleFault('Net Fault');
          } else if (lastHitter === 'player') {
            this.stats.unforcedErrorsPlayer++;
            this.awardPoint('ai', 'NET!', 'Ball caught in the net', 'net');
          } else if (lastHitter === 'ai') {
            this.stats.unforcedErrorsAi++;
            this.awardPoint('player', 'NET!', 'Opponent hit the net', 'net');
          }
        }
      }
    }

    // Update Serve Aim Reticle while player prepares serve
    if (this.state === 'serving' && this.score.currentServer === 'player') {
      this.court.serveTargetReticle.visible = true;
      this.court.serveTargetReticle.position.set(this.computeServeTargetX(), 0.018, -SERVICE_LINE_Z + 1.35);
    } else {
      this.court.serveTargetReticle.visible = false;
    }

    // Update User Player Movement
    this.updatePlayerMovement(dt);

    // Process Swing Input Buffer
    if (this.swingBufferTimer > 0 && this.state === 'rally') {
      this.swingBufferTimer -= dt;
      this.attemptPlayerSwing(this.bufferedShotType, true);
    }

    // Update Ball Physics
    this.ball.update(dt, this.handleBallBounce, this.handleNetHit);

    // Update Landing Prediction Reticle on near court
    if (this.state === 'rally' && this.ball.active && this.ball.velocity.z > 0.5) {
      if (this.ball.predictNextBounce(_tempVec) && _tempVec.z > 0) {
        this.court.landingReticle.position.copy(_tempVec);
        this.court.landingReticle.visible = true;
      } else {
        this.court.landingReticle.visible = false;
      }
    } else {
      this.court.landingReticle.visible = false;
    }

    // Serve Toss Meter & Fallback
    if (this.isTossingBall && this.state === 'serving') {
      this.tossTimer += dt;
      const ballHeight = this.ball.position.y;
      const meterPercent = Math.min(100, Math.max(0, (ballHeight / 2.65) * 100));
      this.onServeMeterUpdate?.(meterPercent);

      if (this.ball.position.y <= 0.85 && this.tossTimer > 0.55) {
        this.isTossingBall = false;
        this.prepareServe();
      }
    }

    // Update AI Opponent
    this.ai.update(dt, this.ball, this.userPlayer.group.position, (vel, shotType, isPower) => {
      this.ball.launch(vel, 'ai', false, this.score.serveSide, shotType, undefined, isPower);
      if (isPower) {
        tennisAudio.playSmashHit();
        this.court.spawnHitSparks(this.ball.position, 0xf97316);
      } else if (shotType === 'slice') {
        tennisAudio.playSliceHit();
        this.court.spawnHitSparks(this.ball.position, 0x38bdf8);
      } else {
        tennisAudio.playRacketHit(1.0, shotType === 'topspin');
        this.court.spawnHitSparks(this.ball.position, 0xe2fd52);
      }
      this.stats.currentRally++;
      this.stats.maxRally = Math.max(this.stats.maxRally, this.stats.currentRally);
      this.onStatsUpdate?.({ ...this.stats });
    });

    this.updateCamera(dt);
  }

  private updatePlayerMovement(dt: number) {
    let moveX = 0;
    let moveZ = 0;

    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) moveX -= 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) moveX += 1;
    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) moveZ -= 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) moveZ += 1;

    if (Math.abs(this.joystickVector.x) > 0.1) moveX += this.joystickVector.x;
    if (Math.abs(this.joystickVector.y) > 0.1) moveZ += this.joystickVector.y;

    const pPos = this.userPlayer.group.position;

    // Gentle Auto-Assist when ball approaches player and player isn't actively steering away
    if (
      this.settings.autoAssist &&
      this.state === 'rally' &&
      this.ball.active &&
      this.ball.velocity.z > 1.0 &&
      Math.abs(moveX) < 0.1 &&
      Math.abs(moveZ) < 0.1
    ) {
      if (this.ball.predictNextBounce(_tempVec) && _tempVec.z > 0.5) {
        const dx = _tempVec.x - pPos.x;
        const dz = Math.min(13.5, _tempVec.z + 1.2) - pPos.z;
        if (Math.abs(dx) > 0.35) moveX = Math.sign(dx) * 0.55;
        if (Math.abs(dz) > 0.45) moveZ = Math.sign(dz) * 0.45;
      }
    }

    const lenSq = moveX * moveX + moveZ * moveZ;
    const isMoving = lenSq > 0.04;

    if (this.state === 'serving' && this.score.currentServer === 'player') {
      // Allow subtle left/right baseline positioning before toss
      if (!this.isTossingBall && Math.abs(moveX) > 0.1) {
        const halfMin = this.score.serveSide === 'deuce' ? 0.5 : -COURT_HALF_WIDTH_SINGLES + 0.3;
        const halfMax = this.score.serveSide === 'deuce' ? COURT_HALF_WIDTH_SINGLES - 0.3 : -0.5;
        pPos.x = THREE.MathUtils.clamp(pPos.x + Math.sign(moveX) * 4.5 * dt, halfMin, halfMax);
        this.ball.position.x = pPos.x + 0.35;
        this.ball.update(0, () => {}, () => {});
        this.userPlayer.setAnimation('run');
      } else if (!this.userPlayer.isSwinging) {
        this.userPlayer.setAnimation('idle');
      }
      this.userPlayer.update(dt);
      return;
    }

    if (isMoving && !this.userPlayer.isSwinging) {
      const len = Math.sqrt(lenSq);
      const nx = moveX / Math.max(1, len);
      const nz = moveZ / Math.max(1, len);

      const speed = this.userPlayer.speed;
      pPos.x += nx * speed * dt;
      pPos.z += nz * speed * dt;

      const minX = -COURT_HALF_WIDTH_SINGLES - 1.4;
      const maxX = COURT_HALF_WIDTH_SINGLES + 1.4;
      const minZ = 1.1;
      const maxZ = COURT_HALF_LENGTH + 3.2;

      pPos.x = Math.max(minX, Math.min(maxX, pPos.x));
      pPos.z = Math.max(minZ, Math.min(maxZ, pPos.z));

      this.userPlayer.setAnimation('run');
    } else if (!this.userPlayer.isSwinging && this.state !== 'point_over' && this.state !== 'game_over') {
      this.userPlayer.setAnimation('idle');
    }

    this.userPlayer.update(dt);
  }

  private updateCamera(dt: number) {
    const pPos = this.userPlayer.group.position;
    const bPos = this.ball.position;

    let targetCamX = pPos.x * 0.35;
    let targetCamY = 7.3;
    let targetCamZ = pPos.z + 9.5;

    if (this.settings.cameraDynamic && this.ball.active) {
      targetCamX += (bPos.x - pPos.x) * 0.14;
      targetCamY = 6.9 + Math.max(0, bPos.y * 0.16);
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 6.0, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 5.0, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 6.0, dt);

    if (this.cameraShake > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 14, dt);
    }

    _lookTarget.set(
      bPos.x * 0.2,
      1.2,
      THREE.MathUtils.clamp(bPos.z * 0.3, -8, 2)
    );
    this.camera.lookAt(_lookTarget);
  }

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
