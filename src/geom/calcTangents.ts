import {vec2, vec3} from 'gl-matrix';

import {GeometryOptions} from './types';

export function calcTangents(geometry: GeometryOptions): GeometryOptions {
  const vertices = geometry.attributes.aPosition;
  if (vertices == null) {
    throw new Error('aPosition must be specified');
  }
  const texCoords = geometry.attributes.aTexCoord;
  if (texCoords == null) {
    throw new Error('aTexCoord must be specified');
  }
  // Resize the array
  const tangents = new Float32Array(vertices.data.length * 4 / 3);
  const indices = geometry.indices;
  if (indices == null) {
    throw new Error('Indices must be specified');
  }
  const texData = new Float32Array(texCoords.data);
  const pos = new Float32Array(vertices.data);
  for (let faceId = 0; faceId < indices.length; faceId += 3) {
    const vertexId1 = indices[faceId];
    const vertexId2 = indices[faceId + 1];
    const vertexId3 = indices[faceId + 2];
    // Calculate tangent vector.
    const origin = pos.slice(vertexId1 * 3, vertexId1 * 3 + 3);
    const p1 = vec3.create();
    const p2 = vec3.create();
    vec3.subtract(p1, pos.slice(vertexId2 * 3, vertexId2 * 3 + 3), origin);
    vec3.subtract(p2, pos.slice(vertexId3 * 3, vertexId3 * 3 + 3), origin);
    const texOrigin = texData.slice(vertexId1 * 2, vertexId1 * 2 + 2);
    const texP1 = vec2.create();
    const texP2 = vec2.create();
    vec2.subtract(texP1, texData.slice(vertexId2 * 2,
      vertexId2 * 2 + 2), texOrigin);
    vec2.subtract(texP2, texData.slice(vertexId3 * 2,
      vertexId3 * 2 + 2), texOrigin);
    // Honestly I don't know what this does.
    const f = 1 / (texP1[0] * texP2[1] - texP2[0] * texP1[1]);
    const tangent = new Float32Array(4);
    tangent[0] = f * (texP2[1] * p1[0] - texP1[1] * p2[0]);
    tangent[1] = f * (texP2[1] * p1[1] - texP1[1] * p2[1]);
    tangent[2] = f * (texP2[1] * p1[2] - texP1[1] * p2[2]);
    // Calculate bi-tangent. To save vertex array, it can be calculated in
    // vertex shader; however we have to specify the cross order to get right
    // result. This can be done by using a modifier... I think.
    // To calculate modifier, we have to calculate dot product with
    // bi-tangent from vertex shader and bi-tangent we calculated.
    const normal = vec3.create();
    vec3.cross(normal, p1, p2);
    vec3.normalize(normal, normal);
    const leftBitangent = vec3.create();
    vec3.cross(leftBitangent, tangent, normal);
    // Then calculate bi-tangent with texture coords.
    const bitangent = vec3.create();
    bitangent[0] = f * (texP2[0] * p1[0] - texP1[0] * p2[0]);
    bitangent[1] = f * (texP2[0] * p1[1] - texP1[0] * p2[1]);
    bitangent[2] = f * (texP2[0] * p1[2] - texP1[0] * p2[2]);
    const modifier = vec3.dot(bitangent, leftBitangent);
    tangent[3] = modifier < 0 ? -1 : 1;
    // Done! Paste them to those three vertices.
    tangents.set(tangent, vertexId1 * 4);
    tangents.set(tangent, vertexId2 * 4);
    tangents.set(tangent, vertexId3 * 4);
  }
  return {
    ...geometry,
    attributes: {
      ...geometry.attributes,
      aTangent: {size: 4, data: tangents},
    },
  };
}
