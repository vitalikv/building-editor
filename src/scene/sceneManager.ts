import * as THREE from 'three';
import Stats from 'stats.js';

import { cameraManager, effectsManager, createModel } from '../index';

import { RendererOptions, GridOptions } from './types';

export class SceneManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  //public controls: OrbitControls;
  private container: HTMLElement;
  private lights: THREE.Light[] = [];
  private grid?: THREE.GridHelper;
  private stats: Stats;

  public init({ container }) {
    this.container = container;

    this.initScene();
    this.initRenderer();
    this.initDefaultLights();
    this.addGrid({ size: 100, divisions: 25, colorCenterLine: 0x222222, colorGrid: 0xcccccc });

    this.initStats();

    this.initModel();
  }

  private async initModel() {
    createModel.init(this.scene);
    await createModel.initModel();

    this.render();

    console.log(this.renderer.info.memory);

    const center = createModel.getCenterModel();
    cameraManager.updateTargetOnModel({ center });

    const container = document.querySelector('[nameId="info"]') as HTMLElement;
    container.style.display = 'none';
  }

  private initScene(backgroundColor: number = 0xffffff): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);
  }

  private initRenderer(options: RendererOptions = {}): void {
    const { antialias = true, pixelRatio = window.devicePixelRatio } = options;
    this.renderer = new THREE.WebGLRenderer({ antialias });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(pixelRatio);
    this.container.appendChild(this.renderer.domElement);
  }

  private initDefaultLights(): void {
    // Основной направленный свет
    const directionalLight1 = new THREE.DirectionalLight(0xffeeff, 2.5);
    directionalLight1.position.set(1, 1, 1);
    this.scene.add(directionalLight1);
    this.lights.push(directionalLight1);

    // Дополнительный направленный свет
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight2.position.set(-1, 0.5, -1);
    this.scene.add(directionalLight2);
    this.lights.push(directionalLight2);

    // Окружающий свет
    const ambientLight = new THREE.AmbientLight(0xffffee, 0.75);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);
  }

  private addGrid(options: GridOptions = {}): THREE.GridHelper {
    const { size = 100, divisions = 100, colorCenterLine = 0x444444, colorGrid = 0x888888, visible = true } = options;

    this.grid = new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid);
    this.grid.visible = visible;
    this.scene.add(this.grid);

    return this.grid;
  }

  private initStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    this.stats.dom.style.display = 'none';
    this.container.appendChild(this.stats.dom);
  }

  public render(): void {
    this.stats.begin();
    if (effectsManager.enabled) {
      effectsManager.render();
    } else {
      this.renderer.render(this.scene, cameraManager.getActiveCamera());
    }

    this.stats.end();
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
}
