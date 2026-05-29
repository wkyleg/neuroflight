import * as THREE from 'three';
import { useNeuroStore } from '@/neuro/store.ts';
import type { SessionSummary } from '@/stores/gameStore.ts';
import { useGameStore } from '@/stores/gameStore.ts';
import { AssetManager } from './core/AssetManager.ts';
import { AudioManager } from './core/AudioManager.ts';
import { AudioPolishSystem } from './core/AudioPolishSystem.ts';
import { CameraManager } from './core/CameraManager.ts';
import { eventBus } from './core/EventBus.ts';
import { InputManager } from './core/InputManager.ts';
import { Renderer } from './core/Renderer.ts';
import { getNextPresetId, getPreset } from './dev/EnvironmentPresets.ts';
import { AIController } from './flight/AIController.ts';
import { getAircraft, getNextAircraftId } from './flight/AircraftRegistry.ts';
import { PlaneController } from './flight/PlaneController.ts';
import { CombatVfxSystem } from './gameplay/CombatVfxSystem.ts';
import { DogfightManager } from './gameplay/DogfightManager.ts';
import { ScoreManager } from './gameplay/ScoreManager.ts';
import { SessionRecorder } from './gameplay/SessionRecorder.ts';
import { WeaponSystem } from './gameplay/WeaponSystem.ts';
import type { GameMode } from './types.ts';
import { AtmosphereVfxSystem } from './world/AtmosphereVfxSystem.ts';
import { CloudSystem } from './world/CloudSystem.ts';
import { getMap } from './world/MapRegistry.ts';
import { RingManager } from './world/RingManager.ts';
import { SkyObjectSystem } from './world/SkyObjectSystem.ts';
import { SkySystem } from './world/SkySystem.ts';
import { WeatherIdentitySystem } from './world/WeatherIdentitySystem.ts';
import { WorldLandmarkSystem } from './world/WorldLandmarkSystem.ts';
import { WorldManager } from './world/WorldManager.ts';

export class Game {
  private renderer: Renderer;
  private cameraManager: CameraManager;
  private inputManager: InputManager;
  private assetManager: AssetManager;
  private audioManager: AudioManager;
  private scene: THREE.Scene;
  private skySystem: SkySystem | null = null;
  private cloudSystem: CloudSystem | null = null;
  private skyObjectSystem: SkyObjectSystem | null = null;
  private atmosphereVfxSystem: AtmosphereVfxSystem | null = null;
  private worldLandmarkSystem: WorldLandmarkSystem | null = null;
  private weatherIdentitySystem: WeatherIdentitySystem | null = null;
  private combatVfxSystem: CombatVfxSystem | null = null;
  private audioPolishSystem: AudioPolishSystem | null = null;
  private ringManager: RingManager | null = null;
  private worldManager: WorldManager | null = null;
  private scoreManager: ScoreManager;
  private sessionRecorder: SessionRecorder;
  private planeController: PlaneController | null = null;
  private mode: GameMode = 'zen';
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private currentAircraftId = 'spitfire';
  private currentPresetId = 'nevada';
  private currentMapId = 'desert_expanse';
  private hudUpdateTimer = 0;
  private audioStarted = false;
  private readonly HUD_UPDATE_INTERVAL = 1 / 10;

  // Dogfight systems
  private aiController: AIController | null = null;
  private weaponSystem: WeaponSystem | null = null;
  private dogfightManager: DogfightManager | null = null;
  private aiMarker: THREE.Mesh | null = null;
  private firing = false;
  private fireCooldown = 0;

  // Session metrics
  private maxAltitude = 0;
  private minAltitude = Infinity;
  private totalDistance = 0;
  private lastPosition = new THREE.Vector3();
  private calmSum = 0;
  private arousalSum = 0;
  private bpmSum = 0;
  private neuroSamples = 0;
  private bpmSamples = 0;

  private onSessionEnd: (() => void) | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(this.canvas);
    this.scene = new THREE.Scene();
    this.cameraManager = new CameraManager();
    this.inputManager = new InputManager();
    this.assetManager = new AssetManager();
    this.audioManager = new AudioManager();
    this.scoreManager = new ScoreManager();
    this.sessionRecorder = new SessionRecorder();

    this.inputManager.onDevKey((key) => {
      if (key === 'BracketRight') this.switchAircraft();
      if (key === 'BracketLeft') this.switchEnvironment();
      if (key === 'Escape') this.togglePause();
      if (key === 'KeyR') this.restart();
    });

    const startAudio = () => {
      if (!this.audioStarted) {
        this.audioManager.start();
        this.audioPolishSystem?.start();
        this.audioStarted = true;
      }
    };
    window.addEventListener('keydown', startAudio, { once: true });
    window.addEventListener('click', startAudio, { once: true });

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);

    eventBus.on('ring:passed', () => {
      this.audioManager.playChime();
      this.sessionRecorder.recordEvent('ring_hit');
    });

    eventBus.on('dogfight:ai_hit', () => {
      this.audioManager.playHit();
      this.sessionRecorder.recordEvent('shot_hit');
    });

    eventBus.on('dogfight:player_hit', () => {
      this.audioManager.playHit();
    });

    eventBus.on('dogfight:ai_kill', () => {
      this.audioManager.playExplosion();
      this.sessionRecorder.recordEvent('kill');
    });

    eventBus.on('dogfight:player_death', () => {
      this.audioManager.playExplosion();
      this.sessionRecorder.recordEvent('death');
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0 && this.mode === 'dogfight' && e.target === this.canvas) {
      this.firing = true;
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.firing = false;
    }
  }

  setOnSessionEnd(cb: () => void): void {
    this.onSessionEnd = cb;
  }

  async init(mode: GameMode, mapId = 'desert_expanse'): Promise<void> {
    this.mode = mode;
    this.currentMapId = mapId;

    const map = getMap(mapId);
    const preset = getPreset(map.environmentPresetId);
    this.currentPresetId = map.environmentPresetId;

    this.skySystem = new SkySystem(this.scene);
    this.skySystem.setRenderer(this.renderer.renderer);
    this.skySystem.setConfig(preset.sky);
    this.cloudSystem = new CloudSystem(this.scene);
    this.skyObjectSystem = new SkyObjectSystem(this.scene);
    await this.skyObjectSystem.load(map.skyObjectLayers ?? []);
    this.atmosphereVfxSystem = new AtmosphereVfxSystem(this.scene, map.atmosphere);
    this.worldLandmarkSystem = new WorldLandmarkSystem(this.scene);
    await this.worldLandmarkSystem.load(map.worldLandmarkLayers ?? []);
    this.weatherIdentitySystem = new WeatherIdentitySystem(this.scene, map.weatherIdentity);
    this.audioPolishSystem = new AudioPolishSystem(map.audioPolish);
    if (this.audioStarted) this.audioPolishSystem.start();

    this.worldManager = new WorldManager(this.scene);
    this.worldManager.loadMap(map);

    if (mode === 'zen') {
      this.ringManager = new RingManager(this.scene);
    }

    if (mode === 'dogfight') {
      this.weaponSystem = new WeaponSystem(this.scene);
      this.combatVfxSystem = new CombatVfxSystem(this.scene, map.combatVfx);
      this.dogfightManager = new DogfightManager();

      const aiAircraft = getAircraft('spitfire');
      const aiSpawn = new THREE.Vector3(
        map.playerSpawn[0] + 400,
        Math.max(map.playerSpawn[1], 150) + 50,
        map.playerSpawn[2] - 500,
      );
      this.aiController = new AIController(aiAircraft, aiSpawn);
      await this.aiController.loadModel(this.assetManager, this.scene);

      const markerCanvas = document.createElement('canvas');
      markerCanvas.width = 64;
      markerCanvas.height = 64;
      const ctx = markerCanvas.getContext('2d')!;
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.moveTo(32, 4);
      ctx.lineTo(60, 32);
      ctx.lineTo(32, 60);
      ctx.lineTo(4, 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      const markerTexture = new THREE.CanvasTexture(markerCanvas);
      const markerMat = new THREE.SpriteMaterial({ map: markerTexture, depthTest: false, sizeAttenuation: false });
      this.aiMarker = new THREE.Sprite(markerMat) as unknown as THREE.Mesh;
      (this.aiMarker as unknown as THREE.Sprite).scale.set(0.14, 0.14, 1);
      this.aiMarker.renderOrder = 999;
      this.scene.add(this.aiMarker);
    }

    const aircraft = getAircraft(this.currentAircraftId);
    this.cameraManager.setConfig(aircraft.camera);
    this.planeController = new PlaneController(aircraft);
    await this.planeController.loadModel(this.assetManager, this.scene);

    this.planeController.flightModel.object.position.set(...map.playerSpawn);
    this.lastPosition.set(...map.playerSpawn);

    this.cameraManager.snapTo(this.planeController.getObject());

    if (this.ringManager) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeController.flightModel.getQuaternion());
      this.ringManager.spawnInitial(this.planeController.flightModel.getPosition(), forward);
    }

    this.renderer.initPostProcessing(this.scene, this.cameraManager.camera);

    useGameStore.getState().updateHud({ mode, aircraftId: this.currentAircraftId });
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now() / 1000;
    this.sessionRecorder.start();
    this.loop();
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now() / 1000;
    let dt = now - this.lastTime;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.016;

    this.update(dt);
    this.render();
  };

  private update(dt: number): void {
    if (!this.planeController) return;

    this.inputManager.update(dt);
    const input = this.inputManager.getInput();
    this.planeController.flightModel.update(dt, input);
    const speed = this.planeController.flightModel.getSpeed();
    const maxSpd = getAircraft(this.currentAircraftId)?.tuning?.maxSpeed ?? 200;
    this.planeController.update(dt, speed, maxSpd);

    const plane = this.planeController.getObject();
    this.cameraManager.update(dt, plane, speed);

    this.skySystem?.followCamera(this.cameraManager.camera.position);
    this.cloudSystem?.update(this.cameraManager.camera.position);
    this.skyObjectSystem?.update(dt, this.cameraManager.camera.position);
    this.atmosphereVfxSystem?.update(dt, this.cameraManager.camera.position);
    this.worldLandmarkSystem?.update(dt, this.cameraManager.camera.position);
    this.weatherIdentitySystem?.update(dt, this.cameraManager.camera.position);
    this.combatVfxSystem?.update(dt);

    // Track session metrics
    const pos = this.planeController.flightModel.getPosition();
    const alt = this.planeController.flightModel.getAltitude();
    if (alt > this.maxAltitude) this.maxAltitude = alt;
    if (alt < this.minAltitude) this.minAltitude = alt;
    this.totalDistance += pos.distanceTo(this.lastPosition);
    this.lastPosition.copy(pos);

    if (this.ringManager) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeController.flightModel.getQuaternion());
      const hits = this.ringManager.update(this.planeController.flightModel.getPosition(), forward);
      for (let i = 0; i < hits; i++) {
        this.scoreManager.addRing(this.planeController.flightModel.getSpeed());
      }
    }

    // Dogfight update
    if (this.mode === 'dogfight' && this.aiController && this.weaponSystem && this.dogfightManager) {
      if (!this.dogfightManager.isAiDead()) {
        // AI uses direct movement — no FlightModel.update needed
        this.aiController.update(dt, this.planeController.flightModel.getPosition());

        if (this.aiController.consumeFire()) {
          const aiPos = this.aiController.getPosition().clone();
          const aiDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.aiController.getQuaternion());
          this.weaponSystem.fire(aiPos, aiDir, 'ai');
          this.combatVfxSystem?.spawnShot(aiPos, aiDir, 'ai');
          this.audioPolishSystem?.playWeapon();
        }
      }

      // Update AI marker position
      if (this.aiMarker) {
        if (this.dogfightManager.isAiDead()) {
          this.aiMarker.visible = false;
        } else {
          this.aiMarker.visible = true;
          const aiPos = this.aiController.getPosition();
          this.aiMarker.position.set(aiPos.x, aiPos.y + 20, aiPos.z);
          this.aiMarker.rotation.y += dt * 3;
          this.aiMarker.rotation.x += dt * 1.5;
        }
      }

      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      const wantsFire = this.firing || this.inputManager.wantsFire();
      if (wantsFire && this.fireCooldown <= 0) {
        this.firePlayerWeapon();
        this.fireCooldown = 0.15;
      }

      // Provide AI target positions for bullet magnetism
      if (!this.dogfightManager.isAiDead()) {
        this.weaponSystem.setAiTargets([this.aiController.getPosition()]);
      } else {
        this.weaponSystem.setAiTargets([]);
      }

      this.weaponSystem.update(dt);

      const targets: Array<{ position: THREE.Vector3; owner: 'player' | 'ai' }> = [
        { position: this.planeController.flightModel.getPosition(), owner: 'player' },
      ];
      if (!this.dogfightManager.isAiDead()) {
        targets.push({ position: this.aiController.getPosition(), owner: 'ai' });
      }

      const hits = this.weaponSystem.checkHits(targets);
      for (const hit of hits) {
        const target = targets[hit.targetIndex];
        const before = this.dogfightManager.getState();
        const wasAiDead = this.dogfightManager.isAiDead();
        this.combatVfxSystem?.spawnHit(hit.position);
        this.audioPolishSystem?.playImpact();
        this.dogfightManager.applyDamage(target.owner);
        const aiJustDied = target.owner === 'ai' && !wasAiDead && this.dogfightManager.isAiDead();
        const playerJustDied = target.owner === 'player' && before.playerHealth <= 10;
        if (aiJustDied || playerJustDied) {
          this.combatVfxSystem?.spawnExplosion(target.position);
          this.audioPolishSystem?.playExplosion();
        }
      }

      const shouldRespawn = this.dogfightManager.update(dt);
      if (shouldRespawn) {
        const playerPos = this.planeController.flightModel.getPosition();
        const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(
          this.planeController.flightModel.object.quaternion,
        );
        const respawnPos = new THREE.Vector3(
          playerPos.x + playerFwd.x * 500 + (Math.random() - 0.5) * 200,
          Math.max(playerPos.y, 150) + 40 + Math.random() * 60,
          playerPos.z + playerFwd.z * 500 + (Math.random() - 0.5) * 200,
        );
        this.aiController.respawn(respawnPos);
        this.aiController.setHealth(100);
      } else if (!this.dogfightManager.isAiDead()) {
        this.aiController.setHealth(this.dogfightManager.getAiHealthFraction() * 100);
      }

      if (this.dogfightManager.isAiDead()) {
        this.aiController.getObject().visible = false;
      } else {
        this.aiController.getObject().visible = true;
      }
    }

    this.scoreManager.update(dt);

    this.audioManager.updateEngine(speed, 200);
    this.audioManager.updateWind(speed, 200);
    this.audioPolishSystem?.update(speed, 200);

    // BPM sync
    this.hudUpdateTimer += dt;
    if (this.hudUpdateTimer >= this.HUD_UPDATE_INTERVAL) {
      this.hudUpdateTimer = 0;

      const neuroState = useNeuroStore.getState();
      this.audioManager.setBpm(neuroState.bpm);

      // Sample neuro metrics
      if (neuroState.source !== 'none') {
        this.calmSum += neuroState.calm;
        this.arousalSum += neuroState.arousal;
        this.neuroSamples++;
        if (neuroState.bpm !== null) {
          this.bpmSum += neuroState.bpm;
          this.bpmSamples++;
        }
      }

      const dfSnapState = this.dogfightManager?.getState();
      this.sessionRecorder.sample(this.HUD_UPDATE_INTERVAL, {
        speed: Math.round(speed),
        altitude: Math.round(this.planeController.flightModel.getAltitude()),
        throttle: input.throttle,
        heading: Math.round(this.planeController.flightModel.getHeading()),
        calm: neuroState.calm,
        arousal: neuroState.arousal,
        bpm: neuroState.bpm,
        hrv: neuroState.hrvRmssd,
        alpha: neuroState.alphaPower ?? 0,
        beta: neuroState.betaPower ?? 0,
        theta: neuroState.thetaPower ?? 0,
        delta: neuroState.deltaPower ?? 0,
        gamma: neuroState.gammaPower ?? 0,
        calmnessState: neuroState.calmnessState,
        respirationRate: neuroState.respirationRate,
        alphaPeakFreq: neuroState.alphaPeakFreq,
        score: this.scoreManager.getScore(),
        combo: this.scoreManager.getCombo(),
        ringsPassed: this.scoreManager.getRingsPassed(),
        playerHealth: dfSnapState?.playerHealth ?? 100,
        aiHealth: dfSnapState?.aiHealth ?? 100,
        kills: dfSnapState?.kills ?? 0,
        deaths: dfSnapState?.deaths ?? 0,
      });

      let nextRingDir: { x: number; y: number } | null = null;
      if (this.ringManager) {
        const ringPos = this.ringManager.getNextRingPosition();
        if (ringPos) {
          const dir = ringPos.clone().sub(this.planeController.flightModel.getPosition());
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraManager.camera.quaternion);
          const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.cameraManager.camera.quaternion);
          const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraManager.camera.quaternion);
          const dot = dir.dot(camFwd);
          if (dot > 0) {
            nextRingDir = { x: dir.dot(camRight), y: dir.dot(camUp) };
            const mag = Math.sqrt(nextRingDir.x * nextRingDir.x + nextRingDir.y * nextRingDir.y);
            if (mag > 0.01) {
              nextRingDir.x /= mag;
              nextRingDir.y /= mag;
            }
          } else {
            nextRingDir = { x: dir.dot(camRight) > 0 ? 1 : -1, y: 0 };
          }
        }
      }

      let enemyDir: { x: number; y: number } | null = null;
      if (this.aiController && !this.dogfightManager?.isAiDead()) {
        const dir = this.aiController.getPosition().clone().sub(this.planeController.flightModel.getPosition());
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraManager.camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.cameraManager.camera.quaternion);
        const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraManager.camera.quaternion);
        const dot = dir.dot(camFwd);
        if (dot > 0) {
          enemyDir = { x: dir.dot(camRight), y: dir.dot(camUp) };
          const mag = Math.sqrt(enemyDir.x * enemyDir.x + enemyDir.y * enemyDir.y);
          if (mag > 0.01) {
            enemyDir.x /= mag;
            enemyDir.y /= mag;
          }
        } else {
          enemyDir = { x: dir.dot(camRight) > 0 ? 1 : -1, y: 0 };
        }
      }

      const dfState = this.dogfightManager?.getState();

      const aiDebug = this.aiController?.getDebugInfo();

      useGameStore.getState().updateHud({
        speed: Math.round(speed),
        altitude: Math.round(this.planeController.flightModel.getAltitude()),
        heading: Math.round(this.planeController.flightModel.getHeading()),
        throttle: input.throttle,
        score: this.scoreManager.getScore(),
        ringsHit: this.scoreManager.getRingsPassed(),
        elapsedMs: this.scoreManager.getElapsedMs(),
        nextRingDir,
        enemyDir,
        playerHealth: dfState?.playerHealth ?? 100,
        aiHealth: dfState?.aiHealth ?? 100,
        kills: dfState?.kills ?? 0,
        deaths: dfState?.deaths ?? 0,
        aiState: aiDebug?.state ?? 'none',
        aiDistance: Math.round(aiDebug?.distance ?? 0),
        aiDotForward: aiDebug?.dotForward ?? 0,
        shotsFired: dfState?.shotsFired ?? 0,
        shotsHit: dfState?.shotsHit ?? 0,
      });
    }
  }

  private firePlayerWeapon(): void {
    if (!this.planeController || !this.weaponSystem || !this.dogfightManager) return;
    const origin = this.planeController.flightModel.getPosition().clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeController.flightModel.object.quaternion);
    this.weaponSystem.fire(origin, dir, 'player');
    this.combatVfxSystem?.spawnShot(origin, dir, 'player');
    this.dogfightManager.recordPlayerShot();
    this.audioManager.playGunshot();
    this.audioPolishSystem?.playWeapon();
    this.sessionRecorder.recordEvent('shot_fired');
  }

  private render(): void {
    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  private async switchAircraft(): Promise<void> {
    if (!this.planeController) return;

    this.planeController.removeFromScene(this.scene);
    this.currentAircraftId = getNextAircraftId(this.currentAircraftId);

    const aircraft = getAircraft(this.currentAircraftId);
    const oldPos = this.planeController.flightModel.getPosition().clone();
    const oldQuat = this.planeController.flightModel.getQuaternion().clone();

    this.planeController = new PlaneController(aircraft);
    this.planeController.flightModel.object.position.copy(oldPos);
    this.planeController.flightModel.object.quaternion.copy(oldQuat);
    await this.planeController.loadModel(this.assetManager, this.scene);

    this.cameraManager.setConfig(aircraft.camera);
    this.cameraManager.snapTo(this.planeController.getObject());
    useGameStore.getState().updateHud({ aircraftId: this.currentAircraftId });
  }

  private switchEnvironment(): void {
    this.currentPresetId = getNextPresetId(this.currentPresetId);
    const preset = getPreset(this.currentPresetId);
    this.skySystem?.setConfig(preset.sky);
  }

  private restart(): void {
    this.scoreManager.reset();
    this.ringManager?.clear();
    this.dogfightManager?.reset();

    const map = getMap(this.currentMapId);

    if (this.planeController) {
      this.planeController.flightModel.object.position.set(...map.playerSpawn);
      this.planeController.flightModel.object.quaternion.identity();
      this.cameraManager.snapTo(this.planeController.getObject());

      if (this.ringManager) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeController.flightModel.getQuaternion());
        this.ringManager.spawnInitial(this.planeController.flightModel.getPosition(), forward);
      }
    }

    this.maxAltitude = 0;
    this.minAltitude = Infinity;
    this.totalDistance = 0;
    this.calmSum = 0;
    this.arousalSum = 0;
    this.bpmSum = 0;
    this.neuroSamples = 0;
    this.bpmSamples = 0;
    this.sessionRecorder.reset();
  }

  private togglePause(): void {
    // placeholder for pause
  }

  endSession(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);

    const neuroState = useNeuroStore.getState();
    const dfState = this.dogfightManager?.getState();
    const recorded = this.sessionRecorder.stop();
    const s = recorded.samples;

    let peakBpm: number | null = null;
    let minBpm: number | null = null;
    let hrvSum = 0;
    let hrvCount = 0;
    let alphaSum = 0;
    let betaSum = 0;
    let thetaSum = 0;
    let eegCount = 0;

    for (const sample of s) {
      if (sample.bpm !== null) {
        if (peakBpm === null || sample.bpm > peakBpm) peakBpm = sample.bpm;
        if (minBpm === null || sample.bpm < minBpm) minBpm = sample.bpm;
      }
      if (sample.hrv !== null) {
        hrvSum += sample.hrv;
        hrvCount++;
      }
      if (sample.alpha > 0 || sample.beta > 0 || sample.theta > 0) {
        alphaSum += sample.alpha;
        betaSum += sample.beta;
        thetaSum += sample.theta;
        eegCount++;
      }
    }

    const bands = [
      { name: 'Alpha — Relaxed Focus', val: alphaSum },
      { name: 'Beta — Active Thinking', val: betaSum },
      { name: 'Theta — Deep Relaxation', val: thetaSum },
    ];
    bands.sort((a, b) => b.val - a.val);
    const dominantBrainState = eegCount > 0 && bands[0].val > 0 ? bands[0].name : null;

    let calmTrend: 'improved' | 'declined' | 'stable' | null = null;
    let arousalTrend: 'increased' | 'decreased' | 'stable' | null = null;
    if (s.length >= 6) {
      const w = Math.min(5, Math.floor(s.length / 2)) || 1;
      const firstCalm = s.slice(0, w).reduce((a, v) => a + v.calm, 0) / w;
      const lastCalm = s.slice(-w).reduce((a, v) => a + v.calm, 0) / w;
      calmTrend = lastCalm - firstCalm > 0.03 ? 'improved' : lastCalm - firstCalm < -0.03 ? 'declined' : 'stable';

      const firstArousal = s.slice(0, w).reduce((a, v) => a + v.arousal, 0) / w;
      const lastArousal = s.slice(-w).reduce((a, v) => a + v.arousal, 0) / w;
      arousalTrend =
        lastArousal - firstArousal > 0.03 ? 'increased' : lastArousal - firstArousal < -0.03 ? 'decreased' : 'stable';
    }

    const summary: SessionSummary = {
      mode: this.mode,
      mapId: this.currentMapId,
      aircraftId: this.currentAircraftId,
      durationMs: this.scoreManager.getElapsedMs(),
      ringsPassed: this.scoreManager.getRingsPassed(),
      score: this.scoreManager.getScore(),
      bestCombo: this.scoreManager.getBestCombo(),
      averageSpeed: this.scoreManager.getAverageSpeed(),
      maxAltitude: this.maxAltitude,
      minAltitude: this.minAltitude === Infinity ? 0 : this.minAltitude,
      totalDistance: Math.round(this.totalDistance),
      neuroSource: neuroState.source,
      kills: dfState?.kills ?? 0,
      deaths: dfState?.deaths ?? 0,
      shotsFired: dfState?.shotsFired ?? 0,
      shotsHit: dfState?.shotsHit ?? 0,

      samples: s,
      events: recorded.events,

      avgCalm: this.neuroSamples > 0 ? this.calmSum / this.neuroSamples : null,
      avgArousal: this.neuroSamples > 0 ? this.arousalSum / this.neuroSamples : null,
      avgBpm: this.bpmSamples > 0 ? this.bpmSum / this.bpmSamples : null,
      peakBpm,
      minBpm,
      avgHrv: hrvCount > 0 ? hrvSum / hrvCount : null,
      avgAlpha: eegCount > 0 ? alphaSum / eegCount : null,
      avgBeta: eegCount > 0 ? betaSum / eegCount : null,
      avgTheta: eegCount > 0 ? thetaSum / eegCount : null,
      dominantBrainState,
      calmTrend,
      arousalTrend,
    };

    useGameStore.getState().setLastSession(summary);
    this.onSessionEnd?.();
  }

  getInputManager(): InputManager {
    return this.inputManager;
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.inputManager.destroy();
    this.renderer.destroy();
    this.cameraManager.destroy();
    this.audioManager.destroy();
    this.skySystem?.destroy();
    this.cloudSystem?.destroy();
    this.skyObjectSystem?.destroy();
    this.atmosphereVfxSystem?.destroy();
    this.worldLandmarkSystem?.destroy();
    this.weatherIdentitySystem?.destroy();
    this.combatVfxSystem?.destroy();
    this.audioPolishSystem?.destroy();
    this.ringManager?.destroy();
    this.worldManager?.destroy();
    this.weaponSystem?.destroy();
    this.aiController?.removeFromScene(this.scene);
    if (this.aiMarker) {
      this.scene.remove(this.aiMarker);
      const mat = this.aiMarker.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.assetManager.dispose();
    eventBus.clear();
  }
}
