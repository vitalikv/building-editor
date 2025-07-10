import * as THREE from 'three';

export interface ClickEvent {
  object: THREE.Object3D;
  point: THREE.Vector3;
  distance: number;
  face?: THREE.Face;
  faceIndex?: number;
}

interface RaycasterConfig {
  recursive?: boolean;
  threshold?: number;
  maxDistance?: number;
}

export class ClickManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private enabled: boolean;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement, config: RaycasterConfig = {}) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = config.threshold ?? 0.1;
    this.raycaster.params.Points.threshold = config.threshold ?? 0.1;

    if (config.maxDistance) {
      this.raycaster.far = config.maxDistance;
    }

    this.mouse = new THREE.Vector2();
    this.enabled = true;

    this.handleClick = this.handleClick.bind(this);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('click', this.handleClick, false);
  }

  private removeEventListeners(): void {
    this.domElement.removeEventListener('click', this.handleClick);
  }

  private handleClick(event: MouseEvent): void {
    if (!this.enabled) return;

    this.calculateMousePosition(event);
    this.updateRaycaster();

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    console.log(intersects);
    if (intersects.length > 0) {
      const firstIntersect = intersects[0];
      const clickEvent: ClickEvent = {
        object: firstIntersect.object,
        point: firstIntersect.point,
        distance: firstIntersect.distance,
        face: firstIntersect.face,
        faceIndex: firstIntersect.faceIndex,
      };

      this.dispatchClickEvent(clickEvent);
    }
  }

  private calculateMousePosition(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateRaycaster(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private dispatchClickEvent(event: ClickEvent): void {
    const customEvent = new CustomEvent<ClickEvent>('object-clicked', {
      detail: event,
    });
    this.domElement.dispatchEvent(customEvent);
  }

  public setEnabled(state: boolean): void {
    this.enabled = state;
  }

  public dispose(): void {
    this.removeEventListeners();
  }
}
