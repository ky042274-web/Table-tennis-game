import * as THREE from 'three';
import { TennisPlayer } from './tennisPlayer';
import { TennisBall, GRAVITY } from './tennisBall';
import { COURT_HALF_LENGTH, COURT_HALF_WIDTH_SINGLES, SERVICE_LINE_Z } from './tennisCourt';
import { DifficultyLevel, ShotType } from '../types/tennis';

export class TennisAI {
  public player: TennisPlayer;
  public difficulty: DifficultyLevel = 'medium';
  public isPracticeMode: boolean = false;

  private targetPos: THREE.Vector3 = new THREE.Vector3(0, 0, -12.0);
  private serveState: 'none' | 'waiting' | 'tossing' = 'none';
  private serveTimer: number = 0;
  private pendingServeSide: 'deuce' | 'ad' = 'deuce';
  private serveCallback: ((vel: THREE.Vector3) => void) | null = null;
  private serveBall: TennisBall | null = null;

  constructor(player: TennisPlayer, difficulty: DifficultyLevel = 'medium') {
    this.player = player;
    this.difficulty = difficulty;
  }

  public setDifficulty(diff: DifficultyLevel) {
    this.difficulty = diff;
  }

  public cancelServe() {
    this.serveState = 'none';
    this.serveTimer = 0;
    this.serveCallback = null;
    this.serveBall = null;
  }

  public resetPosition(server: boolean = false, serveSide: 'deuce' | 'ad' = 'deuce') {
    this.cancelServe();
    if (server) {
      const serveX = serveSide === 'deuce' ? -1.8 : 1.8;
      this.player.setPosition(serveX, -12.2);
      this.targetPos.set(serveX, 0, -12.2);
    } else {
      const recvX = serveSide === 'deuce' ? 2.4 : -2.4;
      this.player.setPosition(recvX, -12.4);
      this.targetPos.set(recvX, 0, -12.4);
    }
    this.player.setAnimation('idle');
  }

  public startServeSequence(
    ball: TennisBall,
    serveSide: 'deuce' | 'ad',
    onServeComplete: (vel: THREE.Vector3) => void
  ) {
    this.serveBall = ball;
    this.pendingServeSide = serveSide;
    this.serveCallback = onServeComplete;
    this.serveState = 'waiting';
    this.serveTimer = 0.85;
  }

  public update(
    dt: number,
    ball: TennisBall,
    userPlayerPos: THREE.Vector3,
    onAiHit: (velocity: THREE.Vector3, shotType: ShotType, isPower: boolean) => void
  ) {
    // Handle dt-driven serve state machine
    if (this.serveState === 'waiting') {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) {
        this.serveState = 'tossing';
        this.serveTimer = 0.48;
        this.player.setAnimation('serve_toss', 0.52);
        if (this.serveBall) {
          this.serveBall.velocity.set(0, 6.2, 0);
          this.serveBall.active = true;
        }
      }
      this.player.update(dt);
      return;
    }

    if (this.serveState === 'tossing') {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0 && this.serveBall && this.serveCallback) {
        this.serveState = 'none';
        this.player.setAnimation('serve_smash', 0.42);

        const targetX = this.pendingServeSide === 'deuce' ? 2.1 : -2.1;
        const targetZ = SERVICE_LINE_Z - 1.4;

        const servePower = this.difficulty === 'hard' ? 24.5 : this.difficulty === 'medium' ? 20.5 : 16.5;
        const dx = targetX - this.serveBall.position.x;
        const dz = targetZ - this.serveBall.position.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        const travelTime = Math.max(0.25, distXZ / servePower);

        const vx = dx / travelTime;
        const vz = dz / travelTime;
        const effG = GRAVITY - 1.0; // slight topspin
        const vy = (0.15 - this.serveBall.position.y) / travelTime - 0.5 * effG * travelTime;

        const serveVel = new THREE.Vector3(vx, Math.max(2.0, Math.min(6.5, vy)), vz);
        const cb = this.serveCallback;
        this.serveCallback = null;
        this.serveBall = null;
        cb(serveVel);
      }
      this.player.update(dt);
      return;
    }

    const aiPos = this.player.group.position;

    let moveSpeed = 9.0;
    let aimAccuracy = 0.88;
    let shotPower = 20.5;

    if (this.isPracticeMode) {
      moveSpeed = 13.0;
      aimAccuracy = 1.0;
      shotPower = 17.5;
    } else if (this.difficulty === 'easy') {
      moveSpeed = 6.6;
      aimAccuracy = 0.72;
      shotPower = 17.5;
    } else if (this.difficulty === 'hard') {
      moveSpeed = 11.2;
      aimAccuracy = 0.96;
      shotPower = 23.5;
    }

    // AI moves to intercept incoming ball heading toward far side (vz < 0)
    const ballHeadingToAi = ball.active && ball.velocity.z < -0.5;

    if (ballHeadingToAi) {
      // Predict intercept point using landing point or current trajectory
      const distanceZ = Math.max(0.1, aiPos.z - ball.position.z);
      const timeToIntercept = Math.min(1.3, Math.abs(distanceZ / ball.velocity.z));

      let predX = ball.position.x + ball.velocity.x * timeToIntercept;
      predX = Math.max(-COURT_HALF_WIDTH_SINGLES - 1.0, Math.min(COURT_HALF_WIDTH_SINGLES + 1.0, predX));

      // Move forward if ball is a drop shot
      let predZ = -11.6;
      if (ball.position.z > -7.0 && Math.abs(ball.velocity.z) < 16) {
        predZ = Math.max(-11.8, Math.min(-4.5, ball.position.z - 1.2));
      } else {
        predZ = Math.max(-13.2, Math.min(-8.0, ball.position.z + ball.velocity.z * timeToIntercept * 0.4));
      }

      this.targetPos.set(predX, 0, predZ);

      const distXZToBall = Math.hypot(aiPos.x - ball.position.x, aiPos.z - ball.position.z);
      const isReachableZ = ball.position.z <= -2.0 && ball.position.z >= -13.6;
      const isReachableY = ball.position.y >= 0.18 && ball.position.y <= 3.1;

      if (distXZToBall < 2.25 && isReachableZ && isReachableY && !this.player.isSwinging) {
        const isForehand = ball.position.x <= aiPos.x + 0.2;
        let shotType: ShotType = isForehand ? 'topspin' : 'flat';
        let isPower = false;

        // Tactical shot choice
        if (this.isPracticeMode) {
          // Practice mode: steady topspin return near center-ish court so player has fun rallies
          const targetX = (Math.random() - 0.5) * 3.8;
          const targetZ = 9.5;
          const hitVel = this.solveArc(ball.position, targetX, targetZ, shotPower, -1.6);
          this.player.setAnimation(isForehand ? 'swing_forehand' : 'swing_backhand');
          onAiHit(hitVel, 'topspin', false);
          this.player.update(dt);
          return;
        }

        // Overhead smash if ball is high near midcourt
        if (ball.position.y > 2.05 && ball.position.z > -9.5) {
          shotType = 'smash';
          isPower = true;
          this.player.setAnimation('swing_smash', 0.42);
        } else if (this.difficulty === 'hard' && userPlayerPos.z > 11.2 && Math.random() < 0.22) {
          // Sneaky slice drop shot
          shotType = 'slice';
          this.player.setAnimation('swing_slice', 0.42);
        } else {
          this.player.setAnimation(isForehand ? 'swing_forehand' : 'swing_backhand');
        }

        // Aim away from user
        let targetX = userPlayerPos.x > 0 ? -2.7 : 2.7;
        if (Math.random() > aimAccuracy) {
          targetX += (Math.random() - 0.5) * 3.2;
        } else {
          targetX += (Math.random() - 0.5) * 1.1;
        }
        targetX = Math.max(-COURT_HALF_WIDTH_SINGLES + 0.45, Math.min(COURT_HALF_WIDTH_SINGLES - 0.45, targetX));

        let targetZ = COURT_HALF_LENGTH - 1.6 - Math.random() * 2.2;
        let power = shotPower;
        let spinX = -1.6;

        if (shotType === 'slice') {
          targetZ = 4.2 + Math.random() * 1.5;
          power = 15.0;
          spinX = 1.2;
        } else if (shotType === 'smash') {
          power = 27.0;
          targetZ = 8.5;
          spinX = -2.0;
        }

        const hitVel = this.solveArc(ball.position, targetX, targetZ, power, spinX);
        onAiHit(hitVel, shotType, isPower);
      }
    } else {
      // Recover toward center baseline
      this.targetPos.set(0, 0, -11.8);
    }

    const dirX = this.targetPos.x - aiPos.x;
    const dirZ = this.targetPos.z - aiPos.z;
    const distToTarget = Math.hypot(dirX, dirZ);

    if (distToTarget > 0.15) {
      const step = Math.min(distToTarget, moveSpeed * dt);
      aiPos.x += (dirX / distToTarget) * step;
      aiPos.z += (dirZ / distToTarget) * step;
      if (!this.player.isSwinging) {
        this.player.setAnimation('run');
      }
    } else if (!this.player.isSwinging) {
      this.player.setAnimation('idle');
    }

    this.player.update(dt);
  }

  private solveArc(from: THREE.Vector3, targetX: number, targetZ: number, speedXZ: number, spinX: number): THREE.Vector3 {
    const dx = targetX - from.x;
    const dz = targetZ - from.z;
    const distXZ = Math.max(0.5, Math.sqrt(dx * dx + dz * dz));
    const travelTime = distXZ / speedXZ;
    const vx = dx / travelTime;
    const vz = dz / travelTime;
    const effG = GRAVITY + spinX * 2.5;
    // Target landing height ~0.25 at targetZ so ball clears net comfortably
    const vy = (0.25 - from.y) / travelTime - 0.5 * effG * travelTime;
    return new THREE.Vector3(vx, Math.max(2.6, Math.min(9.5, vy)), vz);
  }
}
