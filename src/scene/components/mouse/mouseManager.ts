import * as THREE from 'three';
import { sceneManager, effectsManager, controls, createModel } from '../../../index';

export class MouseManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private selectedObj: { obj: THREE.Object3D | null; type: string } = { obj: null, type: '' };
  private isDown = false;
  private isMove = false;
  private planeMath: THREE.Mesh;
  private offset = new THREE.Vector3();

  private lastWalls = [];

  public init(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.1;
    this.raycaster.params.Points.threshold = 0.1;
    this.raycaster.far = 100;

    this.mouse = new THREE.Vector2();

    this.domElement.addEventListener('pointerdown', this.pointerDown);
    this.domElement.addEventListener('pointermove', this.pointerMove);
    this.domElement.addEventListener('pointerup', this.pointerUp);

    window.addEventListener('keydown', this.keyDown);

    this.planeMath = this.initPlaneMath();
  }

  private initPlaneMath() {
    const geometry = new THREE.PlaneGeometry(10000, 10000);
    const material = new THREE.MeshPhongMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    material.visible = false;
    const planeMath = new THREE.Mesh(geometry, material);
    planeMath.rotation.set(-Math.PI / 2, 0, 0);
    this.scene.add(planeMath);

    return planeMath;
  }

  private keyDown = (event) => {
    if (event.code === 'Delete') this.deleteSelectedObj();
    //if (event.code === 'Enter') this.addWindow();
  };

  private pointerDown = (event: MouseEvent) => {
    this.calculateMousePosition(event);
    this.updateRaycaster();

    if (this.selectedObj.obj && this.selectedObj.type === 'add') {
      this.insertWindow({ event });

      this.resetSelectedObj();
      return;
    }

    const lastSelectedObj = this.getSelectedObj();
    const lastObj = lastSelectedObj.obj;
    let { obj, intersect } = this.intersectObj({ event });

    if (obj && obj === lastObj) {
      controls.disenableMoveRotate();
      this.lastWalls = [];
      const objs = createModel.objsPatternWind;
      const objPatternWind = objs.find((item) => item.userData.dataPatternWindow.Id === obj.userData.dataPatternWindow.Id);
      if (!objPatternWind) return;

      this.changeWindowOnPatternWind({ obj, objPatternWind, type: 'add' });

      const selectedObj = this.getSelectedObj();
      obj = selectedObj.obj;

      effectsManager.addOutlineObject(obj);
      this.setSelectedObj({ obj, type: 'move' });
      sceneManager.render();

      this.offset = intersect.point;
      this.planeMath.position.copy(intersect.point);
      this.planeMath.rotation.copy(obj.rotation);
      this.planeMath.updateMatrixWorld();
    }

    this.isDown = true;
  };

  private pointerMove = (event: MouseEvent) => {
    if (!this.isDown) return;
    this.isMove = true;

    if (!this.selectedObj.obj) return;

    if (this.selectedObj.type === 'add') {
      this.calculateMousePosition(event);
      this.updateRaycaster();

      const obj = this.selectedObj.obj;

      const intersects = this.raycaster.intersectObjects(createModel.meshesWalls, true);
      if (intersects.length === 0) return;
      obj.visible = true;

      const pos = intersects[0].point;

      const globalCenter = obj.localToWorld(obj.userData.center.clone());
      globalCenter.sub(obj.position);

      obj.position.copy(pos.clone().add(intersects[0].normal.clone().multiplyScalar(-0.15)).sub(globalCenter));
      obj.lookAt(intersects[0].normal.clone().add(obj.position));

      this.clampWindowPosition({ wall: intersects[0].object, windowMesh: obj, pos: obj.position });
    }

    if (this.selectedObj.type === 'move') {
      this.calculateMousePosition(event);
      this.updateRaycaster();

      const { obj } = this.getSelectedObj();

      const intersects = this.raycaster.intersectObject(this.planeMath, true);
      if (intersects.length === 0) return;

      const offset = new THREE.Vector3().subVectors(intersects[0].point, this.offset);
      this.offset = intersects[0].point;

      //offset.y = 0;

      obj.position.add(offset);

      const intersects2 = this.raycaster.intersectObjects(createModel.meshesWalls, true);
      if (intersects2.length > 0) this.lastWalls = intersects2;

      const pos = obj.position.clone();
      this.clampWindowPosition({ wall: this.lastWalls[0].object, windowMesh: obj, pos: obj.position });
      const offset2 = obj.position.clone().sub(pos);
      this.offset.add(offset2);
    }

    sceneManager.render();
  };

  private pointerUp = (event: MouseEvent) => {
    controls.enableMoveRotate();

    if (!this.isMove) {
      this.resetSelectedObj();

      const { obj } = this.intersectObj({ event });

      if (obj) {
        effectsManager.addOutlineObject(obj);
        this.setSelectedObj({ obj, type: 'click' });
      }
    }

    const selectedObj = this.getSelectedObj();
    if (selectedObj.obj && selectedObj.type === 'move') {
      this.insertWindow({ event });
      this.setSelectedObj({ obj: selectedObj.obj, type: '' });
    }

    sceneManager.render();

    this.isDown = false;
    this.isMove = false;
  };

  private calculateMousePosition(event: MouseEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateRaycaster() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private intersectObj({ event }: { event: MouseEvent }) {
    let obj: null | THREE.Mesh | THREE.Object3D;
    let intersect: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> | null;
    obj = null;
    intersect = null;

    if (event.button === 2) return { obj, intersect };

    this.calculateMousePosition(event);
    this.updateRaycaster();

    //const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    const intersects = this.raycaster.intersectObjects(createModel.meshesWinds, true);

    if (intersects.length > 0) {
      intersect = intersects[0];
      let object = intersect.object;

      while (object.parent && !(object.parent instanceof THREE.Object3D)) {
        object = object.parent;
      }

      const targetObject = object.parent instanceof THREE.Object3D ? object.parent : object;

      if (targetObject instanceof THREE.Mesh || targetObject instanceof THREE.Object3D) {
        obj = targetObject;
      }
    }

    return { obj, intersect };
  }

  public setCamera({ camera }) {
    this.camera = camera;
  }

  private getSelectedObj() {
    return this.selectedObj;
  }

  private setSelectedObj({ obj, type }: { obj: null | THREE.Mesh | THREE.Object3D; type: 'click' | 'add' | 'move' | '' }) {
    this.selectedObj.obj = obj;
    this.selectedObj.type = type;
  }

  private clearSelectedObj() {
    this.setSelectedObj({ obj: null, type: '' });
  }

  private resetSelectedObj() {
    this.clearSelectedObj();
    effectsManager.clearOutlineObjects();
  }

  public changeWindow({ objPatternWind }) {
    let { obj } = this.getSelectedObj();
    if (!obj) {
      obj = this.addWindow({ objPatternWind, type: 'add' });
      obj.visible = false;
      sceneManager.render();
      return;
    }

    const meshesWalls = [];
    for (let i = 0; i < obj.userData.meshesOpenings.length; i++) {
      const meshesOpening = obj.userData.meshesOpenings[i];
      const meshWall = meshesOpening.userData.meshWall;
      meshesWalls.push(meshWall);
    }

    this.changeWindowOnPatternWind({ obj, objPatternWind, type: '' });

    const selectedObj = this.getSelectedObj();
    obj = selectedObj.obj;

    this.insertWindow2({ obj, meshesWalls });

    effectsManager.addOutlineObject(obj);
    this.setSelectedObj({ obj, type: '' });
    sceneManager.render();
  }

  private insertWindow2({ obj, meshesWalls }) {
    this.changeMat({ obj, type: 'def' });

    for (let i2 = 0; i2 < meshesWalls.length; i2++) {
      console.log(i2);
      const meshWall = meshesWalls[i2];

      const meshesOpening = this.crBoundingBox({ obj });
      meshesOpening.updateMatrixWorld();
      meshesOpening.userData.meshWall = meshWall;

      obj.userData.meshesOpenings.push(meshesOpening);

      meshWall.userData.meshesOpenings.push(meshesOpening);

      createModel.updateCSG({ targetObj: meshWall, obj2: meshesOpening });
    }

    createModel.meshesWinds.push(obj);
  }

  private changeWindowOnPatternWind({ obj, objPatternWind, type }) {
    const pos = obj.position.clone();
    const rot = obj.rotation.clone();
    this.deleteSelectedObj();

    this.addWindow({ objPatternWind, type });
    const selectedObj = this.getSelectedObj();
    obj = selectedObj.obj;
    obj.position.copy(pos);
    obj.rotation.copy(rot);
  }

  private addWindow({ objPatternWind, type }: { objPatternWind: THREE.Object3D; type: string }) {
    const obj = objPatternWind.clone();
    obj.position.set(0, 0, 0);
    this.scene.add(obj);

    this.changeMat({ obj, type: 'add' });

    const boundingBox = new THREE.Box3().setFromObject(obj);
    boundingBox.applyMatrix4(obj.matrixWorld.clone().invert());
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    obj.userData.center = center;

    this.setSelectedObj({ obj, type: 'add' });

    if (type === 'add') this.isDown = true;

    sceneManager.render();

    return obj;
  }

  private insertWindow({ event }: { event: MouseEvent }) {
    this.calculateMousePosition(event);
    this.updateRaycaster();

    const intersects = this.raycaster.intersectObjects(createModel.meshesWalls, true);
    if (intersects.length === 0) return;

    const { obj } = this.getSelectedObj();

    this.changeMat({ obj, type: 'def' });

    for (let i2 = 0; i2 < intersects.length; i2++) {
      if (i2 > 2) break;
      const meshWall = intersects[i2].object;

      const meshesOpening = this.crBoundingBox({ obj });
      meshesOpening.updateMatrixWorld();
      meshesOpening.userData.meshWall = meshWall;

      obj.userData.meshesOpenings.push(meshesOpening);

      meshWall.userData.meshesOpenings.push(meshesOpening);

      createModel.updateCSG({ targetObj: meshWall, obj2: meshesOpening });
    }

    createModel.meshesWinds.push(obj);

    sceneManager.render();
  }

  private crBoundingBox({ obj }) {
    obj.updateMatrixWorld(true);
    const boundingBox = new THREE.Box3().setFromObject(obj);

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    boundingBox.getSize(size);
    boundingBox.getCenter(center);

    const facingDir = new THREE.Vector3();
    obj.getWorldDirection(facingDir);

    const dir = new THREE.Vector3(Math.abs(facingDir.x), Math.abs(facingDir.y), Math.abs(facingDir.z));

    const boxGeometry = new THREE.BoxGeometry(size.x + dir.x * 2, size.y + dir.y * 2, size.z + dir.z * 2);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.copy(center);

    return boxMesh;
  }

  private clampWindowPosition({ wall, windowMesh, pos }: { wall: THREE.Mesh | THREE.Object3D; windowMesh: THREE.Object3D; pos: THREE.Vector3 }) {
    //wall.updateMatrixWorld();
    windowMesh.updateMatrixWorld();

    // BoundingBox в мировых координатах
    const wallBBox = new THREE.Box3().setFromObject(wall);
    const windowBBox = new THREE.Box3().setFromObject(windowMesh);

    // BoundingBox в локальные координаты
    const o = new THREE.Object3D();
    o.rotation.copy(windowMesh.rotation);
    o.updateMatrix();
    o.updateMatrixWorld();
    const inverseWallMatrix = new THREE.Matrix4().copy(o.matrixWorld).invert(); //  Вычисляем матрицу преобразования в локальные координаты стены
    const windowLocalBBox = windowBBox.clone().applyMatrix4(inverseWallMatrix);
    const wallLocalBBox = wallBBox.clone().applyMatrix4(inverseWallMatrix);

    const isWindowFullyInsideWall = windowLocalBBox.min.x >= wallLocalBBox.min.x && windowLocalBBox.max.x <= wallLocalBBox.max.x && windowLocalBBox.min.y >= wallLocalBBox.min.y && windowLocalBBox.max.y <= wallLocalBBox.max.y;

    if (isWindowFullyInsideWall) return;

    const offset = new THREE.Vector3();

    if (windowLocalBBox.min.x < wallLocalBBox.min.x) {
      offset.x = wallLocalBBox.min.x - windowLocalBBox.min.x;
    } else if (windowLocalBBox.max.x > wallLocalBBox.max.x) {
      offset.x = wallLocalBBox.max.x - windowLocalBBox.max.x;
    }

    if (windowLocalBBox.min.y < wallLocalBBox.min.y) {
      offset.y = wallLocalBBox.min.y - windowLocalBBox.min.y;
    } else if (windowLocalBBox.max.y > wallLocalBBox.max.y) {
      offset.y = wallLocalBBox.max.y - windowLocalBBox.max.y;
    }

    if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
      offset.applyMatrix4(o.matrixWorld); // мировые координаты

      pos.x += offset.x;
      pos.y += offset.y;
      pos.z += offset.z;

      windowMesh.position.copy(pos);
      windowMesh.updateMatrixWorld();
    }
  }

  private deleteSelectedObj() {
    if (!this.selectedObj.obj) return;

    effectsManager.clearOutlineObjects();

    const obj = this.selectedObj.obj;

    if (obj.userData.tag && obj.userData.tag === 'window') {
      this.deleteWindow({ obj });
    } else {
      this.selectedObj.obj.removeFromParent();
    }

    this.clearSelectedObj();

    sceneManager.render();
  }

  private deleteWindow({ obj }) {
    console.log(222, obj.userData);

    for (let i = 0; i < obj.userData.meshesOpenings.length; i++) {
      const meshesOpening = obj.userData.meshesOpenings[i];

      console.log(333, meshesOpening.userData.meshWall.userData);
      const meshWall = meshesOpening.userData.meshWall;

      meshWall.geometry.dispose();
      const meshesWalls = createModel.createWalls({ dataWalls: [meshWall.userData.dataWall], ElementTypes: meshWall.userData.dataElementTypes });
      meshWall.geometry = meshesWalls[0].geometry;

      const index = meshWall.userData.meshesOpenings.indexOf(meshesOpening);
      if (index !== -1) {
        meshWall.userData.meshesOpenings.splice(index, 1);
      }

      this.disposeObject(meshesOpening);

      for (let i2 = 0; i2 < meshWall.userData.meshesOpenings.length; i2++) {
        createModel.updateCSG({ targetObj: meshWall, obj2: meshWall.userData.meshesOpenings[i2] });
      }
    }

    const index = createModel.meshesWinds.indexOf(obj);
    if (index !== -1) {
      createModel.meshesWinds.splice(index, 1);
    }

    this.disposeObject(obj);
  }

  private disposeObject(object: THREE.Object3D) {
    if (!object) return;

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }

      if ((child as any).material?.map) {
        (child as any).material.map.dispose();
      }

      //child.removeEventListener('click', (child as any)._clickHandler);
      child.userData = {};
    });

    if (object.parent) {
      object.parent.remove(object);
    }

    if (object instanceof THREE.Group) {
      object.clear();
    }
  }

  private changeMat({ obj, type }: { obj: THREE.Object3D; type: 'add' | 'def' }) {
    console.log(type);
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          if (type === 'add') {
            child.userData.matOriginal = child.material;
            child.material = child.material.clone();
            child.material.depthTest = false;
            child.material.transparent = true;
          } else {
            child.material = child.userData.matOriginal;
          }
        }
      }
    });
  }
}
