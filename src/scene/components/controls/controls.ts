import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { sceneManager, cameraManager } from '../../../index';

export class Controls {
  private controls: OrbitControls;

  public init({ camera, renderer }) {
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.addEventListener('change', () => sceneManager.render());
  }

  public getControls() {
    return this.controls;
  }

  public setCamera({ camera }) {
    this.controls.object = camera;
    this.update();
  }

  public disenableRotate() {
    this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.update();
  }

  public enableRotate() {
    this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    this.update();
  }

  public disenableMoveRotate() {
    this.controls.enableRotate = false;
    this.controls.enablePan = false;
    this.update();
  }

  public enableMoveRotate() {
    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    this.update();
  }

  public update() {
    this.controls.update();
  }
}
