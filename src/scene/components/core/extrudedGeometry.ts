import * as THREE from 'three';

export class ExtrudedGeometry {
  create(contour, thickness, type = 'one') {
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
}
