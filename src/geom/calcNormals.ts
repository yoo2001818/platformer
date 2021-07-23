import {vec3} from 'gl-matrix';

import {GeometryOptions} from './types';

export function calcNormals(geometry: GeometryOptions): GeometryOptions {
  const vertices = geometry.attributes.aPosition;
  if (vertices == null) {
    throw new Error('aPosition must be specified');
  }
  const normals = new Float32Array(vertices.data.length);
  const indices = geometry.indices;
  if (indices == null) {
    throw new Error('Indices must be specified');
  }
  const pos = new Float32Array(vertices.data);
  // Uh, maybe the variable names are too verbose. I think.
  for (let faceId = 0; faceId < indices.length; faceId += 3) {
    const vertexId1 = indices[faceId];
    const vertexId2 = indices[faceId + 1];
    const vertexId3 = indices[faceId + 2];
    // Calculate normal vector.
    const origin = pos.slice(vertexId1 * 3, vertexId1 * 3 + 3);
    const p1 = vec3.create();
    const p2 = vec3.create();
    const uv = vec3.create();
    vec3.subtract(p1, pos.slice(vertexId2 * 3, vertexId2 * 3 + 3), origin);
    vec3.subtract(p2, pos.slice(vertexId3 * 3, vertexId3 * 3 + 3), origin);
    vec3.cross(uv, p1, p2);
    vec3.normalize(uv, uv);
    // Done! Paste them to those three vertices.
    normals[vertexId1 * 3] += uv[0];
    normals[vertexId1 * 3 + 1] += uv[1];
    normals[vertexId1 * 3 + 2] += uv[2];
    normals[vertexId2 * 3] += uv[0];
    normals[vertexId2 * 3 + 1] += uv[1];
    normals[vertexId2 * 3 + 2] += uv[2];
    normals[vertexId3 * 3] += uv[0];
    normals[vertexId3 * 3 + 1] += uv[1];
    normals[vertexId3 * 3 + 2] += uv[2];
  }
  // This isn't necessary for 'hard' normals, but whatever.
  for (let vertexId = 0; vertexId < normals.length; vertexId += 3) {
    const len = Math.sqrt(
      normals[vertexId] * normals[vertexId] +
      normals[vertexId + 1] * normals[vertexId + 1] +
      normals[vertexId + 2] * normals[vertexId + 2],
    );
    normals[vertexId] /= len;
    normals[vertexId + 1] /= len;
    normals[vertexId + 2] /= len;
  }
  return {
    ...geometry,
    attributes: {
      ...geometry.attributes,
      aNormal: {size: 3, data: normals},
    },
  };
}
