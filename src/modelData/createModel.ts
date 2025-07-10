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

    this.createWindow();
    // return;
    const dataLevels = jsonModel.getDataLevels();

    const model = new THREE.Object3D();

    for (let i = 3; i < 4; i++) {
      const group = new THREE.Object3D();
      group.userData.dataLevel = dataLevels[i];
      console.log('lll', dataLevels[i]);
      const meshes = this.createLevel({ idLevel: i });

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

  createExtrudedGeometry(contour, thickness) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const normals = [];
    function computeContourNormal(contour) {
      const normal = new THREE.Vector3();
      const v1 = new THREE.Vector3();
      const v2 = new THREE.Vector3();

      // Берем первые три точки для вычисления нормали
      v1.subVectors(contour[1], contour[0]);
      v2.subVectors(contour[2], contour[0]);

      normal.crossVectors(v1, v2).normalize();
      return normal;
    }
    // Вычисляем нормаль плоскости
    const planeNormal = computeContourNormal(contour);
    if (thickness < 0) planeNormal.negate(); // развернуть нормали

    // 1. Создаем вершины и нормали для передней грани
    for (let i = 0; i < contour.length; i++) {
      vertices.push(contour[i].x, contour[i].y, contour[i].z);
      // Нормаль передней грани направлена против нормали плоскости
      normals.push(planeNormal.x, planeNormal.y, planeNormal.z);
    }

    // 2. Создаем вершины и нормали для задней грани
    for (let i = 0; i < contour.length; i++) {
      const extrudedPoint = contour[i].clone().add(planeNormal.clone().multiplyScalar(thickness));
      vertices.push(extrudedPoint.x, extrudedPoint.y, extrudedPoint.z);
      // Нормаль задней грани совпадает с нормалью плоскости
      normals.push(planeNormal.x, planeNormal.y, planeNormal.z);
    }

    // 3. Триангуляция передней грани (по часовой стрелке)
    const frontFaceVertexCount = contour.length;
    for (let i = 1; i < frontFaceVertexCount - 1; i++) {
      //indices.push(0, i, i + 1); // Порядок вершин важен!
      indices.push(0, i + 1, i); // Измененный порядок индексов
    }

    // 4. Триангуляция задней грани (против часовой стрелки)
    const backFaceStartIndex = frontFaceVertexCount;
    for (let i = 1; i < frontFaceVertexCount - 1; i++) {
      //indices.push(backFaceStartIndex, backFaceStartIndex + i + 1, backFaceStartIndex + i);
      indices.push(backFaceStartIndex, backFaceStartIndex + i, backFaceStartIndex + i + 1);
    }

    // 5. Создаем боковые грани с правильными нормалями
    for (let i = 0; i < frontFaceVertexCount - 1; i++) {
      const next = (i + 1) % (frontFaceVertexCount - 1);

      // Добавляем вершины для боковых граней (дублируем для разных нормалей)
      const v0 = contour[i];
      const v1 = contour[next];
      const v2 = v1.clone().add(planeNormal.clone().multiplyScalar(thickness));
      const v3 = v0.clone().add(planeNormal.clone().multiplyScalar(thickness));

      // Сохраняем индексы новых вершин
      const startIdx = vertices.length / 3;

      // Добавляем вершины
      vertices.push(v0.x, v0.y, v0.z); // 0
      vertices.push(v1.x, v1.y, v1.z); // 1
      vertices.push(v2.x, v2.y, v2.z); // 2
      vertices.push(v3.x, v3.y, v3.z); // 3

      // Вычисляем нормаль для боковой грани
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v3, v0);
      const sideNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      // Добавляем нормали для 4 вершин боковой грани
      for (let j = 0; j < 4; j++) {
        normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      }

      // Создаем два треугольника для боковой грани
      indices.push(startIdx, startIdx + 1, startIdx + 2);
      indices.push(startIdx, startIdx + 2, startIdx + 3);
    }

    // 6. Устанавливаем атрибуты
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    //geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    function generatePlanarUVs(geometry) {
      const posAttr = geometry.attributes.position;
      const uvAttr = new THREE.BufferAttribute(new Float32Array(posAttr.count * 2), 2);

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);

        // Проекция на плоскость XZ
        const u = (x + 1) / 2; // Нормализуем
        const v = (z + 1) / 2;

        uvAttr.setXY(i, u, v);
      }

      geometry.setAttribute('uv', uvAttr);
    }

    generatePlanarUVs(geometry);

    if (thickness < 0) {
      const offset = planeNormal.clone().multiplyScalar(-thickness);
      geometry.translate(offset.x, offset.y, offset.z);
    }

    return geometry;
  }

  private createLevel({ idLevel }) {
    const meshes = [];
    const { dataLevel, dataWalls, ElementTypes, windowOpenings, osW } = this.jsonModel.getStructureLevel({ idLevel });

    for (let i = 0; i < windowOpenings.length; i++) {
      const insertionPoint = windowOpenings[i].InsertionPoint;

      const pos = new THREE.Vector3(insertionPoint.X / 1000, insertionPoint.Z / 1000, insertionPoint.Y / 1000);

      const geometry = new THREE.BoxGeometry(0.3, 1, 0.3);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.copy(pos);
      //this.scene.add(cube);

      cube.userData.windowOpening = windowOpenings[i];
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

      //const form = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(9, 0, 0), new THREE.Vector3(9, 0, -0.5), p1.clone().add(offsetR)];

      //if (typeMat === 'Facade') color = 0xad5603;

      const geometry = this.createExtrudedGeometry(form, height);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);

      //const mesh = this.createMesh({ form, height, levelPosY, color });
      mesh.userData.dataWalls = dataWalls[i];
      meshes.push(mesh);

      meshesWalls.push(mesh);
    }

    this.createOpenings({ dataOpenings: osW, meshesWalls });

    return meshes;
  }

  private createOpenings({ dataOpenings, meshesWalls }) {
    console.log('dataOpenings', dataOpenings);

    let flag = true;

    for (let i = 0; i < dataOpenings.length; i++) {
      const result = meshesWalls.find((item) => item.userData.dataWalls.Id === dataOpenings[i].HostId);
      if (!result) continue;

      const profile = dataOpenings[i].Profile;

      const form = [];
      for (let i2 = 0; i2 < profile.length; i2++) {
        const pos = profile[i2];
        form.push(new THREE.Vector3(pos.X / 1000, pos.Z / 1000, pos.Y / 1000));
      }

      const geometry = this.createExtrudedGeometry(form, -1.3);
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

    const dataWindow = dataWindows[1];

    console.log(dataWindow);

    const crMesh = (items) => {
      for (let i = 0; i < items.length; i++) {
        const profile = items[i].Geometry.Profile;

        const height = items[i].Geometry.Height / 1000;
        const form = [];
        for (let i2 = 0; i2 < profile.length - 1; i2++) {
          const pos = profile[i2];

          form.push(new THREE.Vector2(pos.X / 1000, pos.Z / 1000));
        }
        console.log(profile);
        const mesh = this.createMeshWindow({ form, offset: profile[0].Y / 1000, height });
        this.scene.add(mesh);

        const innerProfiles = items[i].Geometry.InnerProfiles;

        if (innerProfiles.length > 0) {
          for (let i2 = 0; i2 < innerProfiles.length - 1; i2++) {
            const innerProfile = innerProfiles[i2];
            //console.log(innerProfile);

            const form = [];
            for (let i3 = 0; i3 < innerProfile.length - 1; i3++) {
              const pos = innerProfile[i3];

              form.push(new THREE.Vector2(pos.X / 1000, pos.Z / 1000));
            }

            const mesh = this.createMeshWindow({ form, height });
            this.scene.add(mesh);
          }
        }
      }
    };

    const expanders = dataWindow.Expanders;
    const frames = dataWindow.Frames;
    const glasses = dataWindow.Glasses;
    crMesh(expanders);
    crMesh(frames);
    crMesh(glasses);
  }

  private createMeshWindow({ form, offset = 0, height, color = 0xcccccc }) {
    const shape = new THREE.Shape(form);
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: height });
    geometry.translate(0, offset, 0);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);

    return mesh;
  }
}
