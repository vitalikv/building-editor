import * as THREE from 'three';
import { uiMain, sceneManager, effectsManager, controls, mouseManager } from '../../../index';

export class CameraManager {
  private container: HTMLElement;
  private cam3D: THREE.PerspectiveCamera;
  private camTop: THREE.OrthographicCamera;
  private camFront: THREE.OrthographicCamera;
  private activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private options = { fov: 45, aspect: 1, near: 0.1, far: 1000, position: { x: 0, y: 35, z: 80 } };
  private renderer: THREE.WebGLRenderer;

  public init({ container, renderer }) {
    this.container = container;
    this.renderer = renderer;

    this.initCameras();

    this.initEvents();
  }

  private initEvents() {
    window.addEventListener('resize', () => this.handleResize());
  }

  private initCameras() {
    this.options.aspect = this.container.clientWidth / this.container.clientHeight;

    this.cam3D = this.createCam3D();
    this.camTop = this.createCamTop();
    this.camFront = this.createCamFront();

    this.setActiveCamera({ camera: this.cam3D });
  }

  private createCam3D() {
    const camera = new THREE.PerspectiveCamera(this.options.fov, this.options.aspect, this.options.near, this.options.far);
    camera.position.set(this.options.position.x, this.options.position.y, this.options.position.z);
    camera.lookAt(0, 0, 0);
    camera.userData.state = { position: camera.position.clone(), rotation: camera.rotation.clone(), target: new THREE.Vector3() };
    camera.userData.start = { dir: camera.position.clone().normalize(), dist: new THREE.Vector3().distanceTo(camera.position) };

    return camera;
  }

  private createCamTop() {
    const width = this.container.clientWidth / 50;
    const height = this.container.clientHeight / 50;
    const camera = new THREE.OrthographicCamera(-width, width, height, -height, this.options.near, this.options.far);
    camera.position.set(0, 100, 0);
    camera.lookAt(0, 0, 0);
    camera.userData.state = { position: camera.position.clone(), rotation: camera.rotation.clone(), target: new THREE.Vector3() };
    camera.userData.start = { dir: camera.position.clone().normalize(), dist: new THREE.Vector3().distanceTo(camera.position) };

    return camera;
  }

  private createCamFront() {
    const width = this.container.clientWidth / 50;
    const height = this.container.clientHeight / 50;
    const camera = new THREE.OrthographicCamera(-width, width, height, -height, this.options.near, this.options.far);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    camera.userData.state = { position: camera.position.clone(), rotation: camera.rotation.clone(), target: new THREE.Vector3() };
    camera.userData.start = { dir: camera.position.clone().normalize(), dist: new THREE.Vector3().distanceTo(camera.position) };

    return camera;
  }

  private handleResize = () => {
    const aspect = this.container.clientWidth / this.container.clientHeight;

    this.cam3D.aspect = aspect;
    this.cam3D.updateProjectionMatrix();

    const width = this.container.clientWidth / 50;
    const height = this.container.clientHeight / 50;
    this.camTop.left = -width;
    this.camTop.right = width;
    this.camTop.top = height;
    this.camTop.bottom = -height;
    this.camTop.updateProjectionMatrix();

    this.camFront.left = -width;
    this.camFront.right = width;
    this.camFront.top = height;
    this.camFront.bottom = -height;
    this.camFront.updateProjectionMatrix();

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    if (effectsManager.enabled) {
      effectsManager.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    sceneManager.render();
  };

  public setActiveCamera({ camera }) {
    this.activeCamera = camera;
  }

  public getActiveCamera() {
    return this.activeCamera;
  }

  private getCam3D() {
    return this.cam3D;
  }

  private getCamTop() {
    return this.camTop;
  }

  private getCamFront() {
    return this.camFront;
  }

  public updateTargetOnModel({ center }: { center: THREE.Vector3 }) {
    const orbitControls = controls.getControls();
    orbitControls.target.copy(center);

    const cam3D = this.getCam3D();
    cam3D.position.add(center);
    cam3D.lookAt(center);
    cam3D.updateProjectionMatrix();
    this.saveCameraState({ camera: cam3D });

    const camTop = this.getCamTop();
    camTop.position.add(center);
    camTop.lookAt(center);
    camTop.updateProjectionMatrix();
    this.saveCameraState({ camera: camTop });

    const camFront = this.getCamFront();
    camFront.position.add(center);
    camFront.lookAt(center);
    camFront.updateProjectionMatrix();
    this.saveCameraState({ camera: camFront });

    controls.update();
    sceneManager.render();
  }

  public setCamera({ type }: { type: '3D' | 'Top' | 'Front' }) {
    this.saveCameraState({ camera: this.getActiveCamera() });

    if (type === '3D') {
      this.setActiveCamera({ camera: this.getCam3D() });
      controls.enableRotate();
      console.log(this.activeCamera.userData);
    }
    if (type === 'Top') {
      this.setActiveCamera({ camera: this.getCamTop() });
      controls.disenableRotate();
    }
    if (type === 'Front') {
      this.setActiveCamera({ camera: this.getCamFront() });
      controls.disenableRotate();
    }

    uiMain.uiBtnCamera.clickOnBtn({ type });

    if (effectsManager.enabled) {
      effectsManager.renderPass.camera = this.getActiveCamera();
      effectsManager.outlinePass.renderCamera = this.getActiveCamera();

      if (effectsManager.fxaaPass) {
        effectsManager.composer.removePass(effectsManager.fxaaPass);
        //this.effectsManager.initFXAA(); // Переинициализируем с новой камерой
      }
    }

    mouseManager.setCamera({ camera: this.getActiveCamera() });
    controls.setCamera({ camera: this.getActiveCamera() });
    this.restoreCameraState();

    sceneManager.render();
  }

  private saveCameraState({ camera }: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera }) {
    const orbitControls = controls.getControls();

    camera.userData.state = {
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
      target: orbitControls.target.clone(),
    };

    console.log(camera.userData.state);
  }

  private restoreCameraState() {
    const orbitControls = controls.getControls();
    const state = this.activeCamera.userData.state;

    if (state) {
      this.activeCamera.position.copy(state.position);
      this.activeCamera.rotation.copy(state.rotation);
      orbitControls.target.copy(state.target);
      controls.update();
    }
  }

  public setPosCamFront({ position }: { position: THREE.Vector3 }) {
    const orbitControls = controls.getControls();
    const target = orbitControls.target.clone();

    const camera = this.getCamFront();
    //camera.position.copy(position);
    camera.position.copy(target.clone().add(position.clone().normalize().multiplyScalar(100)));
    // camera.up.set(0, 1, 0);
    // camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    console.log(target, camera);

    //orbitControls.target.copy(new THREE.Vector3(0, 0, 0));
    controls.update();
    sceneManager.render();
  }
}
