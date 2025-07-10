import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { EffectsManager } from './effectsManager';
import { ClickManager, ClickEvent } from './clickManager';
import { CreateModel } from '../modelData/createModel';

import { SceneOptions, CameraOptions, RendererOptions, GridOptions } from './types';

export class SceneManager {
  private scene: THREE.Scene;
  private perspectiveCamera: THREE.PerspectiveCamera;
  private orthographicCamera: THREE.OrthographicCamera;
  private activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private effectsManager: EffectsManager;
  private controls: OrbitControls;
  private container: HTMLElement;
  private lights: THREE.Light[] = [];
  private grid?: THREE.GridHelper;
  private stats: Stats;

  constructor(containerId: string, options: SceneOptions = {}) {
    this.validateContainer(containerId);
    this.container = document.getElementById(containerId) as HTMLElement;

    this.initScene(options.backgroundColor);
    this.initCameras(options.cameraOptions);
    this.initRenderer(options.rendererOptions);
    this.initControls();
    this.initDefaultLights();
    this.addGrid({ size: 100, divisions: 25, colorCenterLine: 0x222222, colorGrid: 0xcccccc });

    this.initStats();

    this.setCamera({ type: '3D' });
    this.setupEventListeners();
    this.initModel();
  }

  private async initModel() {
    const createModel = new CreateModel(this.scene);
    await createModel.initModel();

    this.render();
  }

  private validateContainer(containerId: string): void {
    if (!document.getElementById(containerId)) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }
  }

  private initScene(backgroundColor: number = 0x8cc7de): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);
  }

  private initCameras(options: CameraOptions = {}): void {
    const { fov = 45, aspect = this.container.clientWidth / this.container.clientHeight, near = 0.1, far = 1000, position = { x: 0, y: 15, z: -30 } } = options;

    // Инициализация перспективной камеры
    this.perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.perspectiveCamera.position.set(position.x, position.y, position.z);
    this.perspectiveCamera.lookAt(0, 0, 0);
    this.perspectiveCamera.userData.state = { position: this.perspectiveCamera.position.clone(), rotation: this.perspectiveCamera.rotation.clone(), target: new THREE.Vector3() };

    // Инициализация ортографической камеры
    const width = this.container.clientWidth / 50;
    const height = this.container.clientHeight / 50;
    this.orthographicCamera = new THREE.OrthographicCamera(-width, width, height, -height, near, far);
    this.orthographicCamera.position.set(0, 100, 0);
    this.orthographicCamera.lookAt(0, 0, 0);
    this.orthographicCamera.userData.state = { position: this.orthographicCamera.position.clone(), rotation: this.orthographicCamera.rotation.clone(), target: new THREE.Vector3() };

    // Установка активной камеры (по умолчанию перспективная)
    this.activeCamera = this.orthographicCamera;
  }

  private initRenderer(options: RendererOptions = {}): void {
    const { antialias = true, pixelRatio = window.devicePixelRatio } = options;
    this.renderer = new THREE.WebGLRenderer({ antialias });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(pixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.effectsManager = new EffectsManager(this.scene, this.activeCamera, this.renderer, {
      antialias: false,
      outline: {
        edgeStrength: 5.0,
        edgeThickness: 2.0,
        visibleEdgeColor: 0xffff00,
      },
    });
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
    this.controls.addEventListener('change', () => this.render());
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

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    this.clickEvent();
  }

  private clickEvent() {
    const clickHandler = new ClickManager(this.scene, this.activeCamera, this.renderer.domElement, { threshold: 0.2 });

    // Подписка на события клика
    this.renderer.domElement.addEventListener('object-clicked', (event: CustomEvent<ClickEvent>) => {
      const { object, point } = event.detail;
      console.log('Clicked object:', object);
      console.log('Intersection point:', point);

      // Пример: подсветка выбранного объекта
      if (object instanceof THREE.Mesh) {
        const originalMaterial = object.material;
        object.material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          wireframe: true,
        });
        //object.removeFromParent();
        // setTimeout(() => {
        //   object.material = originalMaterial;
        //   this.render();
        // }, 1000);

        this.render();
      }
    });

    // Включение/выключение обработчика
    clickHandler.setEnabled(true);
  }

  private handleResize(): void {
    const aspect = this.container.clientWidth / this.container.clientHeight;

    // Обновление перспективной камеры
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    // Обновление ортографической камеры
    const width = this.container.clientWidth / 50;
    const height = this.container.clientHeight / 50;
    this.orthographicCamera.left = -width;
    this.orthographicCamera.right = width;
    this.orthographicCamera.top = height;
    this.orthographicCamera.bottom = -height;
    this.orthographicCamera.updateProjectionMatrix();

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.effectsManager.setSize(this.container.clientWidth, this.container.clientHeight);
    this.render();
  }

  private initStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    this.container.appendChild(this.stats.dom);
  }

  public render(): void {
    this.stats.begin();
    //this.renderer.render(this.scene, this.activeCamera);
    this.effectsManager.render();
    this.stats.end();
  }

  public dispose(): void {
    this.controls.dispose();
    this.renderer.dispose();

    this.lights.forEach((light) => {
      this.scene.remove(light);
      if (light.dispose) light.dispose();
    });

    window.removeEventListener('resize', () => this.handleResize());
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.activeCamera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public setCamera({ type }): void {
    this.saveCameraState();

    if (type === '2D') {
      // Переключаемся на ортографическую камеру
      this.activeCamera = this.orthographicCamera;
      this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    }
    if (type === '3D') {
      // Переключаемся на перспективную камеру
      this.activeCamera = this.perspectiveCamera;
      this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    }

    this.effectsManager.renderPass.camera = this.activeCamera;
    this.effectsManager.outlinePass.renderCamera = this.activeCamera;

    // Для ShaderPass может потребоваться обновление
    if (this.effectsManager.fxaaPass) {
      this.effectsManager.composer.removePass(this.effectsManager.fxaaPass);
      //this.effectsManager.initFXAA(); // Переинициализируем с новой камерой
    }

    // Обновляем контролы орбиты для новой камеры
    this.controls.object = this.activeCamera;
    this.restoreCameraState();

    this.render();
  }

  private saveCameraState(): void {
    this.activeCamera.userData.state = {
      position: this.activeCamera.position.clone(),
      rotation: this.activeCamera.rotation.clone(),
      target: this.controls.target.clone(),
    };
  }

  private restoreCameraState(): void {
    const state = this.activeCamera.userData.state;
    if (state) {
      this.activeCamera.position.copy(state.position);
      this.activeCamera.rotation.copy(state.rotation);
      this.controls.target.copy(state.target);
      this.controls.update();
    }
  }
}
