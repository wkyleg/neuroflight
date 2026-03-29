import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export interface SkyConfig {
  topColor: THREE.Color;
  bottomColor: THREE.Color;
  sunColor: THREE.Color;
  sunDirection: THREE.Vector3;
  sunIntensity: number;
  ambientIntensity: number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  useAtmosphericSky?: boolean;
  turbidity?: number;
  rayleigh?: number;
}

export class SkySystem {
  private sun: THREE.DirectionalLight;
  private ambient: THREE.HemisphereLight;
  private skyMesh: THREE.Mesh | null = null;
  private sky: Sky | null = null;
  private config: SkyConfig;

  constructor(private scene: THREE.Scene) {
    const defaultConfig: SkyConfig = {
      topColor: new THREE.Color(0x2266bb),
      bottomColor: new THREE.Color(0x88bbee),
      sunColor: new THREE.Color(0xffffff),
      sunDirection: new THREE.Vector3(0.4, 0.6, -0.3).normalize(),
      sunIntensity: 1.5,
      ambientIntensity: 0.7,
      fogColor: new THREE.Color(0x99bbdd),
      fogNear: 5000,
      fogFar: 15000,
      useAtmosphericSky: true,
    };
    this.config = defaultConfig;

    this.sun = new THREE.DirectionalLight(defaultConfig.sunColor, defaultConfig.sunIntensity);
    this.sun.position.copy(defaultConfig.sunDirection).multiplyScalar(500);
    scene.add(this.sun);

    this.ambient = new THREE.HemisphereLight(0x8ec5f0, 0x5a6b3a, defaultConfig.ambientIntensity);
    scene.add(this.ambient);
  }

  setRenderer(_renderer: THREE.WebGLRenderer): void {
    // Renderer reference kept for API compatibility; PMREM removed.
  }

  setConfig(config: SkyConfig): void {
    this.config = config;
    this.sun.color.copy(config.sunColor);
    this.sun.intensity = config.sunIntensity;
    this.sun.position.copy(config.sunDirection).multiplyScalar(500);
    this.ambient.color.copy(config.topColor);
    this.ambient.groundColor.copy(config.bottomColor);
    this.ambient.intensity = config.ambientIntensity;

    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      (this.skyMesh.material as THREE.Material).dispose();
      this.skyMesh.geometry.dispose();
      this.skyMesh = null;
    }
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky = null;
    }

    this.scene.environment = null;
    this.scene.background = config.fogColor;

    if (config.useAtmosphericSky !== false) {
      this.createAtmosphericSky(config);
    } else {
      this.createGradientSky(config);
    }
  }

  private createAtmosphericSky(config: SkyConfig): void {
    this.sky = new Sky();
    this.sky.scale.setScalar(50000);

    const uniforms = this.sky.material.uniforms;
    uniforms.turbidity.value = config.turbidity ?? 2.0;
    uniforms.rayleigh.value = config.rayleigh ?? 1.0;
    uniforms.mieCoefficient.value = 0.005;
    uniforms.mieDirectionalG.value = 0.8;
    uniforms.sunPosition.value.copy(config.sunDirection).multiplyScalar(1000);

    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);
  }

  private createGradientSky(config: SkyConfig): void {
    const skyGeo = new THREE.SphereGeometry(8000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: config.topColor.clone() },
        bottomColor: { value: config.bottomColor.clone() },
        offset: { value: 20.0 },
        exponent: { value: 0.4 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
    this.scene.background = config.fogColor;

    this.scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);
  }

  followCamera(cameraPos: THREE.Vector3): void {
    if (this.skyMesh) this.skyMesh.position.copy(cameraPos);
    if (this.sky) this.sky.position.copy(cameraPos);
  }

  destroy(): void {
    this.scene.remove(this.sun);
    this.scene.remove(this.ambient);
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      (this.skyMesh.material as THREE.Material).dispose();
      this.skyMesh.geometry.dispose();
    }
    if (this.sky) {
      this.scene.remove(this.sky);
    }
  }
}
