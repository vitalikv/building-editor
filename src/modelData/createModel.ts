import * as THREE from 'three';
import { SUBTRACTION, INTERSECTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import { JsonModelParser } from './jsonModelParser';

export class CreateModel {
  private scene: THREE.Scene;
  private jsonModel: JsonModelParser;
  private evaluator: Evaluator;
  private model;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.evaluator = new Evaluator();
  }

  public async initModel() {
    const jsonModel = new JsonModelParser();
    await jsonModel.getJson();

    this.jsonModel = jsonModel;

    //const objsWind = this.createWindow();

    const dataLevels = jsonModel.getDataLevels();

    const model = new THREE.Object3D();

    for (let i = 3; i < 4; i++) {
      const group = new THREE.Object3D();
      group.userData.dataLevel = dataLevels[i];
      console.log('lll', dataLevels[i]);
      const meshes = this.createLevel({ idLevel: i, objsWind: null });

      if (meshes.length > 0) {
        group.add(...meshes);
        model.add(group);
      }
    }

    this.scene.add(model);
    console.log(model);

    for (let i = 0; i < model.children.length; i++) {
      if (i > 2 && i < 6) continue;
      //model.children[i].visible = false;
    }
  }

  createExtrudedGeometry(contour, thickness, type = 'one') {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const normals = [];
    const computeContourNormal = (contour) => {
      const normal = new THREE.Vector3();
      const v1 = new THREE.Vector3();
      const v2 = new THREE.Vector3();

      v1.subVectors(contour[1], contour[0]);
      v2.subVectors(contour[2], contour[0]);

      normal.crossVectors(v1, v2).normalize();
      return normal;
    };

    const planeNormal = computeContourNormal(contour);
    if (thickness < 0) planeNormal.negate();

    if (type === 'two') thickness *= 2;

    for (let i = 0; i < contour.length; i++) {
      vertices.push(contour[i].x, contour[i].y, contour[i].z);
      normals.push(planeNormal.x, planeNormal.y, planeNormal.z);
    }

    for (let i = 0; i < contour.length; i++) {
      const extrudedPoint = contour[i].clone().add(planeNormal.clone().multiplyScalar(thickness));
      vertices.push(extrudedPoint.x, extrudedPoint.y, extrudedPoint.z);
      normals.push(planeNormal.x, planeNormal.y, planeNormal.z);
    }

    const frontFaceVertexCount = contour.length;
    for (let i = 1; i < frontFaceVertexCount - 1; i++) {
      indices.push(0, i + 1, i);
    }

    const backFaceStartIndex = frontFaceVertexCount;
    for (let i = 1; i < frontFaceVertexCount - 1; i++) {
      indices.push(backFaceStartIndex, backFaceStartIndex + i, backFaceStartIndex + i + 1);
    }

    for (let i = 0; i < frontFaceVertexCount - 1; i++) {
      const next = (i + 1) % (frontFaceVertexCount - 1);

      const v0 = contour[i];
      const v1 = contour[next];
      const v2 = v1.clone().add(planeNormal.clone().multiplyScalar(thickness));
      const v3 = v0.clone().add(planeNormal.clone().multiplyScalar(thickness));

      const startIdx = vertices.length / 3;

      vertices.push(v0.x, v0.y, v0.z); // 0
      vertices.push(v1.x, v1.y, v1.z); // 1
      vertices.push(v2.x, v2.y, v2.z); // 2
      vertices.push(v3.x, v3.y, v3.z); // 3

      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v3, v0);
      const sideNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      for (let j = 0; j < 4; j++) {
        normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      }

      indices.push(startIdx, startIdx + 1, startIdx + 2);
      indices.push(startIdx, startIdx + 2, startIdx + 3);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    //geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const generatePlanarUVs = (geometry) => {
      const posAttr = geometry.attributes.position;
      const uvAttr = new THREE.BufferAttribute(new Float32Array(posAttr.count * 2), 2);

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);

        const u = (x + 1) / 2;
        const v = (z + 1) / 2;

        uvAttr.setXY(i, u, v);
      }

      geometry.setAttribute('uv', uvAttr);
    };

    generatePlanarUVs(geometry);

    if (thickness < 0) {
      const offset = planeNormal.clone().multiplyScalar(-thickness);
      geometry.translate(offset.x, offset.y, offset.z);
    }

    if (type === 'two') {
      const offset = planeNormal.clone().multiplyScalar(-thickness / 2);
      geometry.translate(offset.x, offset.y, offset.z);
    }

    return geometry;
  }

  private createLevel({ idLevel, objsWind }) {
    const meshes = [];
    const { dataLevel, dataWalls, ElementTypes, windowOpenings, osW } = this.jsonModel.getStructureLevel({ idLevel });

    console.log('windowOpenings', windowOpenings);
    for (let i = 0; i < 0; i++) {
      const insertionPoint = windowOpenings[i].InsertionPoint;
      const windowId = windowOpenings[i].WindowId;
      const direction = windowOpenings[i].Direction;

      const pos = new THREE.Vector3(insertionPoint.X / 1000, insertionPoint.Z / 1000, insertionPoint.Y / 1000);

      //cube.userData.windowOpening = windowOpenings[i];

      const meshWind = objsWind.find((item) => item.userData.dataWindow.Id === windowId);
      if (meshWind) {
        const obj = meshWind.clone();
        obj.position.copy(pos);

        const dir = new THREE.Vector3(direction.X, direction.Z, direction.Y);

        const t = new THREE.Mesh();
        t.lookAt(dir);
        obj.rotation.copy(t.rotation.clone());

        this.scene.add(obj);
      }
    }

    const levelPosY = dataLevel.Elevation / 1000;

    const meshesWalls = [];
    for (let i = 0; i < dataWalls.length; i++) {
      const dWall = dataWalls[i];
      const typeMat = dataWalls[i].WallPositionType;

      const height = dWall.Height / 1000;
      const p1 = new THREE.Vector3(dWall.Location.Start.X / 1000, dWall.Location.Start.Z / 1000, dWall.Location.Start.Y / 1000);
      const p2 = new THREE.Vector3(dWall.Location.End.X / 1000, dWall.Location.End.Z / 1000, dWall.Location.End.Y / 1000);

      let width = 0.1;
      if (typeMat === 'Facade') {
      }
      const r = ElementTypes.find((item) => item.Id === dWall.ElementTypeId);

      width = 0;
      for (let i2 = 0; i2 < r.Layers.length; i2++) {
        width += r.Layers[i2].Thickness;
      }

      //console.log(dWall.LocationBinding);
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
        color = 0xad5603;
      } else if (dWall.LocationBinding === 'Center') {
        offsetL.sub(dir.clone().multiplyScalar(0.5));
        offsetR.add(dir.clone().multiplyScalar(0.5));
      }

      const form = [p1.clone().add(offsetL), p2.clone().add(offsetL), p2.clone().add(offsetR), p1.clone().add(offsetR), p1.clone().add(offsetL)];

      //if (typeMat === 'Facade') color = 0xad5603;

      const geometry = this.createExtrudedGeometry(form, height);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.dataWalls = dataWalls[i];
      meshes.push(mesh);

      meshesWalls.push(mesh);
    }

    this.createOpenings({ dataOpenings: osW, meshesWalls });

    return meshes;
  }

  private createOpenings({ dataOpenings, meshesWalls }) {
    console.log('dataOpenings', dataOpenings);

    for (let i = 0; i < dataOpenings.length; i++) {
      const result = meshesWalls.find((item) => item.userData.dataWalls.Id === dataOpenings[i].HostId);
      if (!result) continue;

      const profile = dataOpenings[i].Profile;

      const form = [];
      for (let i2 = 0; i2 < profile.length; i2++) {
        const pos = profile[i2];
        form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, pos.Y / 1000));
      }

      const geometry = this.createExtrudedGeometry(form, 1.3, 'two');
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.opening = dataOpenings[i];
      //this.scene.add(mesh);

      this.updateCSG({ targetObj: result, obj2: mesh });
    }
  }

  private updateCSG({ targetObj, obj2 }) {
    const brush1 = new Brush(targetObj.geometry, targetObj.material);
    brush1.updateMatrixWorld();
    const brush2 = new Brush(obj2.geometry, obj2.material);
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

  private createWindow() {
    const jsonModel = this.getJsonModel();

    const dataWindows = jsonModel.getWindows();

    const crMesh = (items, color = 0x0000ff) => {
      const meshes = [];

      for (let i = 0; i < items.length; i++) {
        const profile = items[i].Geometry.Profile;

        const height = items[i].Geometry.Height / 1000;
        const form = [];
        for (let i2 = 0; i2 < profile.length; i2++) {
          const pos = profile[i2];
          form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, pos.Y / 1000));
        }
        //console.log(profile);

        const geometry = this.createExtrudedGeometry(form, height);
        const material = new THREE.MeshStandardMaterial({ color, wireframe: true });
        const mesh = new THREE.Mesh(geometry, material);
        meshes.push(mesh);

        const innerProfiles = items[i].Geometry.InnerProfiles;

        if (innerProfiles.length > 0) {
          for (let i2 = 0; i2 < innerProfiles.length; i2++) {
            const innerProfile = innerProfiles[i2];
            //console.log(innerProfile);

            const form = [];
            for (let i3 = 0; i3 < innerProfile.length; i3++) {
              const pos = innerProfile[i3];
              form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, pos.Y / 1000));
            }

            const geometry = this.createExtrudedGeometry(form, height);
            const material = new THREE.MeshStandardMaterial({ color: 0x0000ff, wireframe: true });
            const mesh = new THREE.Mesh(geometry, material);
            meshes.push(mesh);
          }
        }
      }

      return meshes;
    };

    const groups = [];

    for (let i = 0; i < dataWindows.length; i++) {
      const dataWindow = dataWindows[i];

      //console.log(dataWindow);

      const expanders = dataWindow.Expanders;
      const frames = dataWindow.Frames;
      const glasses = dataWindow.Glasses;
      const meshes1 = crMesh(expanders);
      const meshes2 = crMesh(frames);
      const meshes3 = crMesh(glasses, 0xff0000);

      const group = new THREE.Object3D();
      group.add(...meshes1, ...meshes2, ...meshes3);
      this.scene.add(group);

      group.userData.dataWindow = dataWindow;
      group.position.x += i * 3;

      groups.push(group);
    }

    return groups;
  }
}
