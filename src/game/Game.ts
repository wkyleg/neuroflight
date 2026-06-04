import * as THREE from 'three';
import { useNeuroStore } from '@/neuro/store.ts';
import type { FlightHudNotice, FlightHudNoticeTone, SessionSummary } from '@/stores/gameStore.ts';
import { useGameStore } from '@/stores/gameStore.ts';
import { AssetManager } from './core/AssetManager.ts';
import { AudioManager } from './core/AudioManager.ts';
import { AudioPolishSystem } from './core/AudioPolishSystem.ts';
import { CameraManager } from './core/CameraManager.ts';
import { eventBus } from './core/EventBus.ts';
import { InputManager } from './core/InputManager.ts';
import { ProceduralFlightMusicSystem } from './core/ProceduralFlightMusicSystem.ts';
import { Renderer } from './core/Renderer.ts';
import { getPreset } from './dev/EnvironmentPresets.ts';
import { AIController } from './flight/AIController.ts';
import { DEFAULT_AIRCRAFT_ID, getAircraft } from './flight/AircraftRegistry.ts';
import { AircraftTrailSystem } from './flight/AircraftTrailSystem.ts';
import { PlaneController } from './flight/PlaneController.ts';
import { CombatVfxSystem } from './gameplay/CombatVfxSystem.ts';
import { DogfightManager } from './gameplay/DogfightManager.ts';
import { FlightSafetySystem } from './gameplay/FlightSafetySystem.ts';
import { MissionObjectiveSystem } from './gameplay/MissionObjectiveSystem.ts';
import { NeuroAdaptationSystem } from './gameplay/NeuroAdaptationSystem.ts';
import { ScoreManager } from './gameplay/ScoreManager.ts';
import { SessionRecorder } from './gameplay/SessionRecorder.ts';
import { type WeaponDifficultySettings, WeaponSystem, type WeaponTarget } from './gameplay/WeaponSystem.ts';
import { getModeMeta } from './modes.ts';
import type { GameDifficulty, GameMode, MapDefinition, MissionWaypointConfig } from './types.ts';
import { AtmosphereVfxSystem } from './world/AtmosphereVfxSystem.ts';
import { CloudSystem } from './world/CloudSystem.ts';
import { LivingWorldDirector } from './world/LivingWorldDirector.ts';
import { getMap } from './world/MapRegistry.ts';
import { RingManager } from './world/RingManager.ts';
import { SeaTrafficSystem } from './world/SeaTrafficSystem.ts';
import { SkyObjectSystem } from './world/SkyObjectSystem.ts';
import { SkySystem } from './world/SkySystem.ts';
import { WeatherIdentitySystem } from './world/WeatherIdentitySystem.ts';
import { WorldLandmarkSystem } from './world/WorldLandmarkSystem.ts';
import { WorldManager } from './world/WorldManager.ts';

const ZEN_ROUTE_COMPLETE_BONUS = 650;
const EXPEDITION_ROUTE_COMPLETE_BONUS = 850;

const DIFFICULTY_CONFIG: Record<
  GameDifficulty,
  {
    scoreMultiplier: number;
    ai: {
      speedMultiplier: number;
      turnRateMultiplier: number;
      fireCooldownMultiplier: number;
      attackRangeMultiplier: number;
    };
    dogfight: {
      playerDamageMultiplier: number;
      rivalDamageMultiplier: number;
      respawnDelayMultiplier: number;
      spawnDistanceRange: [number, number];
      spawnAltitudeOffsetRange: [number, number];
      attackWarmupSeconds: number;
    };
    weapon: WeaponDifficultySettings;
  }
> = {
  rookie: {
    scoreMultiplier: 0.9,
    ai: { speedMultiplier: 0.76, turnRateMultiplier: 0.72, fireCooldownMultiplier: 1.75, attackRangeMultiplier: 0.76 },
    dogfight: {
      playerDamageMultiplier: 1.18,
      rivalDamageMultiplier: 0.58,
      respawnDelayMultiplier: 1.2,
      spawnDistanceRange: [1120, 1480],
      spawnAltitudeOffsetRange: [120, 260],
      attackWarmupSeconds: 3.2,
    },
    weapon: {
      playerProjectileSpeed: 420,
      rivalProjectileSpeed: 210,
      playerHitRadius: 66,
      rivalHitRadius: 14,
      magnetismRange: 125,
      magnetismStrength: 3.1,
      playerFireCooldown: 0.13,
    },
  },
  pilot: {
    scoreMultiplier: 1,
    ai: { speedMultiplier: 1, turnRateMultiplier: 1, fireCooldownMultiplier: 1, attackRangeMultiplier: 1 },
    dogfight: {
      playerDamageMultiplier: 1,
      rivalDamageMultiplier: 1,
      respawnDelayMultiplier: 1,
      spawnDistanceRange: [980, 1320],
      spawnAltitudeOffsetRange: [90, 220],
      attackWarmupSeconds: 2.2,
    },
    weapon: {
      playerProjectileSpeed: 400,
      rivalProjectileSpeed: 250,
      playerHitRadius: 50,
      rivalHitRadius: 18,
      magnetismRange: 80,
      magnetismStrength: 2.5,
      playerFireCooldown: 0.15,
    },
  },
  ace: {
    scoreMultiplier: 1.18,
    ai: { speedMultiplier: 1.18, turnRateMultiplier: 1.22, fireCooldownMultiplier: 0.72, attackRangeMultiplier: 1.16 },
    dogfight: {
      playerDamageMultiplier: 0.9,
      rivalDamageMultiplier: 1.3,
      respawnDelayMultiplier: 0.86,
      spawnDistanceRange: [900, 1240],
      spawnAltitudeOffsetRange: [70, 190],
      attackWarmupSeconds: 1.35,
    },
    weapon: {
      playerProjectileSpeed: 380,
      rivalProjectileSpeed: 285,
      playerHitRadius: 38,
      rivalHitRadius: 23,
      magnetismRange: 58,
      magnetismStrength: 1.75,
      playerFireCooldown: 0.18,
    },
  },
};

function getDifficultyConfig(difficulty: GameDifficulty) {
  return DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.rookie;
}

export function shouldStartCanvasFire(
  event: Pick<MouseEvent, 'button' | 'target'>,
  canvas: HTMLCanvasElement,
  mode: GameMode,
): boolean {
  return mode === 'dogfight' && event.button === 0 && event.target === canvas;
}

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
  private seaTrafficSystem: SeaTrafficSystem | null = null;
  private weatherIdentitySystem: WeatherIdentitySystem | null = null;
  private livingWorldDirector: LivingWorldDirector | null = null;
  private combatVfxSystem: CombatVfxSystem | null = null;
  private audioPolishSystem: AudioPolishSystem | null = null;
  private proceduralMusicSystem: ProceduralFlightMusicSystem;
  private ringManager: RingManager | null = null;
  private missionObjectiveSystem: MissionObjectiveSystem | null = null;
  private worldManager: WorldManager | null = null;
  private scoreManager: ScoreManager;
  private sessionRecorder: SessionRecorder;
  private neuroAdaptationSystem: NeuroAdaptationSystem;
  private flightSafetySystem: FlightSafetySystem;
  private planeController: PlaneController | null = null;
  private aircraftTrailSystem: AircraftTrailSystem | null = null;
  private mode: GameMode = 'zen';
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private currentAircraftId = DEFAULT_AIRCRAFT_ID;
  private difficulty: GameDifficulty = 'rookie';
  private currentMapId = 'desert_expanse';
  private hudUpdateTimer = 0;
  private audioStarted = false;
  private readonly HUD_UPDATE_INTERVAL = 1 / 10;
  private zenRouteComplete = false;
  private expeditionRouteComplete = false;

  // Dogfight systems
  private aiController: AIController | null = null;
  private weaponSystem: WeaponSystem | null = null;
  private dogfightManager: DogfightManager | null = null;
  private aiMarker: THREE.Mesh | null = null;
  private firing = false;
  private fireCooldown = 0;
  private dogfightSpawnCursor = 0;
  private bonusNotice: (FlightHudNotice & { expiresAt: number }) | null = null;
  private bonusNoticeId = 0;

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
  private composureSum = 0;
  private loadSum = 0;
  private flowSum = 0;
  private adaptationSamples = 0;
  private lastRecoveryEventAt = -999;

  private onSessionEnd: (() => void) | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';
    this.renderer = new Renderer(this.canvas);
    this.scene = new THREE.Scene();
    this.cameraManager = new CameraManager();
    this.inputManager = new InputManager();
    this.assetManager = new AssetManager();
    this.audioManager = new AudioManager();
    this.proceduralMusicSystem = new ProceduralFlightMusicSystem(this.mode);
    this.audioManager.setEnabled(this.proceduralMusicSystem.isSoundEnabled());
    this.scoreManager = new ScoreManager();
    this.sessionRecorder = new SessionRecorder();
    this.neuroAdaptationSystem = new NeuroAdaptationSystem();
    this.flightSafetySystem = new FlightSafetySystem();

    this.inputManager.onDevKey((key) => {
      if (key === 'Escape') this.togglePause();
      if (key === 'KeyR') this.restart();
    });

    const startAudio = () => {
      if (!this.audioStarted) {
        this.audioManager.start();
        this.audioPolishSystem?.start();
        void this.proceduralMusicSystem.start();
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
      this.proceduralMusicSystem.triggerEvent('ring');
      this.sessionRecorder.recordEvent('ring_hit');
    });

    eventBus.on('dogfight:ai_hit', () => {
      this.audioManager.playHit();
      this.proceduralMusicSystem.triggerEvent('hit');
      this.emitHudNotice('RIVAL HIT', 'hit', 1200);
      this.scoreManager.addBonus(65 * getDifficultyConfig(this.difficulty).scoreMultiplier);
      this.sessionRecorder.recordEvent('shot_hit');
    });

    eventBus.on('dogfight:player_hit', () => {
      this.audioManager.playHit();
      this.proceduralMusicSystem.triggerEvent('hit');
    });

    eventBus.on('dogfight:ai_kill', () => {
      this.audioManager.playChime();
      this.proceduralMusicSystem.triggerEvent('win');
      const points = Math.round(550 * getDifficultyConfig(this.difficulty).scoreMultiplier);
      this.scoreManager.addBonus(points);
      this.emitHudNotice('RIVAL DOWN +1 WIN', 'win', 1800);
      this.sessionRecorder.recordEvent('kill', { label: 'Rival down', score: points });
    });

    eventBus.on('dogfight:player_death', () => {
      this.audioManager.playHit();
      this.proceduralMusicSystem.triggerEvent('crash');
      this.emitHudNotice('RESET AND RALLY', 'reset', 1800);
      this.sessionRecorder.recordEvent('death', { label: 'Reset and rally' });
    });
  }

  private emitHudNotice(text: string, tone: FlightHudNoticeTone, durationMs: number): void {
    this.bonusNoticeId++;
    this.bonusNotice = {
      id: this.bonusNoticeId,
      text,
      tone,
      durationMs,
      expiresAt: performance.now() / 1000 + durationMs / 1000,
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (shouldStartCanvasFire(e, this.canvas, this.mode)) {
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

  toggleMusic(): boolean {
    return this.toggleSound();
  }

  isMusicEnabled(): boolean {
    return this.isSoundEnabled();
  }

  toggleSound(): boolean {
    const enabled = this.proceduralMusicSystem.toggleSound();
    this.audioManager.setEnabled(enabled);
    this.audioPolishSystem?.setMasterEnabled(enabled);
    return enabled;
  }

  isSoundEnabled(): boolean {
    return this.proceduralMusicSystem.isSoundEnabled();
  }

  async init(
    mode: GameMode,
    mapId = 'desert_expanse',
    aircraftId = DEFAULT_AIRCRAFT_ID,
    difficulty: GameDifficulty = 'rookie',
  ): Promise<void> {
    this.mode = mode;
    this.currentMapId = mapId;
    this.currentAircraftId = getAircraft(aircraftId).id;
    this.difficulty = difficulty;
    this.proceduralMusicSystem.setMode(mode);
    this.dogfightSpawnCursor = 0;
    this.zenRouteComplete = false;
    this.expeditionRouteComplete = false;
    this.bonusNotice = null;

    const map = getMap(mapId);
    const preset = getPreset(map.environmentPresetId);

    this.skySystem = new SkySystem(this.scene);
    this.skySystem.setRenderer(this.renderer.renderer);
    this.skySystem.setConfig(preset.sky);
    this.cloudSystem = new CloudSystem(this.scene, map.cloudProfile);
    this.skyObjectSystem = new SkyObjectSystem(this.scene);
    await this.skyObjectSystem.load(map.skyObjectLayers ?? []);
    this.atmosphereVfxSystem = new AtmosphereVfxSystem(this.scene, map.atmosphere);
    this.worldLandmarkSystem = new WorldLandmarkSystem(this.scene);
    await this.worldLandmarkSystem.load(map.worldLandmarkLayers ?? []);
    this.seaTrafficSystem = new SeaTrafficSystem(this.scene, map.seaTraffic);
    this.weatherIdentitySystem = new WeatherIdentitySystem(this.scene, map.weatherIdentity);
    this.livingWorldDirector = new LivingWorldDirector(this.scene, map.livingWorld, mode, map.id);
    await this.livingWorldDirector.load();
    this.audioPolishSystem = new AudioPolishSystem(map.audioPolish);
    this.audioPolishSystem.setMasterEnabled(this.isSoundEnabled());
    if (this.audioStarted) this.audioPolishSystem.start();
    if (this.audioStarted) void this.proceduralMusicSystem.start();

    this.worldManager = new WorldManager(this.scene);
    this.worldManager.loadMap(map);

    if (mode === 'zen') {
      this.ringManager = new RingManager(this.scene);
    }

    if (mode === 'free') {
      this.missionObjectiveSystem = new MissionObjectiveSystem(this.scene, map.missionRoutes?.expedition ?? []);
    }

    if (mode === 'dogfight') {
      this.weaponSystem = new WeaponSystem(this.scene);
      this.weaponSystem.setDifficulty(getDifficultyConfig(this.difficulty).weapon);
      this.combatVfxSystem = new CombatVfxSystem(this.scene, map.combatVfx);
      this.dogfightManager = new DogfightManager(getDifficultyConfig(this.difficulty).dogfight);

      const aiAircraft = getAircraft('spitfire');
      const aiSpawn = this.getDogfightSpawnPosition(map, new THREE.Vector3(...map.playerSpawn));
      this.aiController = new AIController(aiAircraft, aiSpawn);
      this.aiController.setDifficulty(getDifficultyConfig(this.difficulty).ai);
      this.aiController.setAttackWarmup(getDifficultyConfig(this.difficulty).dogfight.attackWarmupSeconds);
      await this.aiController.loadModel(this.assetManager, this.scene);

      const markerCanvas = document.createElement('canvas');
      markerCanvas.width = 64;
      markerCanvas.height = 64;
      const ctx = markerCanvas.getContext('2d');
      if (ctx) {
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
    }

    const aircraft = getAircraft(this.currentAircraftId);
    this.cameraManager.setConfig(aircraft.camera);
    this.planeController = new PlaneController(aircraft);
    await this.planeController.loadModel(this.assetManager, this.scene);
    this.aircraftTrailSystem = new AircraftTrailSystem(this.scene, aircraft.trailProfile);

    this.planeController.flightModel.object.position.set(...map.playerSpawn);
    this.lastPosition.set(...map.playerSpawn);
    this.flightSafetySystem.reset(map);

    this.cameraManager.snapTo(this.planeController.getObject());

    if (this.ringManager) {
      const route = map.missionRoutes?.zen ?? [];
      if (route.length > 0) {
        this.ringManager.spawnRoute(route.map((point) => new THREE.Vector3(...point.position)));
      } else {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeController.flightModel.getQuaternion());
        this.ringManager.spawnInitial(this.planeController.flightModel.getPosition(), forward);
      }
    }

    this.renderer.initPostProcessing(this.scene, this.cameraManager.camera);
    this.applyVisualGrade(mapId);

    const modeMeta = getModeMeta(mode);
    const initialInput = this.inputManager.getInput();
    const initialDogfightGoal = map.missionRoutes?.dogfight.length ? 3 : 0;
    useGameStore.getState().updateHud({
      mode,
      aircraftId: this.currentAircraftId,
      speed: Math.round(this.planeController.flightModel.getSpeed()),
      altitude: Math.round(this.planeController.flightModel.getAltitude()),
      heading: Math.round(this.planeController.flightModel.getHeading()),
      throttle: initialInput.throttle,
      missionTitle: modeMeta.title,
      missionSubtitle: map.storyName ?? map.name,
      scoreLabel: modeMeta.scoreLabel,
      objectiveLabel: modeMeta.objectiveLabel,
      objectiveText: this.getInitialObjectiveText(mode, map.missionRoutes?.expedition),
      objectiveSubtext: this.getInitialObjectiveSubtext(mode, map),
      objectiveProgress: 0,
      objectiveGoal:
        mode === 'zen'
          ? (map.missionRoutes?.zen.length ?? 0)
          : mode === 'free'
            ? (map.missionRoutes?.expedition.length ?? 0)
            : initialDogfightGoal,
    });
    this.activateControls();
  }

  private getInitialObjectiveText(mode: GameMode, expeditionRoute?: MissionWaypointConfig[]): string {
    if (mode === 'free') return expeditionRoute?.[0]?.label ?? 'Find the first expedition beacon';
    if (mode === 'dogfight') return 'Find the rival plane';
    return 'Aim through the first bright gate';
  }

  private getInitialObjectiveSubtext(mode: GameMode, map: MapDefinition): string {
    if (mode === 'free') return 'Visit one story landmark at a time; fly through the beacon beside it.';
    if (mode === 'zen') return 'Follow the glowing rings. The route arrow points to the next gate.';
    return map.storyTagline ?? map.description;
  }

  private getDogfightSpawnPosition(map: MapDefinition, playerPos: THREE.Vector3): THREE.Vector3 {
    const dogfight = getDifficultyConfig(this.difficulty).dogfight;
    const [minDistance, maxDistance] = dogfight.spawnDistanceRange;
    const [minAltitudeOffset, maxAltitudeOffset] = dogfight.spawnAltitudeOffsetRange;
    const anchorCandidates = map.missionRoutes?.dogfight ?? [];

    if (anchorCandidates.length > 0) {
      const orderedAnchors = [...anchorCandidates].sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 0; i < orderedAnchors.length; i++) {
        const waypoint = orderedAnchors[(this.dogfightSpawnCursor + i) % orderedAnchors.length];
        const candidate = new THREE.Vector3(...waypoint.position);
        const horizontalDistance = Math.hypot(candidate.x - playerPos.x, candidate.z - playerPos.z);
        if (horizontalDistance >= minDistance * 0.75) {
          this.dogfightSpawnCursor++;
          candidate.y = Math.max(
            candidate.y,
            playerPos.y + THREE.MathUtils.lerp(minAltitudeOffset, maxAltitudeOffset, Math.random()),
          );
          return candidate;
        }
      }
    }

    const distance = THREE.MathUtils.lerp(minDistance, maxDistance, Math.random());
    const playerForward = this.planeController
      ? new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeController.flightModel.object.quaternion)
      : new THREE.Vector3(0, 0, -1);
    playerForward.y = 0;
    if (playerForward.lengthSq() < 0.01) playerForward.set(0, 0, -1);
    playerForward.normalize();

    const side = Math.random() < 0.5 ? -1 : 1;
    const offsetAngle = side * THREE.MathUtils.degToRad(38 + Math.random() * 42);
    const spawnDir = playerForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), offsetAngle).normalize();
    const altitudeOffset = THREE.MathUtils.lerp(minAltitudeOffset, maxAltitudeOffset, Math.random());

    return new THREE.Vector3(
      playerPos.x + spawnDir.x * distance,
      Math.max(map.playerSpawn[1] + 120, playerPos.y + altitudeOffset),
      playerPos.z + spawnDir.z * distance,
    );
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
    const map = getMap(this.currentMapId);
    this.planeController.flightModel.update(dt, input);
    const speed = this.planeController.flightModel.getSpeed();
    const maxSpd = getAircraft(this.currentAircraftId)?.tuning?.maxSpeed ?? 200;
    this.planeController.update(dt, speed, maxSpd);
    this.aircraftTrailSystem?.update(
      dt,
      this.planeController.getObject(),
      speed,
      maxSpd,
      input.throttle,
      input.boost,
      Math.max(Math.abs(input.roll), Math.abs(input.yaw)),
    );

    const obstacleVolumes = [
      ...(this.worldLandmarkSystem?.getCollisionVolumes() ?? []),
      ...(this.worldManager?.getCollisionVolumes() ?? []),
    ];
    const activeMissionWaypoint = this.missionObjectiveSystem?.getActiveWaypoint();
    const missionSafeZones = activeMissionWaypoint
      ? [
          {
            center: new THREE.Vector3(...activeMissionWaypoint.position),
            radius: activeMissionWaypoint.radius ?? 90,
            label: activeMissionWaypoint.label,
          },
        ]
      : [];
    const safetyEvent = this.flightSafetySystem.update(
      dt,
      this.planeController.flightModel,
      map,
      obstacleVolumes,
      missionSafeZones,
    );
    if (safetyEvent) {
      this.flightSafetySystem.applyRespawn(this.planeController.flightModel, safetyEvent);
      this.inputManager.clearInput();
      this.scoreManager.addBonus(safetyEvent.scorePenalty);
      this.scoreManager.breakCombo();
      this.sessionRecorder.recordEvent(safetyEvent.type, {
        label: safetyEvent.label,
        score: safetyEvent.scorePenalty,
      });
      this.audioManager.playExplosion();
      this.audioPolishSystem?.playImpact();
      this.proceduralMusicSystem.triggerEvent('crash');
      this.cameraManager.snapTo(this.planeController.getObject());
      this.lastPosition.copy(this.planeController.flightModel.getPosition());
    }

    const neuroState = useNeuroStore.getState();
    const objectiveGoal =
      this.mode === 'free' ? (this.missionObjectiveSystem?.getTotalCount() ?? 0) : this.ringManager ? 6 : 0;
    const objectiveProgress =
      this.mode === 'free'
        ? (this.missionObjectiveSystem?.getCompletedCount() ?? 0) / Math.max(1, objectiveGoal)
        : Math.min(1, this.scoreManager.getRingsPassed() / Math.max(1, objectiveGoal || 6));
    this.neuroAdaptationSystem.update(dt, neuroState, this.mode, speed / maxSpd, objectiveProgress);
    const adaptation = this.neuroAdaptationSystem.getSnapshot();
    this.ringManager?.setAdaptiveGlow(1 + adaptation.composure * adaptation.confidence * 0.55);
    this.weatherIdentitySystem?.setAdaptiveClarity(adaptation.weatherClarity);
    this.audioPolishSystem?.setIntensity(adaptation.audioIntensity);
    this.proceduralMusicSystem.setAdaptation(adaptation);
    this.proceduralMusicSystem.setRppg({
      bpm: neuroState.bpm,
      confidence: Math.max(neuroState.bpmQuality, neuroState.signalQuality),
      hrv: neuroState.hrvRmssd,
      respiration: neuroState.respirationRate,
      timestamp: performance.now() / 1000,
    });
    this.weaponSystem?.setAimAssist(adaptation.aimAssist);

    const plane = this.planeController.getObject();
    this.cameraManager.update(dt, plane, speed);

    this.skySystem?.followCamera(this.cameraManager.camera.position);
    this.cloudSystem?.update(dt, this.cameraManager.camera.position);
    this.skyObjectSystem?.update(dt, this.cameraManager.camera.position);
    this.atmosphereVfxSystem?.update(dt, this.cameraManager.camera.position);
    this.worldLandmarkSystem?.update(dt, this.cameraManager.camera.position);
    this.seaTrafficSystem?.update(dt, this.cameraManager.camera.position);
    this.weatherIdentitySystem?.update(dt, this.cameraManager.camera.position);
    this.livingWorldDirector?.update(dt, this.cameraManager.camera.position);
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
        this.scoreManager.addRing(
          this.planeController.flightModel.getSpeed(),
          adaptation.scoreMultiplier * getDifficultyConfig(this.difficulty).scoreMultiplier,
        );
      }
      this.maybeCompleteZenRoute(map, adaptation.scoreMultiplier);
    }

    const objectiveState = this.missionObjectiveSystem?.update(dt, this.planeController.flightModel.getPosition());
    if (objectiveState?.completion) {
      const completion = objectiveState.completion;
      this.scoreManager.addObjective(
        completion.score,
        adaptation.scoreMultiplier * getDifficultyConfig(this.difficulty).scoreMultiplier,
      );
      this.audioManager.playChime();
      this.audioPolishSystem?.playUi();
      this.sessionRecorder.recordEvent(completion.waypoint.kind === 'postcard' ? 'postcard' : 'objective_complete', {
        label: completion.waypoint.label,
        score: completion.score,
      });
      if (completion.waypoint.kind === 'landmark' || completion.waypoint.kind === 'low_pass') {
        this.sessionRecorder.recordEvent('landmark_discovered', { label: completion.waypoint.label });
      }
      this.maybeCompleteExpeditionRoute(adaptation.scoreMultiplier);
    }

    if (adaptation.recovery > 0.76 && this.scoreManager.getElapsedMs() / 1000 - this.lastRecoveryEventAt > 12) {
      this.lastRecoveryEventAt = this.scoreManager.getElapsedMs() / 1000;
      this.sessionRecorder.recordEvent('neuro_recovery', { label: adaptation.prompt });
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
          this.proceduralMusicSystem.triggerEvent('fire');
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
        this.fireCooldown = this.weaponSystem.getPlayerFireCooldown();
      }

      // Provide AI target positions for bullet magnetism
      if (!this.dogfightManager.isAiDead()) {
        this.weaponSystem.setAiTargets([this.aiController.getPosition()]);
      } else {
        this.weaponSystem.setAiTargets([]);
      }

      this.weaponSystem.update(dt);

      const targets: WeaponTarget[] = [{ position: this.planeController.flightModel.getPosition(), owner: 'player' }];
      if (!this.dogfightManager.isAiDead()) {
        targets.push({ position: this.aiController.getPosition(), owner: 'ai' });
      }
      for (const target of this.livingWorldDirector?.getBonusTargets() ?? []) {
        targets.push({
          position: target.position,
          owner: 'neutral',
          id: target.id,
          kind: 'bonus',
          radius: target.radius,
        });
      }

      const hits = this.weaponSystem.checkHits(targets);
      for (const hit of hits) {
        const target = targets[hit.targetIndex];
        if (target.kind === 'bonus' && hit.owner === 'player' && hit.targetId) {
          const bonus = this.livingWorldDirector?.consumeBonusTarget(hit.targetId);
          if (!bonus) continue;
          this.combatVfxSystem?.spawnHit(hit.position);
          this.combatVfxSystem?.spawnExplosion(bonus.position);
          this.audioManager.playChime();
          this.proceduralMusicSystem.triggerEvent('ufoBonus');
          const points = Math.round(bonus.points * getDifficultyConfig(this.difficulty).scoreMultiplier);
          this.scoreManager.addBonus(points);
          this.emitHudNotice(`UFO BONUS +${points}`, 'bonus', 2200);
          this.sessionRecorder.recordEvent('ufo_bonus', { label: bonus.label, score: points });
          continue;
        }
        const before = this.dogfightManager.getState();
        const wasAiDead = this.dogfightManager.isAiDead();
        this.combatVfxSystem?.spawnHit(hit.position);
        this.audioPolishSystem?.playImpact();
        if (target.owner !== 'neutral') this.dogfightManager.applyDamage(target.owner);
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
        const respawnPos = this.getDogfightSpawnPosition(map, playerPos);
        this.aiController.respawn(respawnPos);
        this.aiController.setAttackWarmup(getDifficultyConfig(this.difficulty).dogfight.attackWarmupSeconds);
        this.aiController.setHealth(100);
        this.sessionRecorder.recordEvent('respawn', { label: 'Rival rejoined the route' });
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

    const activeAircraft = getAircraft(this.currentAircraftId);
    const maxAircraftSpeed = activeAircraft.tuning.maxSpeed;
    this.audioManager.updateEngine(speed, maxAircraftSpeed, activeAircraft.audioProfile);
    this.audioManager.updateWind(speed, maxAircraftSpeed);
    this.audioPolishSystem?.update(speed, maxAircraftSpeed);

    // BPM sync
    this.hudUpdateTimer += dt;
    if (this.hudUpdateTimer >= this.HUD_UPDATE_INTERVAL) {
      this.hudUpdateTimer = 0;

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
      this.composureSum += adaptation.composure;
      this.loadSum += adaptation.load;
      this.flowSum += adaptation.flow;
      this.adaptationSamples++;

      const dfSnapState = this.dogfightManager?.getState();
      const completedObjectives = this.missionObjectiveSystem?.getCompletedCount() ?? 0;
      const totalObjectives = this.missionObjectiveSystem?.getTotalCount() ?? 0;
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
        objectivesCompleted: completedObjectives,
        objectiveProgress:
          this.mode === 'free'
            ? completedObjectives / Math.max(1, totalObjectives)
            : this.scoreManager.getRingsPassed() / Math.max(1, map.missionRoutes?.zen.length ?? 6),
        composure: adaptation.composure,
        neuroLoad: adaptation.load,
        recovery: adaptation.recovery,
        flow: adaptation.flow,
        adaptationConfidence: adaptation.confidence,
        signalCoverage: adaptation.coverage,
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

      const missionNav = this.missionObjectiveSystem?.getNavigationSnapshot(
        this.planeController.flightModel.getPosition(),
      );
      let nextObjectiveDir: { x: number; y: number } | null = null;
      const displayObjective = missionNav?.display ?? null;
      if (displayObjective) {
        const dir = new THREE.Vector3(...displayObjective.position).sub(this.planeController.flightModel.getPosition());
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraManager.camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.cameraManager.camera.quaternion);
        const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraManager.camera.quaternion);
        const dot = dir.dot(camFwd);
        if (dot > 0) {
          nextObjectiveDir = { x: dir.dot(camRight), y: dir.dot(camUp) };
          const mag = Math.sqrt(nextObjectiveDir.x * nextObjectiveDir.x + nextObjectiveDir.y * nextObjectiveDir.y);
          if (mag > 0.01) {
            nextObjectiveDir.x /= mag;
            nextObjectiveDir.y /= mag;
          }
        } else {
          nextObjectiveDir = { x: dir.dot(camRight) > 0 ? 1 : -1, y: 0 };
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
      const currentMap = map;
      const modeMeta = getModeMeta(this.mode);
      const hudActiveObjective = missionNav?.display ?? this.missionObjectiveSystem?.getActiveWaypoint();
      const expeditionGoal = missionNav?.totalCount ?? this.missionObjectiveSystem?.getTotalCount() ?? 0;
      const expeditionProgress = missionNav?.completedCount ?? this.missionObjectiveSystem?.getCompletedCount() ?? 0;
      const zenGoal = currentMap.missionRoutes?.zen.length ?? 0;
      const objectiveText =
        this.mode === 'free'
          ? (missionNav?.completionToast ?? hudActiveObjective?.label ?? 'Route complete')
          : this.mode === 'zen'
            ? 'Aim through the next bright gate'
            : (currentMap.missionRoutes?.dogfight[0]?.label ?? 'Hold the patrol lane');
      const objectiveSubtext =
        this.mode === 'free'
          ? missionNav?.completionToast
            ? 'Logged - next route cue coming up.'
            : hudActiveObjective
              ? `${Math.min(expeditionProgress + 1, expeditionGoal)}/${expeditionGoal} - ${hudActiveObjective.description}`
              : 'All expedition beacons are logged.'
          : this.mode === 'zen'
            ? `Gate ${Math.min(this.scoreManager.getRingsPassed() + 1, zenGoal || 1)}/${Math.max(zenGoal, 1)} - use the route arrow when the ring is offscreen.`
            : 'Stay composed, keep visual contact, and use the landmarks.';

      useGameStore.getState().updateHud({
        speed: Math.round(speed),
        altitude: Math.round(this.planeController.flightModel.getAltitude()),
        heading: Math.round(this.planeController.flightModel.getHeading()),
        throttle: input.throttle,
        score: this.scoreManager.getScore(),
        ringsHit: this.scoreManager.getRingsPassed(),
        elapsedMs: this.scoreManager.getElapsedMs(),
        nextRingDir,
        nextObjectiveDir,
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
        bonusNotice:
          this.bonusNotice && performance.now() / 1000 < this.bonusNotice.expiresAt
            ? {
                id: this.bonusNotice.id,
                text: this.bonusNotice.text,
                tone: this.bonusNotice.tone,
                durationMs: this.bonusNotice.durationMs,
              }
            : null,
        missionTitle: modeMeta.title,
        missionSubtitle: currentMap.storyName ?? currentMap.name,
        objectiveLabel: modeMeta.objectiveLabel,
        objectiveText,
        objectiveSubtext,
        objectiveProgress:
          this.mode === 'free'
            ? expeditionProgress
            : this.mode === 'zen'
              ? this.scoreManager.getRingsPassed()
              : (dfState?.kills ?? 0),
        objectiveGoal: this.mode === 'free' ? expeditionGoal : this.mode === 'zen' ? zenGoal : 3,
        scoreLabel: modeMeta.scoreLabel,
        composure: adaptation.composure,
        neuroLoad: adaptation.load,
        recovery: adaptation.recovery,
        flow: adaptation.flow,
        adaptationConfidence: adaptation.confidence,
        signalCoverage: adaptation.coverage,
        neuroPrompt: adaptation.prompt,
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
    this.audioManager.playFireLaunch(getAircraft(this.currentAircraftId).audioProfile);
    this.audioPolishSystem?.playWeapon();
    this.proceduralMusicSystem.triggerEvent('fire');
    this.sessionRecorder.recordEvent('shot_fired');
  }

  private awardRouteCompletion(label: string, basePoints: number, adaptationMultiplier: number): void {
    const points = Math.round(basePoints * adaptationMultiplier * getDifficultyConfig(this.difficulty).scoreMultiplier);
    this.scoreManager.addBonus(points);
    this.audioPolishSystem?.playUi();
    this.proceduralMusicSystem.triggerEvent('routeComplete');
    this.sessionRecorder.recordEvent('route_complete', { label, score: points });
  }

  private maybeCompleteZenRoute(map: MapDefinition, adaptationMultiplier: number): void {
    if (this.mode !== 'zen' || this.zenRouteComplete) return;
    const goal = map.missionRoutes?.zen.length ?? 0;
    if (goal <= 0 || this.scoreManager.getRingsPassed() < goal) return;
    this.zenRouteComplete = true;
    this.awardRouteCompletion('Glowing route complete', ZEN_ROUTE_COMPLETE_BONUS, adaptationMultiplier);
  }

  private maybeCompleteExpeditionRoute(adaptationMultiplier: number): void {
    if (this.mode !== 'free' || this.expeditionRouteComplete || !this.missionObjectiveSystem) return;
    const goal = this.missionObjectiveSystem.getTotalCount();
    if (goal <= 0 || this.missionObjectiveSystem.getCompletedCount() < goal) return;
    this.expeditionRouteComplete = true;
    this.awardRouteCompletion('Expedition route complete', EXPEDITION_ROUTE_COMPLETE_BONUS, adaptationMultiplier);
  }

  private applyVisualGrade(mapId: string): void {
    if (mapId === 'ocean_islands') {
      this.renderer.setVisualGrade({
        saturation: 1.68,
        contrast: 1.18,
        warmth: 0.04,
        vignette: 0.18,
        exposure: 1.04,
        bloomStrength: 0.38,
        hueShift: 0.052,
        hueDrift: 0.024,
        grain: 0.026,
      });
      return;
    }

    this.renderer.setVisualGrade({
      saturation: 1.72,
      contrast: 1.18,
      warmth: 0.12,
      vignette: 0.22,
      exposure: 1.02,
      bloomStrength: 0.4,
      hueShift: -0.04,
      hueDrift: 0.03,
      grain: 0.028,
    });
  }

  private render(): void {
    this.renderer.setVisualGradeTime(performance.now() / 1000);
    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  private restart(): void {
    this.scoreManager.reset();
    this.ringManager?.clear();
    this.dogfightManager?.reset();
    this.zenRouteComplete = false;
    this.expeditionRouteComplete = false;

    const map = getMap(this.currentMapId);

    if (this.planeController) {
      this.planeController.flightModel.object.position.set(...map.playerSpawn);
      this.planeController.flightModel.object.quaternion.identity();
      this.flightSafetySystem.reset(map);
      this.cameraManager.snapTo(this.planeController.getObject());

      if (this.ringManager) {
        const route = map.missionRoutes?.zen ?? [];
        if (route.length > 0) {
          this.ringManager.spawnRoute(route.map((point) => new THREE.Vector3(...point.position)));
        } else {
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeController.flightModel.getQuaternion());
          this.ringManager.spawnInitial(this.planeController.flightModel.getPosition(), forward);
        }
      }
    }
    this.missionObjectiveSystem?.reset();

    this.maxAltitude = 0;
    this.minAltitude = Infinity;
    this.totalDistance = 0;
    this.calmSum = 0;
    this.arousalSum = 0;
    this.bpmSum = 0;
    this.neuroSamples = 0;
    this.bpmSamples = 0;
    this.composureSum = 0;
    this.loadSum = 0;
    this.flowSum = 0;
    this.adaptationSamples = 0;
    this.lastRecoveryEventAt = -999;
    this.bonusNotice = null;
    this.neuroAdaptationSystem.reset();
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
    const currentMap = getMap(this.currentMapId);
    const modeMeta = getModeMeta(this.mode);

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
      difficulty: this.difficulty,
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
      objectivesCompleted:
        this.mode === 'dogfight'
          ? (dfState?.kills ?? 0)
          : (this.missionObjectiveSystem?.getCompletedCount() ?? this.scoreManager.getRingsPassed()),
      objectiveGoal:
        this.mode === 'free'
          ? (this.missionObjectiveSystem?.getTotalCount() ?? 0)
          : this.mode === 'zen'
            ? (currentMap.missionRoutes?.zen.length ?? 0)
            : 3,
      scoreLabel: modeMeta.scoreLabel,
      missionTitle: `${modeMeta.title} over ${currentMap.storyName ?? currentMap.name}`,

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
      avgComposure: this.adaptationSamples > 0 ? this.composureSum / this.adaptationSamples : null,
      avgLoad: this.adaptationSamples > 0 ? this.loadSum / this.adaptationSamples : null,
      avgFlow: this.adaptationSamples > 0 ? this.flowSum / this.adaptationSamples : null,
      signalCoveragePct: this.neuroAdaptationSystem.getSnapshot().coverage * 100,
    };

    useGameStore.getState().setLastSession(summary);
    this.onSessionEnd?.();
  }

  getInputManager(): InputManager {
    return this.inputManager;
  }

  activateControls(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== this.canvas) {
      active.blur();
    }
    this.canvas.focus({ preventScroll: true });
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
    this.proceduralMusicSystem.destroy();
    this.skySystem?.destroy();
    this.cloudSystem?.destroy();
    this.skyObjectSystem?.destroy();
    this.atmosphereVfxSystem?.destroy();
    this.worldLandmarkSystem?.destroy();
    this.seaTrafficSystem?.destroy();
    this.weatherIdentitySystem?.destroy();
    this.livingWorldDirector?.destroy();
    this.combatVfxSystem?.destroy();
    this.audioPolishSystem?.destroy();
    this.ringManager?.destroy();
    this.missionObjectiveSystem?.destroy();
    this.worldManager?.destroy();
    this.weaponSystem?.destroy();
    this.aircraftTrailSystem?.destroy();
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
