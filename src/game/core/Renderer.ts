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
  hueShift: number;
  hueDrift: number;
  grain: number;
}

const DEFAULT_GRADE: VisualGradeConfig = {
  saturation: 1.14,
  contrast: 1.06,
  warmth: 0.025,
  vignette: 0.18,
  exposure: 1.02,
  bloomStrength: 0.12,
  hueShift: 0,
  hueDrift: 0.012,
  grain: 0.012,
};

const VisualGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: DEFAULT_GRADE.saturation },
    contrast: { value: DEFAULT_GRADE.contrast },
    warmth: { value: DEFAULT_GRADE.warmth },
    vignette: { value: DEFAULT_GRADE.vignette },
    hueShift: { value: DEFAULT_GRADE.hueShift },
    hueDrift: { value: DEFAULT_GRADE.hueDrift },
    grain: { value: DEFAULT_GRADE.grain },
    time: { value: 0 },
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
    uniform float hueShift;
    uniform float hueDrift;
    uniform float grain;
    uniform float time;
    varying vec2 vUv;

    vec3 hueRotate(vec3 color, float angle) {
      float s = sin(angle);
      float c = cos(angle);
      mat3 weights = mat3(
        vec3(0.299, 0.587, 0.114),
        vec3(0.299, 0.587, 0.114),
        vec3(0.299, 0.587, 0.114)
      );
      mat3 hue = mat3(
        vec3(0.701, -0.587, -0.114),
        vec3(-0.299, 0.413, -0.114),
        vec3(-0.300, -0.588, 0.886)
      );
      mat3 cross = mat3(
        vec3(0.168, 0.330, -0.497),
        vec3(-0.328, 0.035, 0.292),
        vec3(1.250, -1.050, -0.203)
      );
      return color * (weights + hue * c + cross * s);
    }

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luma), color, saturation);
      color = (color - 0.5) * contrast + 0.5;
      float drift = sin(time * 0.11 + vUv.y * 2.4) * hueDrift;
      color = hueRotate(color, hueShift + drift);
      color += vec3(warmth, warmth * 0.45, -warmth * 0.25);
      color += (noise(vUv * 960.0 + vec2(time * 19.0, time * 7.0)) - 0.5) * grain;

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
  private outputPass: OutputPass | null = null;
  private contextLost = false;

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
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  initPostProcessing(scene: THREE.Scene, camera: THREE.Camera): void {
    this.disposeComposer();
    this.contextLost = false;
    this.resetForSession();

    try {
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

      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);
      this.resize();
      this.setVisualGrade(DEFAULT_GRADE);
    } catch (err) {
      console.warn('Post-processing failed to initialize; using direct renderer.', err);
      this.disposeComposer();
      this.resetForSession();
    }
  }

  resetForSession(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = DEFAULT_GRADE.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (this.gradePass) {
      this.gradePass.uniforms.saturation.value = DEFAULT_GRADE.saturation;
      this.gradePass.uniforms.contrast.value = DEFAULT_GRADE.contrast;
      this.gradePass.uniforms.warmth.value = DEFAULT_GRADE.warmth;
      this.gradePass.uniforms.vignette.value = DEFAULT_GRADE.vignette;
      this.gradePass.uniforms.hueShift.value = DEFAULT_GRADE.hueShift;
      this.gradePass.uniforms.hueDrift.value = DEFAULT_GRADE.hueDrift;
      this.gradePass.uniforms.grain.value = DEFAULT_GRADE.grain;
      this.gradePass.uniforms.time.value = 0;
    }
    if (this.bloomPass) {
      this.bloomPass.strength = DEFAULT_GRADE.bloomStrength;
    }
    this.resize();
  }

  disablePostProcessing(): void {
    this.disposeComposer();
    this.resetForSession();
  }

  setVisualGrade(config: Partial<VisualGradeConfig>): void {
    const grade = { ...DEFAULT_GRADE, ...config };
    this.renderer.toneMappingExposure = grade.exposure;
    if (this.gradePass) {
      this.gradePass.uniforms.saturation.value = grade.saturation;
      this.gradePass.uniforms.contrast.value = grade.contrast;
      this.gradePass.uniforms.warmth.value = grade.warmth;
      this.gradePass.uniforms.vignette.value = grade.vignette;
      this.gradePass.uniforms.hueShift.value = grade.hueShift;
      this.gradePass.uniforms.hueDrift.value = grade.hueDrift;
      this.gradePass.uniforms.grain.value = grade.grain;
    }
    if (this.bloomPass) {
      this.bloomPass.strength = grade.bloomStrength;
    }
  }

  setVisualGradeTime(timeSeconds: number): void {
    if (this.gradePass) {
      this.gradePass.uniforms.time.value = timeSeconds;
    }
  }

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  };

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.contextLost) return;
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

  private disposeComposer(): void {
    this.composer?.dispose();
    this.composer = null;
    this.renderPass = null;
    this.gradePass = null;
    this.bloomPass = null;
    this.outputPass = null;
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    console.warn('WebGL context lost; rendering paused until the browser restores it.');
    this.disposeComposer();
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
    console.warn('WebGL context restored; direct rendering will resume.');
    this.resetForSession();
  };

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.disposeComposer();
    this.renderer.dispose();
  }
}
