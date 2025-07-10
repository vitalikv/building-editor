import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

export class EffectsManager {
  public composer: EffectComposer;
  public outlinePass: OutlinePass;
  public renderPass: RenderPass;
  public fxaaPass: ShaderPass;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer,
    private config: {
      antialias?: boolean;
      outline?: {
        edgeStrength?: number;
        edgeGlow?: number;
        edgeThickness?: number;
        pulsePeriod?: number;
        visibleEdgeColor?: number;
        hiddenEdgeColor?: number;
      };
    } = {}
  ) {
    this.initComposer();
    this.initOutlineEffect();
    if (this.config.antialias) {
      this.initFXAA();
    }
  }

  private initComposer(): void {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
  }

  private initOutlineEffect(): void {
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

    this.outlinePass = new OutlinePass(resolution, this.scene, this.camera);

    // Настройки по умолчанию или из конфига
    this.outlinePass.edgeStrength = this.config.outline?.edgeStrength ?? 3.0;
    this.outlinePass.edgeGlow = this.config.outline?.edgeGlow ?? 0.5;
    this.outlinePass.edgeThickness = this.config.outline?.edgeThickness ?? 1.0;
    this.outlinePass.pulsePeriod = this.config.outline?.pulsePeriod ?? 1.5;

    this.outlinePass.visibleEdgeColor.setHex(this.config.outline?.visibleEdgeColor ?? 0x00ff00);
    this.outlinePass.hiddenEdgeColor.setHex(this.config.outline?.hiddenEdgeColor ?? 0x000000);

    this.composer.addPass(this.outlinePass);
  }

  private initFXAA(): void {
    this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
    this.composer.addPass(this.fxaaPass);
  }

  public addOutlineObject(object: THREE.Object3D): void {
    if (!this.outlinePass.selectedObjects.includes(object)) {
      this.outlinePass.selectedObjects.push(object);
    }
  }

  public removeOutlineObject(object: THREE.Object3D): void {
    const index = this.outlinePass.selectedObjects.indexOf(object);
    if (index !== -1) {
      this.outlinePass.selectedObjects.splice(index, 1);
    }
  }

  public clearOutlineObjects(): void {
    this.outlinePass.selectedObjects = [];
  }

  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);

    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
    }
  }

  public render(): void {
    this.composer.render();
  }

  public dispose(): void {
    this.composer.dispose();
    this.renderPass.dispose();
    this.outlinePass.dispose();
    if (this.fxaaPass) {
      this.fxaaPass.dispose();
    }
  }
}
