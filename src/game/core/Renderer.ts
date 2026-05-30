import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export interface VisualGradeConfig {
  saturation: number;
  contrast: number;
  warmth: number;
  vignette: number;
  exposure: number;
  bloomStrength: number;
}

const DEFAULT_GRADE: VisualGradeConfig = {
  saturation: 1.14,
  contrast: 1.06,
  warmth: 0.025,
  vignette: 0.18,
  exposure: 1.02,
  bloomStrength: 0.12,
};

const VisualGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: DEFAULT_GRADE.saturation },
    contrast: { value: DEFAULT_GRADE.contrast },
    warmth: { value: DEFAULT_GRADE.warmth },
    vignette: { value: DEFAULT_GRADE.vignette },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float warmth;
    uniform float vignette;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luma), color, saturation);
      color = (color - 0.5) * contrast + 0.5;
      color += vec3(warmth, warmth * 0.45, -warmth * 0.25);

      float dist = distance(vUv, vec2(0.5));
      float edge = 1.0 - smoothstep(0.28, 0.82, dist);
      float vignetteMix = mix(1.0, 0.74 + 0.26 * edge, vignette);
      color *= vignetteMix;

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
    }
  `,
};

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private gradePass: ShaderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  initPostProcessing(scene: THREE.Scene, camera: THREE.Camera): void {
    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.gradePass = new ShaderPass(VisualGradeShader);
    this.composer.addPass(this.gradePass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      DEFAULT_GRADE.bloomStrength,
      0.5,
      0.88,
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
    this.setVisualGrade(DEFAULT_GRADE);
  }

  setVisualGrade(config: Partial<VisualGradeConfig>): void {
    const grade = { ...DEFAULT_GRADE, ...config };
    this.renderer.toneMappingExposure = grade.exposure;
    if (this.gradePass) {
      this.gradePass.uniforms.saturation.value = grade.saturation;
      this.gradePass.uniforms.contrast.value = grade.contrast;
      this.gradePass.uniforms.warmth.value = grade.warmth;
      this.gradePass.uniforms.vignette.value = grade.vignette;
    }
    if (this.bloomPass) {
      this.bloomPass.strength = grade.bloomStrength;
    }
  }

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  };

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.composer) {
      if (this.renderPass) {
        this.renderPass.scene = scene;
        this.renderPass.camera = camera;
      }
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  getSize(): { width: number; height: number } {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    return { width: size.x, height: size.y };
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
