import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { SceneOptions, CameraOptions, RendererOptions, GridOptions } from './types';

import { JsonModelParser } from '../modelData/jsonModelParser';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private lights: THREE.Light[] = [];
  private grid?: THREE.GridHelper;
  private animationFrameId: number | null = null;

  constructor(containerId: string, options: SceneOptions = {}) {
    this.validateContainer(containerId);
    this.container = document.getElementById(containerId) as HTMLElement;

    this.initScene(options.backgroundColor);
    this.initCamera(options.cameraOptions);
    this.initRenderer(options.rendererOptions);
    this.initControls();
    this.initDefaultLights();
    this.addGrid({ size: 100, divisions: 25, colorCenterLine: 0x222222, colorGrid: 0xcccccc });

    this.setupEventListeners();

    this.startAnimation();

    this.getModel();
    //this.test();
  }

  public async getModel() {
    const jsonModel = new JsonModelParser();
    await jsonModel.getJson();

    const dataLevels = jsonModel.getDataLevels();

    for (let n = 1; n < dataLevels.length; n++) {
      const { dataLevel, dataWalls, ElementTypes } = jsonModel.getStructureLevel({ targetNumber: n });

      const levelPosY = dataLevel.Elevation / 1000;

      for (let i = 0; i < dataWalls.length; i++) {
        const dWall = dataWalls[i];
        const typeMat = dataWalls[i].WallPositionType;

        const height = dWall.Height / 1000;
        const p1 = new THREE.Vector2(dWall.Location.Start.X / 1000, dWall.Location.Start.Y / 1000);
        const p2 = new THREE.Vector2(dWall.Location.End.X / 1000, dWall.Location.End.Y / 1000);

        let width = 0.1;
        if (typeMat === 'Facade') {
          const r = ElementTypes.find((item) => item.Id === dWall.ElementTypeId);

          width = 0;
          for (let i2 = 0; i2 < r.Layers.length; i2++) {
            width += r.Layers[i2].Thickness;
          }

          //console.log(dWall.ElementTypeId, r, width);
          width /= 1000;
        }

        const dir = this.calcNormal2D({ p1, p2, reverse: true });
        dir.multiplyScalar(width);

        const form = [p1, p2, p2.clone().add(dir), p1.clone().add(dir)];

        this.test({ form, height, levelPosY, typeMat });
      }
    }
  }

  // перпендикуляр линии (2D)
  private calcNormal2D({ p1, p2, reverse = false }) {
    let x = p1.y - p2.y;
    let y = p2.x - p1.x;

    // нормаль вывернуть в обратное напрвление
    if (reverse) {
      x *= -1;
      y *= -1;
    }

    return new THREE.Vector2(x, y).normalize();
  }

  test({ form, height, levelPosY, typeMat }) {
    //const form = [new THREE.Vector2(1.5, 0.1), new THREE.Vector2(-1.5, 0.1), new THREE.Vector2(-1.5, -0.1), new THREE.Vector2(1.5, -0.1)];
    const shape = new THREE.Shape(form);
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: height });
    geometry.rotateX(-Math.PI / 2);

    let color = 0xcccccc;
    if (typeMat === 'Facade') color = 0xad5603;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color }));
    mesh.position.set(0, levelPosY, 0);
    this.scene.add(mesh);
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

  private initCamera(options: CameraOptions = {}): void {
    const { fov = 45, aspect = this.container.clientWidth / this.container.clientHeight, near = 0.1, far = 1000, position = { x: 0, y: 15, z: -30 } } = options;

    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(position.x, position.y, position.z);
  }

  private initRenderer(options: RendererOptions = {}): void {
    const { antialias = true, pixelRatio = window.devicePixelRatio } = options;

    this.renderer = new THREE.WebGLRenderer({ antialias });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(pixelRatio);
    this.container.appendChild(this.renderer.domElement);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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
  }

  private handleResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.render();
  }

  private startAnimation(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.controls.update();
      this.render();
    };

    animate();
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.stopAnimation();
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

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
}
