import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, INTERSECTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';

import { uiMain, jsonModelParser, extrudedGeometry } from '../../../index';
import { JsonModelParser } from './jsonModelParser';
import { Mesh } from 'three';

export class CreateModel {
  private scene: THREE.Scene;
  private jsonModel: JsonModelParser;
  private evaluator: Evaluator;
  private model;
  public meshesWalls = [];
  public meshesWinds = [];
  public objsPatternWind = [];

  public init(scene: THREE.Scene) {
    this.scene = scene;
    this.evaluator = new Evaluator();
  }

  public async initModel() {
    const jsonModel = jsonModelParser;
    await jsonModel.getJson();

    this.jsonModel = jsonModel;

    const dataWindows = jsonModel.getLibraryWindows();
    this.objsPatternWind = this.createPatternWindow({ dataWindows });

    const dataLevels = jsonModel.getDataLevels();

    const model = new THREE.Object3D();

    for (let i = 0; i < dataLevels.length; i++) {
      const group = new THREE.Object3D();
      group.userData.dataLevel = dataLevels[i];
      console.log('Level', dataLevels[i]);
      const { meshesWalls, meshesWinds } = this.createLevel({ idLevel: i, objsWind: this.objsPatternWind });

      this.meshesWinds.push(...meshesWinds);

      const geometryWallsMerge = [];

      const meshesWallsFacade = [];
      for (let i2 = 0; i2 < meshesWalls.length; i2++) {
        if (meshesWalls[i2].userData.dataWall.WallPositionType === 'Facade') {
          this.meshesWalls.push(meshesWalls[i2]);
          meshesWallsFacade.push(meshesWalls[i2]);
        } else {
          geometryWallsMerge.push(meshesWalls[i2].geometry);
        }
      }

      if (geometryWallsMerge.length > 0) {
        const mergeGeometries = BufferGeometryUtils.mergeGeometries(geometryWallsMerge);
        const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const meshMerge = new THREE.Mesh(mergeGeometries, material);

        group.add(meshMerge);
      }

      if (meshesWallsFacade.length > 0) {
        group.add(...meshesWallsFacade);
        model.add(group);
      }
    }

    this.scene.add(model);
    this.model = model;
    console.log('model', model);

    for (let i = 0; i < model.children.length; i++) {
      if (i > 2 && i < 6) continue;
      //model.children[i].visible = false;
    }
  }

  private createLevel({ idLevel, objsWind }) {
    const { dataLevel, dataWalls, ElementTypes, windowOpenings, osW, dataFloor } = this.jsonModel.getStructureLevel({ idLevel });

    const levelPosY = dataLevel.Elevation / 1000;

    const meshesWalls = this.createWalls({ dataWalls, ElementTypes });

    const meshesOpenings = this.createOpenings({ dataOpenings: osW, meshesWalls });
    const meshesWinds = this.createWindows({ meshesOpenings, objsWind, windowOpenings });

    this.createdataFloor({ dataFloor, ElementTypes });

    return { meshesWalls, meshesWinds };
  }

  public createWalls({ dataWalls, ElementTypes }) {
    const meshes = [];

    for (let i = 0; i < dataWalls.length; i++) {
      const dWall = dataWalls[i];
      const typeMat = dataWalls[i].WallPositionType;

      const height = dWall.Height / 1000;
      const p1 = new THREE.Vector3(dWall.Location.Start.X / 1000, dWall.Location.Start.Z / 1000, dWall.Location.Start.Y / 1000);
      const p2 = new THREE.Vector3(dWall.Location.End.X / 1000, dWall.Location.End.Z / 1000, dWall.Location.End.Y / 1000);

      const dataElementTypes = ElementTypes.find((item) => item.Id === dWall.ElementTypeId);

      let width = 0;
      for (let i2 = 0; i2 < dataElementTypes.Layers.length; i2++) {
        width += dataElementTypes.Layers[i2].Thickness;
      }
      width /= 1000;

      let color = 0xcccccc;
      let dir = this.calcNormal2D({ p1, p2, reverse: true });
      dir.multiplyScalar(width);

      let offsetL = new THREE.Vector3();
      let offsetR = new THREE.Vector3();

      if (dWall.LocationBinding === 'SideOut') {
        offsetL.sub(dir);
      } else if (dWall.LocationBinding === 'SideIn') {
        offsetR.add(dir);
      } else if (dWall.LocationBinding === 'Center') {
        offsetL.sub(dir.clone().multiplyScalar(0.5));
        offsetR.add(dir.clone().multiplyScalar(0.5));
      }

      const form = [p1.clone().add(offsetL), p2.clone().add(offsetL), p2.clone().add(offsetR), p1.clone().add(offsetR), p1.clone().add(offsetL)];

      if (typeMat === 'Facade') color = 0xe8e590;

      const geometry = extrudedGeometry.create(form, height);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.dataWall = dataWalls[i];
      mesh.userData.dataElementTypes = [dataElementTypes];
      mesh.userData.meshesOpenings = [];
      meshes.push(mesh);
    }

    return meshes;
  }

  private createOpenings({ dataOpenings, meshesWalls }) {
    console.log('dataOpenings', dataOpenings);

    const meshes = [];

    for (let i = 0; i < dataOpenings.length; i++) {
      const meshWall = meshesWalls.find((item) => item.userData.dataWall.Id === dataOpenings[i].HostId);
      if (!meshWall) continue;

      const profile = dataOpenings[i].Profile;

      const form = [];
      for (let i2 = 0; i2 < profile.length; i2++) {
        const pos = profile[i2];
        form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, pos.Y / 1000));
      }

      const geometry = extrudedGeometry.create(form, 1.3, 'two');
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.opening = dataOpenings[i];
      mesh.userData.meshWall = meshWall;

      meshWall.userData.meshesOpenings.push(mesh);
      //this.scene.add(mesh);
      meshes.push(mesh);

      this.updateCSG({ targetObj: meshWall, obj2: mesh });
    }

    return meshes;
  }

  private createWindows({ meshesOpenings, objsWind, windowOpenings }) {
    console.log('meshesOpenings', meshesOpenings);
    console.log('windowOpenings', windowOpenings);

    const meshesWinds = [];

    for (let i = 0; i < windowOpenings.length; i++) {
      const insertionPoint = windowOpenings[i].InsertionPoint;
      const direction = windowOpenings[i].Direction;
      const windowId = windowOpenings[i].WindowId;
      const openingId = windowOpenings[i].OpeningId;

      const meshOpening = meshesOpenings.find((item) => item.userData.opening.Id === openingId);
      if (!meshOpening) continue;

      const meshWind = objsWind.find((item) => item.userData.dataPatternWindow.Id === windowId);
      if (meshWind) {
        const obj = meshWind.clone();

        const pos = new THREE.Vector3(insertionPoint.X / 1000, insertionPoint.Z / 1000, insertionPoint.Y / 1000);
        obj.position.copy(pos);

        const dir = new THREE.Vector3(direction.X, direction.Z, direction.Y);
        const t = new THREE.Mesh();
        t.lookAt(dir);
        obj.rotation.copy(t.rotation.clone());
        obj.userData.dataWindowOpening = windowOpenings[i];
        this.scene.add(obj);

        meshesWinds.push(obj);
      }
    }

    for (let i = 0; i < meshesWinds.length; i++) {
      const obj = meshesWinds[i];
      const openingGroup = obj.userData.dataWindowOpening.OpeningGroup;

      obj.userData.meshesOpenings = [];

      for (let i2 = 0; i2 < openingGroup.length; i2++) {
        const meshOpening = meshesOpenings.find((item) => item.userData.opening.Id === openingGroup[i2]);
        if (!meshOpening) continue;

        obj.userData.meshesOpenings.push(meshOpening);
      }
    }

    return meshesWinds;
  }

  public updateCSG({ targetObj, obj2 }) {
    const brush1 = new Brush(targetObj.geometry, targetObj.material);
    brush1.updateMatrixWorld();
    const brush2 = new Brush(obj2.geometry, obj2.material);
    brush2.position.copy(obj2.position);
    brush2.rotation.copy(obj2.rotation);
    brush2.updateMatrixWorld();

    this.evaluator.useGroups = false;
    const result = this.evaluator.evaluate(brush1, brush2, SUBTRACTION);

    brush2.geometry.dispose();

    targetObj.geometry.dispose();
    targetObj.geometry = result.geometry;
  }

  private calcNormal2D({ p1, p2, reverse = false }) {
    let x = p1.z - p2.z;
    let z = p2.x - p1.x;

    if (reverse) {
      x *= -1;
      z *= -1;
    }

    return new THREE.Vector3(x, 0, z).normalize();
  }

  public getJsonModel() {
    return this.jsonModel;
  }

  private createPatternWindow({ dataWindows }) {
    const crMesh = (items, color = 0xcccccc, opacity = 1) => {
      const meshes = [];

      for (let i = 0; i < items.length; i++) {
        const profile = items[i].Geometry.Profile;

        const height = items[i].Geometry.Thickness / 1000;
        const dir = items[i].Geometry.Direction;
        const form = [];
        for (let i2 = 0; i2 < profile.length; i2++) {
          const pos = profile[i2];
          form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, (dir.Y * pos.Y) / 1000));
        }

        const geometry = extrudedGeometry.create(form, height);
        const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity });
        const meshProfile = new THREE.Mesh(geometry, material);
        meshProfile.updateMatrixWorld(true);
        meshes.push(meshProfile);

        const innerProfiles = items[i].Geometry.InnerProfiles;

        if (innerProfiles.length > 0) {
          for (let i2 = 0; i2 < innerProfiles.length; i2++) {
            const innerProfile = innerProfiles[i2];

            const form = [];
            for (let i3 = 0; i3 < innerProfile.length; i3++) {
              const pos = innerProfile[i3];
              form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, (dir.Y * pos.Y) / 1000));
            }

            const geometry = extrudedGeometry.create(form, 1, 'two');
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);

            this.updateCSG({ targetObj: meshProfile, obj2: mesh });
          }
        }
      }

      return meshes;
    };

    const groups = [];

    for (let i = 0; i < dataWindows.length; i++) {
      const dataWindow = dataWindows[i];

      const expanders = dataWindow.Expanders;
      const frames = dataWindow.Frames;
      const glasses = dataWindow.Glasses;
      const meshes1 = crMesh(expanders, 0xffffff, 1);
      const meshes2 = crMesh(frames, 0xffffff, 1);
      const meshes3 = crMesh(glasses, 0x60c3fc, 0.2);

      const obj = new THREE.Object3D();
      obj.add(...meshes1, ...meshes2, ...meshes3);
      //this.scene.add(obj);
      obj.position.x += i * 3;
      obj.position.z = -10;
      groups.push(obj);

      obj.userData.tag = 'window';
      obj.userData.dataWindowOpening = null;
      obj.userData.meshesOpenings = [];
      obj.userData.dataPatternWindow = dataWindow;
      obj.userData.name = dataWindow.Name;
    }

    uiMain.uiDivListWindows.addBtns({ objs: groups });

    return groups;
  }

  private createPatternWindowGeometry({ dataWindows }) {
    const crGeometry = (items) => {
      const geoms = [];

      for (let i = 0; i < items.length; i++) {
        const profile = items[i].Geometry.Profile;

        const height = items[i].Geometry.Thickness / 1000;
        const dir = items[i].Geometry.Direction;
        const form = [];
        for (let i2 = 0; i2 < profile.length; i2++) {
          const pos = profile[i2];
          form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, (dir.Y * pos.Y) / 1000));
        }

        const geometry = extrudedGeometry.create(form, height);
        const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const meshProfile = new THREE.Mesh(geometry, material);
        meshProfile.updateMatrixWorld(true);
        geoms.push(meshProfile.geometry);

        const innerProfiles = items[i].Geometry.InnerProfiles;

        if (innerProfiles.length > 0) {
          for (let i2 = 0; i2 < innerProfiles.length; i2++) {
            const innerProfile = innerProfiles[i2];

            const form = [];
            for (let i3 = 0; i3 < innerProfile.length; i3++) {
              const pos = innerProfile[i3];
              form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, (dir.Y * pos.Y) / 1000));
            }

            const geometry = extrudedGeometry.create(form, 1, 'two');
            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const mesh = new THREE.Mesh(geometry, material);

            this.updateCSG({ targetObj: meshProfile, obj2: mesh });
          }
        }
      }

      return geoms;
    };

    const groups = [];

    for (let i = 0; i < dataWindows.length; i++) {
      const dataWindow = dataWindows[i];

      const geoms1 = crGeometry(dataWindow.Expanders);
      const geoms2 = crGeometry(dataWindow.Frames);
      const geoms3 = crGeometry(dataWindow.Glasses);

      const obj = new THREE.Object3D();

      if (geoms2.length > 0) {
        const mergeGeometries = BufferGeometryUtils.mergeGeometries([...geoms1, ...geoms2]);
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(mergeGeometries, material);
        obj.add(mesh);
      }

      if (geoms3.length > 0) {
        const mergeGeometries = BufferGeometryUtils.mergeGeometries(geoms3);
        const material = new THREE.MeshStandardMaterial({ color: 0x60c3fc, transparent: true, opacity: 0.2 });
        const mesh = new THREE.Mesh(mergeGeometries, material);
        obj.add(mesh);
      }

      this.scene.add(obj);
      obj.position.x += i * 3;
      obj.position.z = -10;
      groups.push(obj);

      obj.userData.tag = 'window';
      obj.userData.dataWindowOpening = null;
      obj.userData.meshesOpenings = [];
      obj.userData.dataPatternWindow = dataWindow;
      obj.userData.name = dataWindow.Name;
    }

    uiMain.uiDivListWindows.addBtns({ objs: groups });

    return groups;
  }

  private createdataFloor({ dataFloor, ElementTypes }) {
    const crMesh = (items) => {
      for (let i = 0; i < items.length; i++) {
        const profile = items[i].Profile;
        const typeDir = items[i].VerticalLocationBinding;

        const dataElementTypes = ElementTypes.find((item) => item.Id === items[i].ElementTypeId);

        let height = 0;
        for (let i2 = 0; i2 < dataElementTypes.Layers.length; i2++) {
          height += dataElementTypes.Layers[i2].Thickness;
        }
        height /= 1000;
        if (typeDir === 'Top') height *= -1;

        const form = [];
        for (let i2 = 0; i2 < profile.length; i2++) {
          const pos = profile[i2];
          form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, pos.Y / 1000));
        }

        const geometry = extrudedGeometry.create(form, height);
        const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
      }
    };

    crMesh(dataFloor.arrPlate);
    //crMesh(dataFloor.arrStairLanding);
    //crMesh(dataFloor.arrFloor);
  }

  public getCenterModel() {
    const id = this.model.children.length / 2;

    const box = new THREE.Box3().setFromObject(this.model.children[id]);
    const center = box.getCenter(new THREE.Vector3());

    // const g = new THREE.BoxGeometry(3, 3, 3);
    // const m = new THREE.MeshStandardMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1 });
    // const o = new Mesh(g, m);
    // this.scene.add(o);
    // o.position.copy(center);

    return center;
  }
}
