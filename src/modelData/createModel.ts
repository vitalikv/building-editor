import * as THREE from 'three';
import { JsonModelParser } from './jsonModelParser';

export class CreateModel {
  private scene: THREE.Scene;
  private jsonModel: JsonModelParser;

  private model;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public async initModel() {
    const jsonModel = new JsonModelParser();
    await jsonModel.getJson();

    this.jsonModel = jsonModel;

    const dataLevels = jsonModel.getDataLevels();

    const model = new THREE.Object3D();

    for (let i = 0; i < dataLevels.length; i++) {
      const group = new THREE.Object3D();
      const meshes = this.createLevel({ idLevel: i });

      if (meshes.length > 0) {
        group.add(...meshes);
        model.add(group);
      }
    }

    this.scene.add(model);
    console.log(model);

    // for (let i = 0; i < model.children.length; i++) {
    //   if (i > 2 && i < 6) continue;
    //   model.children[i].visible = false;
    // }
  }

  private createLevel({ idLevel }) {
    const meshes = [];
    const { dataLevel, dataWalls, ElementTypes } = this.jsonModel.getStructureLevel({ idLevel });

    const levelPosY = dataLevel.Elevation / 1000;

    for (let i = 0; i < dataWalls.length; i++) {
      const dWall = dataWalls[i];
      const typeMat = dataWalls[i].WallPositionType;

      const height = dWall.Height / 1000;
      const p1 = new THREE.Vector2(dWall.Location.Start.X / 1000, dWall.Location.Start.Y / 1000);
      const p2 = new THREE.Vector2(dWall.Location.End.X / 1000, dWall.Location.End.Y / 1000);

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

      let offsetL = new THREE.Vector2();
      let offsetR = new THREE.Vector2();

      if (dWall.LocationBinding === 'SideOut') {
        offsetL.sub(dir);
      } else if (dWall.LocationBinding === 'SideIn') {
        offsetL.add(dir);
      } else if (dWall.LocationBinding === 'Center') {
        offsetL.sub(dir.clone().multiplyScalar(0.5));
        offsetR.add(dir.clone().multiplyScalar(0.5));
        color = 0xad5603;
      }

      const form = [p1.clone().add(offsetR), p2.clone().add(offsetR), p2.clone().add(offsetL), p1.clone().add(offsetL)];

      //if (typeMat === 'Facade') color = 0xad5603;

      const mesh = this.createMesh({ form, height, levelPosY, color });
      meshes.push(mesh);
    }

    return meshes;
  }

  private createMesh({ form, height, levelPosY, color = 0xcccccc }) {
    const shape = new THREE.Shape(form);
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: height });
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, levelPosY, 0);

    //this.scene.add(mesh);

    return mesh;
  }

  private calcNormal2D({ p1, p2, reverse = false }) {
    let x = p1.y - p2.y;
    let y = p2.x - p1.x;

    if (reverse) {
      x *= -1;
      y *= -1;
    }

    return new THREE.Vector2(x, y).normalize();
  }
}
